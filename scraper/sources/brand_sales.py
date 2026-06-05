from __future__ import annotations
"""
Scraper per svendite brand, vendite campionario, sample sale e flat-price vintage.

Copre:
  - Fair Price Vintage e organizzatori simili (tutto a prezzo fisso)
  - Svendite stock brand di lusso e fast fashion
  - Vendite campionario (showroom, fine stagione, stock outlet privato)
  - Vintage Kilo events (diversi da Vinokilo)

Fonti:
  1. Sito ufficiale Fair Price Vintage
  2. DuckDuckGo con query mirate per brand sale / sample sale
  3. Siti aggregatori italiani (Glamoo, SalesGossip, Armadio Verde)

Confidence: 0.60 (ricerca web + pagine ufficiali)
"""
import re
import time
from datetime import date, timedelta
from typing import Generator
from urllib.parse import quote_plus, urlparse, unquote

from scrapling.fetchers import Fetcher, StealthyFetcher

from ..regions import city_to_region

MONTHS_IT = {
    'gen': 1, 'gennaio': 1, 'feb': 2, 'febbraio': 2,
    'mar': 3, 'marzo': 3, 'apr': 4, 'aprile': 4,
    'mag': 5, 'maggio': 5, 'giu': 6, 'giugno': 6,
    'lug': 7, 'luglio': 7, 'ago': 8, 'agosto': 8,
    'set': 9, 'settembre': 9, 'ott': 10, 'ottobre': 10,
    'nov': 11, 'novembre': 11, 'dic': 12, 'dicembre': 12,
}
MONTH_NAMES_IT = [
    '', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

CITIES = [
    ('Milano',   'Lombardia'),
    ('Roma',     'Lazio'),
    ('Torino',   'Piemonte'),
    ('Napoli',   'Campania'),
    ('Firenze',  'Toscana'),
    ('Bologna',  'Emilia-Romagna'),
    ('Venezia',  'Veneto'),
    ('Verona',   'Veneto'),
    ('Padova',   'Veneto'),
    ('Bari',     'Puglia'),
    ('Genova',   'Liguria'),
    ('Palermo',  'Sicilia'),
    ('Catania',  'Sicilia'),
    ('Bergamo',  'Lombardia'),
    ('Brescia',  'Lombardia'),
    ('Modena',   'Emilia-Romagna'),
    ('Parma',    'Emilia-Romagna'),
    ('Pescara',  'Abruzzo'),
]

# Siti specializzati in svendite private da scansionare direttamente
BRAND_SALE_SITES = [
    'secretsalesgirl.it',
    'missamplesale.com',
    'milanosamplesale.com',
    'alefsamplesale.it',
    'samplelover.it',
    'designbestmagazine.com',
]

QUERY_TEMPLATES = [
    # Aggregatori specializzati
    'site:secretsalesgirl.it {city} {month} {year}',
    'site:missamplesale.com {city} {month}',
    'site:milanosamplesale.com {city} {month} {year}',
    # Tipi di evento
    '"vendita privata" OR "private sale" abbigliamento {city} {month} {year}',
    '"sample sale" moda brand {city} {year}',
    '"vendita campionario" abbigliamento {city} {month} {year}',
    '"svendita stock" brand lusso {city} {month} {year}',
    '"family friends" moda brand {city} {month} {year}',
    '"svendita off price" {city} {month} {year}',
    '"svendita griffato" {city} {month} {year}',
    # Brand noti che fanno private sale in Italia
    'Philipp Plein "vendita privata" OR "private sale" {city} {year}',
    'DSQUARED2 "private sale" OR "svendita" {city} {year}',
    'Furla "friends family" OR "private sale" {city} {year}',
    'Ballantyne "private sale" {city} {year}',
    'fair price vintage evento {city} {month} {year}',
    '"svendita design" OR "design sale" {city} {month} {year}',
    'outlet privato abbigliamento {city} {year}',
]

BRAND_SALE_KEYWORDS = {
    'campionario', 'sample sale', 'svendita stock', 'svendita brand',
    'griffato', 'lusso', 'designer', 'outlet privato', 'vendita privata',
    'fine stagione', 'stock abbigliamento', 'private sale', 'family friends',
    'friends family', 'svendita off price', 'off price', 'svendita privata',
    'svuota magazzino', 'fine serie', 'liquidazione stock',
}

FAIR_PRICE_KEYWORDS = {
    'fair price', 'flat price', 'tutto a', 'tutto €', 'prezzo fisso',
    'vintage kilo', 'a peso', 'kilo sale', 'tutto uno stesso prezzo',
}

EVENT_KEYWORDS = BRAND_SALE_KEYWORDS | FAIR_PRICE_KEYWORDS | {
    'svendita', 'vintage', 'mercatino', 'moda', 'abbigliamento',
}

SKIP_DOMAINS = {
    'eventbrite.it', 'eventbrite.com', 'subito.it', 'bakeca.it', 'kijiji.it',
    'facebook.com', 'instagram.com', 'reddit.com', 'neventum.com',
    'vinokilo.events', 't.me',
}


def _should_skip(url: str) -> bool:
    try:
        domain = urlparse(url).netloc.lower().lstrip('www.')
        return any(domain == s or domain.endswith('.' + s) for s in SKIP_DOMAINS)
    except Exception:
        return True


def _guess_type(text: str) -> str:
    t = text.lower()
    if any(kw in t for kw in FAIR_PRICE_KEYWORDS):
        return 'fair_price'
    if any(kw in t for kw in BRAND_SALE_KEYWORDS):
        return 'brand_sale'
    if 'svendita' in t:
        return 'svendita'
    return 'brand_sale'


def _parse_date(text: str, target_year: int, target_month: int) -> str | None:
    t = text.lower()

    # dd/mm/yyyy
    m = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    # ISO yyyy-mm-dd
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', t)
    if m:
        return m.group(0)

    # "14 giugno 2026"
    m = re.search(r'(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(\d{4}))?', t)
    if m:
        day = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3])
        yr = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31 and mo == target_month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'

    # "maggio 2026"
    m = re.search(r'\b([a-zà-ú]{4,9})\s+(\d{4})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        yr = int(m.group(2))
        if mo and mo == target_month and yr == target_year:
            return f'{yr:04d}-{mo:02d}-01'

    # "a maggio" / "in giugno"
    m = re.search(r'\b(?:a|in|per|nel mese di)\s+([a-zà-ú]{4,9})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        if mo and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-01'

    return None


def _ddg_search(query: str) -> list[dict]:
    fetcher = StealthyFetcher()
    url = f'https://html.duckduckgo.com/html/?q={quote_plus(query)}&kl=it-it'
    try:
        page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
        html = str(page.html_content) if hasattr(page, 'html_content') else ''
        if not html:
            return []

        raw_links = re.findall(
            r'class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)',
            html, re.IGNORECASE
        )
        snippets = re.findall(r'class="result__snippet"[^>]*>([^<]+)', html, re.IGNORECASE)

        results = []
        for i, (href, title) in enumerate(raw_links[:10]):
            uddg_m = re.search(r'uddg=([^&"]+)', href)
            if uddg_m:
                real_url = unquote(uddg_m.group(1))
                if 'duckduckgo.com/y.js' in real_url:
                    continue
            elif href.startswith('//'):
                real_url = 'https:' + href
            elif href.startswith('http'):
                real_url = href
            else:
                continue
            snippet = snippets[i].strip() if i < len(snippets) else ''
            results.append({'url': real_url, 'title': title.strip(), 'snippet': snippet})
        return results
    except Exception as e:
        print(f'[brand_sales] DDG "{query}": {e}')
        return []


# ── Scraper Fair Price Vintage ────────────────────────────────────────────────

def _scrape_fair_price_vintage(target_year: int, target_month: int) -> list[dict]:
    """Try to scrape Fair Price Vintage events from their website."""
    urls_to_try = [
        'https://www.fairpricevintage.it/eventi',
        'https://fairpricevintage.it/events',
        'https://www.fairpricevintage.it',
    ]
    fetcher = Fetcher()
    events: list[dict] = []

    for url in urls_to_try:
        try:
            page = fetcher.get(url, stealthy_headers=True, timeout=12)
            html = str(page.content) if hasattr(page, 'content') else str(page)
            if not html or len(html) < 500:
                continue

            text_clean = re.sub(r'<[^>]+>', ' ', html)
            text_clean = re.sub(r'\s+', ' ', text_clean)

            # Look for event blocks
            blocks = re.findall(
                r'<(?:article|div|section)[^>]*class="[^"]*(?:event|card|post|item)[^"]*"[^>]*>'
                r'(.*?)</(?:article|div|section)>',
                html, re.DOTALL | re.IGNORECASE
            ) or [html[:10000]]

            for block in blocks[:20]:
                text = re.sub(r'<[^>]+>', ' ', block)
                text = re.sub(r'\s+', ' ', text).strip()

                start_date = _parse_date(text, target_year, target_month)
                if not start_date:
                    continue

                title_m = (
                    re.search(r'<h[1-3][^>]*>([^<]{5,100})</h[1-3]>', block, re.IGNORECASE) or
                    re.search(r'<title[^>]*>([^<]{5,100})</title>', html, re.IGNORECASE)
                )
                if not title_m:
                    continue

                name = re.sub(r'\s+', ' ', title_m.group(1)).strip()

                city_m = re.search(
                    r'\b(Milano|Roma|Torino|Napoli|Firenze|Bologna|Venezia|Genova|Bari)\b',
                    text
                )
                city = city_m.group(1) if city_m else 'Italia'

                events.append({
                    'name':         f'Fair Price Vintage – {name}'[:150],
                    'description':  text[:300],
                    'event_type':   'fair_price',
                    'city':         city,
                    'region':       city_to_region(city),
                    'address':      None,
                    'start_date':   start_date,
                    'end_date':     None,
                    'start_time':   None,
                    'end_time':     None,
                    'website':      url,
                    'instagram':    'fairpricevintage',
                    'price_info':   'Tutto a prezzo fisso',
                    'organizer':    'Fair Price Vintage',
                    'source_url':   url,
                    'is_verified':  False,
                    'is_featured':  False,
                    'is_recurring': False,
                    'categories':   ['Vintage', 'Abbigliamento'],
                    'tags':         ['fair_price', 'flat_price', 'vintage', city.lower()],
                })

            if events:
                break

        except Exception as e:
            print(f'[brand_sales] FPV {url}: {e}')

    return events


def _scrape_known_aggregators(target_year: int, target_month: int) -> list[dict]:
    """Scrape known Italian fashion event aggregators."""
    month_name = MONTH_NAMES_IT[target_month]
    aggregators = [
        f'https://www.glamoo.it/offerte/moda-abbigliamento?q={month_name}+{target_year}',
        f'https://www.salesgossip.it/eventi-sample-sale/?month={target_month}&year={target_year}',
    ]
    fetcher = Fetcher()
    events: list[dict] = []

    for url in aggregators:
        try:
            page = fetcher.get(url, stealthy_headers=True, timeout=10)
            html = str(page.content) if hasattr(page, 'content') else ''
            if not html or len(html) < 500:
                continue

            blocks = re.findall(
                r'<(?:article|div|li)[^>]*class="[^"]*(?:event|card|item|offer|deal)[^"]*"[^>]*>'
                r'(.*?)</(?:article|div|li)>',
                html, re.DOTALL | re.IGNORECASE
            )

            for block in blocks[:15]:
                text = re.sub(r'<[^>]+>', ' ', block)
                text = re.sub(r'\s+', ' ', text).strip()

                if not any(kw in text.lower() for kw in EVENT_KEYWORDS):
                    continue

                start_date = _parse_date(text, target_year, target_month)
                if not start_date:
                    continue

                title_m = re.search(r'<h[1-4][^>]*>([^<]{5,100})</h[1-4]>', block, re.IGNORECASE)
                if not title_m:
                    continue

                name = re.sub(r'\s+', ' ', title_m.group(1)).strip()

                city_m = re.search(
                    r'\b(Milano|Roma|Torino|Napoli|Firenze|Bologna|Venezia|Genova|Bari)\b',
                    text
                )
                city = city_m.group(1) if city_m else 'Milano'

                events.append({
                    'name':         name[:150],
                    'description':  text[:300],
                    'event_type':   _guess_type(text),
                    'city':         city,
                    'region':       city_to_region(city),
                    'address':      None,
                    'start_date':   start_date,
                    'end_date':     None,
                    'start_time':   None,
                    'end_time':     None,
                    'website':      url,
                    'instagram':    None,
                    'price_info':   None,
                    'organizer':    None,
                    'source_url':   url,
                    'is_verified':  False,
                    'is_featured':  False,
                    'is_recurring': False,
                    'categories':   ['Moda', 'Brand'],
                    'tags':         ['brand_sale', urlparse(url).netloc.lstrip('www.')],
                })

        except Exception as e:
            print(f'[brand_sales] aggregator {url}: {e}')

    return events


def _scrape_brand_sale_sites(target_year: int, target_month: int) -> list[dict]:
    """Scrape diretto dei siti specializzati in svendite private italiani."""
    month_name = MONTH_NAMES_IT[target_month]
    events: list[dict] = []
    fetcher = Fetcher()

    site_urls = [
        f'https://secretsalesgirl.it/calendario/',
        f'https://www.missamplesale.com/selected-for-you.html',
        f'https://milanosamplesale.com/en/collections/private-salt',
        f'https://samplelover.it/en/collections/souvenir-shop',
    ]

    all_cities_re = re.compile(
        r'\b(Milano|Roma|Torino|Napoli|Firenze|Bologna|Venezia|Verona|Padova|'
        r'Bari|Genova|Palermo|Catania|Bergamo|Brescia|Modena|Parma|Pescara)\b',
        re.IGNORECASE,
    )

    for url in site_urls:
        try:
            page = fetcher.get(url, stealthy_headers=True, timeout=12)
            raw_html = str(page.content) if hasattr(page, 'content') else ''
            if len(raw_html) < 500:
                continue

            text = re.sub(r'<[^>]+>', ' ', raw_html)
            text = re.sub(r'\s+', ' ', text)

            # Cerca blocchi di testo vicino al mese target
            month_pos = [m.start() for m in re.finditer(month_name, text, re.IGNORECASE)]
            for pos in month_pos[:8]:
                chunk = text[max(0, pos - 200):pos + 400]
                if not any(kw in chunk.lower() for kw in EVENT_KEYWORDS):
                    continue
                start_date = _parse_date(chunk, target_year, target_month)
                if not start_date:
                    continue

                city_m = all_cities_re.search(chunk)
                city = city_m.group(1) if city_m else 'Milano'

                name_m = re.search(r'([A-Z][A-Za-zÀ-ú\s&+\-]{5,60}?)(?:\s*[-–|,]|\s+\d{1,2})', chunk)
                name = name_m.group(1).strip() if name_m else f'Svendita Privata – {city}'

                if len(name) < 5:
                    continue

                events.append({
                    'name':         name[:150],
                    'description':  chunk[:300].strip(),
                    'event_type':   _guess_type(chunk),
                    'city':         city,
                    'region':       city_to_region(city),
                    'address':      None,
                    'start_date':   start_date,
                    'end_date':     None,
                    'start_time':   None,
                    'end_time':     None,
                    'website':      url,
                    'instagram':    None,
                    'price_info':   None,
                    'organizer':    None,
                    'source_url':   url,
                    'is_verified':  False,
                    'is_featured':  False,
                    'is_recurring': False,
                    'categories':   ['Moda', 'Brand'],
                    'tags':         ['brand_sale', 'private_sale', urlparse(url).netloc.lstrip('www.')],
                })

        except Exception as e:
            print(f'[brand_sales] brand_sale_sites {url}: {e}')

    return events


# ── Main scrape ───────────────────────────────────────────────────────────────

def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    month_name = MONTH_NAMES_IT[target_month]
    seen: set[str] = set()

    # 1 — Fair Price Vintage official site
    for ev in _scrape_fair_price_vintage(target_year, target_month):
        key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
        if key not in seen:
            seen.add(key)
            yield ev

    # 2 — Siti specializzati svendite private (secretsalesgirl, missamplesale, ecc.)
    for ev in _scrape_brand_sale_sites(target_year, target_month):
        key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
        if key not in seen:
            seen.add(key)
            yield ev

    # 3 — Known aggregators
    for ev in _scrape_known_aggregators(target_year, target_month):
        key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
        if key not in seen:
            seen.add(key)
            yield ev

    # 4 — DuckDuckGo search (tutte le città, query rotated monthly)
    offset = (target_month - 1) % 3
    cities_batch = CITIES[offset * 3:(offset + 1) * 3] + CITIES[:2]  # always Milano + Roma
    cities_deduped = list({c[0]: c for c in cities_batch}.values())

    fetcher = StealthyFetcher()
    seen_urls: set[str] = set()

    for city, region in cities_deduped:
        for template in QUERY_TEMPLATES[:4]:
            query = template.format(city=city, month=month_name, year=target_year)
            results = _ddg_search(query)
            time.sleep(1.5)

            for result in results:
                url = result.get('url', '')
                title = result.get('title', '')
                snippet = result.get('snippet', '')

                if not url or _should_skip(url) or url in seen_urls:
                    continue
                seen_urls.add(url)

                combined = f'{title} {snippet}'
                if not any(kw in combined.lower() for kw in EVENT_KEYWORDS):
                    continue

                start_date = _parse_date(combined, target_year, target_month)
                if not start_date:
                    continue

                key = f'{title}:{start_date}:{city}'
                if key in seen:
                    continue
                seen.add(key)

                yield {
                    'name':         title[:150],
                    'description':  snippet[:300] if snippet else None,
                    'event_type':   _guess_type(combined),
                    'city':         city,
                    'region':       region,
                    'address':      None,
                    'start_date':   start_date,
                    'end_date':     None,
                    'start_time':   None,
                    'end_time':     None,
                    'website':      url,
                    'instagram':    None,
                    'price_info':   None,
                    'organizer':    None,
                    'source_url':   url,
                    'is_verified':  False,
                    'is_featured':  False,
                    'is_recurring': False,
                    'categories':   ['Moda', 'Brand', 'Vintage'],
                    'tags':         ['brand_sales', city.lower()],
                }
