from __future__ import annotations
"""
Scraper basato su ricerca internet (DuckDuckGo HTML) per trovare eventi vintage,
mercatini, svuotacantine su qualsiasi sito italiano.

Strategia:
  1. Genera query mirate per ogni regione × categoria × mese
  2. Cerca su DuckDuckGo (HTML, no API key)
  3. Per ogni risultato rilevante, scarica la pagina e ne estrae i dati evento
  4. Salta domini già coperti da altri scraper

Yield: eventi con confidence 0.50 (sito trovato tramite ricerca, non hardcoded)
"""
import re
import time
from datetime import date, timedelta
from typing import Generator
from urllib.parse import urlparse, quote_plus

from scrapling.fetchers import Fetcher, StealthyFetcher

from ..regions import city_to_region

MONTHS_IT = {
    'gen': 1, 'gennaio': 1,
    'feb': 2, 'febbraio': 2,
    'mar': 3, 'marzo': 3,
    'apr': 4, 'aprile': 4,
    'mag': 5, 'maggio': 5,
    'giu': 6, 'giugno': 6,
    'lug': 7, 'luglio': 7,
    'ago': 8, 'agosto': 8,
    'set': 9, 'settembre': 9,
    'ott': 10, 'ottobre': 10,
    'nov': 11, 'novembre': 11,
    'dic': 12, 'dicembre': 12,
}

MONTH_NAMES_IT = [
    '', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

# Città con la rispettiva regione per costruire le query
SEARCH_CITIES = [
    ('Milano',         'Lombardia'),
    ('Roma',           'Lazio'),
    ('Torino',         'Piemonte'),
    ('Napoli',         'Campania'),
    ('Bologna',        'Emilia-Romagna'),
    ('Firenze',        'Toscana'),
    ('Venezia',        'Veneto'),
    ('Genova',         'Liguria'),
    ('Bari',           'Puglia'),
    ('Palermo',        'Sicilia'),
    ('Catania',        'Sicilia'),
    ('Verona',         'Veneto'),
    ('Padova',         'Veneto'),
    ('Brescia',        'Lombardia'),
    ('Bergamo',        'Lombardia'),
    ('Trieste',        'Friuli-Venezia Giulia'),
    ('Parma',          'Emilia-Romagna'),
    ('Modena',         'Emilia-Romagna'),
    ('Arezzo',         'Toscana'),
    ('Siena',          'Toscana'),
    ('Lucca',          'Toscana'),
    ('Perugia',        'Umbria'),
    ('Cagliari',       'Sardegna'),
    ('Sassari',        'Sardegna'),
    ('Salerno',        'Campania'),
    ('Lecce',          'Puglia'),
    ('Pescara',        'Abruzzo'),
    ("L'Aquila",       'Abruzzo'),
    ('Ancona',         'Marche'),
    ('Reggio Calabria','Calabria'),
    ('Matera',         'Basilicata'),
    ('Campobasso',     'Molise'),
    ('Trento',         'Trentino-Alto Adige'),
    ('Aosta',          "Valle d'Aosta"),
]

# Query per città — usate quando si cerca per regione specifica
CITY_QUERY_TEMPLATES = [
    'mercatino antiquariato {city} {month} {year}',
    'mercatino vintage {city} {month} {year}',
    'svuotacantina {city} {month} {year}',
    'fiera collezionismo {city} {month} {year}',
    'mercato vinile {city} {month} {year}',
    'mercatino fumetti {city} {month} {year}',
    'svendita privata {city} {month} {year}',
    'mercatino usato {city} {month} {year}',
]

# Query per regione — copertura capillare di ogni fonte
REGION_QUERY_TEMPLATES = [
    # Aggregatori eventi nazionali
    'mercatini antiquariato {region} {month} {year}',
    'mercatino vintage {region} {month} {year}',
    'svuotacantine {region} {month} {year}',
    'fiera antiquariato {region} {month} {year}',
    'fiera collezionismo {region} {month} {year}',
    'mercato vinile {region} {month} {year}',
    'fumetti vintage {region} {month} {year}',
    'vintage market {region} {month} {year}',
    # Ricorrenti
    'mercatino antiquariato {region} ogni domenica',
    'mercato antiquariato {region} prima domenica mese',
    'mercatino antiquariato {region} seconda domenica',
    'mercatino antiquariato {region} ricorrente mensile',
    # Fonti social — Facebook
    'site:facebook.com mercatino vintage {region} {month} {year}',
    'site:facebook.com svuotacantine {region} {month}',
    'site:facebook.com fiera antiquariato {region} {month}',
    'site:facebook.com/events mercatino {region} {month} {year}',
    # Instagram via search
    'site:instagram.com mercatino vintage {region} {month}',
    'instagram mercatino antiquariato {region} {month} {year}',
    # TikTok creators — i video sono indicizzati da Google/DDG
    'tiktok mercatino vintage {region}',
    'tiktok svuotacantine {region} {year}',
    'tiktok antiquariato {region} {month} {year}',
    # Subito / classificati
    'site:subito.it mercatino {region} {month} {year}',
    'site:bakeca.it mercatino vintage {region}',
    # Aggregatori specializzati
    'eventiesagre {region} {month} {year}',
    'fierionline {region} {month} {year}',
    'mercatinousato {region} {month} {year}',
    # Giornali locali
    'mercatino antiquariato {region} {year} today',
    'vintage mercatino {region} news {month} {year}',
]

# Mantenuto per compatibilità
QUERY_TEMPLATES = CITY_QUERY_TEMPLATES

# Tutte le 20 regioni italiane
SEARCH_REGIONS = [
    'Lombardia', 'Piemonte', 'Veneto', 'Emilia-Romagna', 'Toscana',
    'Lazio', 'Campania', 'Puglia', 'Sicilia', 'Sardegna',
    'Liguria', 'Marche', 'Abruzzo', 'Umbria', 'Friuli-Venezia Giulia',
    'Trentino-Alto Adige', 'Calabria', 'Basilicata', 'Molise', "Valle d'Aosta",
]

# Domini già coperti da altri scraper — da saltare
SKIP_DOMAINS = {
    'eventbrite.it', 'eventbrite.com',
    'subito.it', 'bakeca.it', 'kijiji.it',
    'facebook.com', 'fb.com', 'instagram.com',
    't.me', 'telegram.me',
    'reddit.com',
    'neventum.com',
    'cosedicasa.com',
    'vinokilo.events',
    'turismo.intoscana.it',
    'emiliaromagnaturismo.it',
}

EVENT_KEYWORDS = {
    'svuotacantina', 'svendita', 'vintage', 'mercatino', 'mercato delle pulci',
    'antiquariato', 'vinili', 'fumetti', 'collezionismo', 'memorabilia',
    'brocante', 'rigattiere', 'second hand', 'fiera antiquariato',
    'espositori', 'bancarelle', 'mercato vintage',
}

# Segnali di aziende di servizi, NON eventi
SERVICE_EXCLUDE = {
    'sgombero', 'sgombriamo', 'ritiro mobili', 'svuotiamo gratuitamente',
    'preventivo gratuito', 'chiama', 'numero verde', 'sopralluogo',
    'smaltimento', 'trasloco', 'rimozione', 'valutiamo l\'usato',
}


def _should_skip(url: str) -> bool:
    try:
        domain = urlparse(url).netloc.lower().lstrip('www.')
        return any(domain == skip or domain.endswith('.' + skip) for skip in SKIP_DOMAINS)
    except Exception:
        return True


def _is_relevant(text: str) -> bool:
    t = text.lower()
    if any(excl in t for excl in SERVICE_EXCLUDE):
        return False
    return any(kw in t for kw in EVENT_KEYWORDS)


def _guess_type(text: str) -> str:
    t = text.lower()
    if 'svuotacantina' in t: return 'svuotacantina'
    if 'svendita' in t:       return 'svendita'
    if 'fumetti' in t:        return 'fumetti'
    if 'vinili' in t or 'dischi' in t: return 'vinili'
    if 'collezion' in t:      return 'collezionismo'
    if 'antiquariato' in t:   return 'antiquariato'
    if 'vintage' in t:        return 'mercatino'
    return 'mercatino'


def _parse_date(text: str, target_year: int, target_month: int) -> str | None:
    t = text.lower()

    # dd/mm/yyyy o dd-mm-yyyy
    m = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    # ISO yyyy-mm-dd
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', t)
    if m:
        return m.group(0)

    # dd/mm senza anno
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})(?!\d)', t)
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if 1 <= d <= 31 and 1 <= mo <= 12 and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-{d:02d}'

    # "31 maggio 2026" / "sabato 14 giugno"
    m = re.search(
        r'(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)?'
        r'\s*(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(\d{4}))?',
        t
    )
    if m:
        day = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3])
        yr = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31 and mo == target_month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'

    # "giugno 2026" / "a giugno" / "in giugno" — solo mese, usa giorno 1
    m = re.search(r'\b([a-zà-ú]{4,9})\s+(\d{4})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        yr = int(m.group(2))
        if mo and mo == target_month and yr == target_year:
            return f'{yr:04d}-{mo:02d}-01'

    # "a maggio" / "in giugno" senza anno
    m = re.search(r'\b(?:a|in|nel mese di|per)\s+([a-zà-ú]{4,9})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        if mo and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-01'

    return None


def _extract_address(text: str) -> str | None:
    m = re.search(
        r'(?:via|piazza|corso|viale|largo|borgo|contrada|localita\'?)\s+'
        r'[A-Za-zÀ-ú][A-Za-zÀ-ú\s]{2,30}(?:,\s*\d+)?',
        text, re.IGNORECASE
    )
    return m.group(0).strip() if m else None


# ─── DuckDuckGo search ────────────────────────────────────────────────────────

def _ddg_search(query: str) -> list[dict]:
    """
    Searches DuckDuckGo HTML interface.
    Returns list of {title, url, snippet}.
    DDG uses uddg= redirect URLs and flat result__a / result__snippet lists.
    """
    from urllib.parse import unquote
    fetcher = StealthyFetcher()
    url = f'https://html.duckduckgo.com/html/?q={quote_plus(query)}&kl=it-it'
    try:
        page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000, timeout=20000)
        html = str(page.html_content) if hasattr(page, 'html_content') else ''
        if not html:
            return []

        # Extract (href, title) pairs from result__a anchors
        raw_links = re.findall(
            r'class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)',
            html, re.IGNORECASE
        )
        # Extract snippet texts from result__snippet elements
        snippets = re.findall(
            r'class="result__snippet"[^>]*>([^<]+)',
            html, re.IGNORECASE
        )

        results = []
        for i, (href, title) in enumerate(raw_links[:12]):
            # Decode DDG redirect: //duckduckgo.com/l/?uddg=URL_ENCODED
            uddg_m = re.search(r'uddg=([^&"]+)', href)
            if uddg_m:
                real_url = unquote(uddg_m.group(1))
                # Skip DDG's own ad tracking JS
                if 'duckduckgo.com/y.js' in real_url:
                    continue
            elif href.startswith('//'):
                real_url = 'https:' + href
            elif href.startswith('http'):
                real_url = href
            else:
                continue

            snippet = snippets[i].strip() if i < len(snippets) else ''
            results.append({
                'url':     real_url,
                'title':   title.strip(),
                'snippet': snippet,
            })

        return results

    except Exception as e:
        print(f'[websearch] DDG search "{query}": {e}')
        return []


# ─── Page-level event extraction ──────────────────────────────────────────────

def _extract_from_page(url: str, city: str, target_year: int, target_month: int) -> list[dict]:
    """Download a result page and extract event details."""
    fetcher = Fetcher()
    events = []
    try:
        page = fetcher.get(url, stealthy_headers=True, timeout=10)
        html = str(page.content) if hasattr(page, 'content') else str(page)
        if not html or len(html) < 200:
            return []

        # Try to extract structured event blocks
        blocks = re.findall(
            r'<(?:article|div|section)[^>]*class="[^"]*(?:event|mercatino|news|article|post|card)[^"]*"[^>]*>'
            r'(.*?)</(?:article|div|section)>',
            html, re.DOTALL | re.IGNORECASE
        )

        if not blocks:
            # Fallback: treat the whole page as one block
            blocks = [html[:8000]]

        seen_names: set[str] = set()
        for block in blocks[:15]:
            # Clean HTML tags for text analysis
            text = re.sub(r'<[^>]+>', ' ', block)
            text = re.sub(r'\s+', ' ', text).strip()

            if not _is_relevant(text):
                continue

            start_date = _parse_date(text, target_year, target_month)
            if not start_date:
                continue

            # Validate month
            try:
                d = date.fromisoformat(start_date)
                if d.month != target_month or d.year != target_year:
                    continue
            except ValueError:
                continue

            # Extract event name: first H1/H2/H3 in block, or page title
            title_m = re.search(r'<h[1-3][^>]*>([^<]{5,120})</h[1-3]>', block, re.IGNORECASE)
            if not title_m:
                # Try meta title
                title_m = re.search(r'<title[^>]*>([^<]{5,120})</title>', html, re.IGNORECASE)
            if not title_m:
                continue

            name = re.sub(r'\s+', ' ', title_m.group(1)).strip()
            if name in seen_names:
                continue

            # Extract city from page if not already known
            city_m = re.search(
                r'\b(Milano|Roma|Torino|Napoli|Bologna|Firenze|Venezia|Genova|'
                r'Bari|Palermo|Catania|Verona|Padova|Brescia|Bergamo|Trieste|'
                r'Parma|Modena|Arezzo|Siena|Lucca|Perugia|Cagliari|Salerno|'
                r'Lecce|Pescara|Ancona|Reggio Calabria|Matera|Trento|Aosta)\b',
                text
            )
            page_city = city_m.group(1) if city_m else city

            address = _extract_address(text)

            price_m = re.search(r'(?:ingresso|entrata|ticket)[:\s]*([^\.\n]{3,40})', text, re.IGNORECASE)
            price_info = price_m.group(1).strip() if price_m else None
            if re.search(r'\bgratuito\b|\bgratis\b|\bfree\b|\blibero ingresso\b', text, re.IGNORECASE):
                price_info = 'Ingresso gratuito'

            time_m = re.search(r'(?:ore|dalle)\s+(\d{1,2})[:\.](\d{2})', text, re.IGNORECASE)
            start_time = f'{int(time_m.group(1)):02d}:{time_m.group(2)}' if time_m else None

            seen_names.add(name)
            events.append({
                'name':         name[:150],
                'description':  text[:300],
                'event_type':   _guess_type(text),
                'city':         page_city,
                'region':       city_to_region(page_city),
                'address':      address,
                'start_date':   start_date,
                'end_date':     None,
                'start_time':   start_time,
                'end_time':     None,
                'website':      url,
                'instagram':    None,
                'price_info':   price_info,
                'organizer':    None,
                'source_url':   url,
                'is_verified':  False,
                'is_featured':  False,
                'is_recurring': False,
                'categories':   [],
                'tags':         ['websearch', urlparse(url).netloc.lstrip('www.')],
            })

    except Exception as e:
        print(f'[websearch] page {url}: {e}')

    return events


# ─── Main scrape entry point ───────────────────────────────────────────────────

def _process_results(
    results: list[dict],
    city: str,
    region: str,
    target_year: int,
    target_month: int,
    seen_urls: set[str],
    seen_events: set[str],
) -> Generator[dict, None, None]:
    """Process DDG results for a single query — shared by city + region loops."""
    for result in results:
        url = result.get('url', '')
        title = result.get('title', '')
        snippet = result.get('snippet', '')

        if not url or _should_skip(url):
            continue

        combined = f'{title} {snippet}'
        if not _is_relevant(combined):
            continue

        snippet_date = _parse_date(combined, target_year, target_month)
        if not snippet_date:
            if not any(kw in combined.lower() for kw in ['svuotacantina', 'svendita', 'vintage', 'mercatino']):
                continue

        if url in seen_urls:
            continue
        seen_urls.add(url)

        if snippet_date and title:
            ev_key = f'{title}:{snippet_date}:{city}'
            if ev_key not in seen_events:
                seen_events.add(ev_key)
                yield {
                    'name':         title[:150],
                    'description':  snippet[:300] if snippet else None,
                    'event_type':   _guess_type(combined),
                    'city':         city,
                    'region':       region,
                    'address':      _extract_address(combined),
                    'start_date':   snippet_date,
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
                    'categories':   [],
                    'tags':         ['websearch', urlparse(url).netloc.lstrip('www.')],
                }
        else:
            page_events = _extract_from_page(url, city, target_year, target_month)
            time.sleep(1)
            for ev in page_events:
                ev_key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
                if ev_key in seen_events:
                    continue
                seen_events.add(ev_key)
                yield ev


def scrape(target_year: int, target_month: int, region: str | None = None) -> Generator[dict, None, None]:
    """
    Se `region` è specificata: ricerca esaustiva SOLO per quella regione
    (tutte le città + tutte le query template + fonti social).
    Altrimenti: comportamento precedente con rotazione (compatibilità).
    """
    from ..regions import REGION_CITIES

    month_name = MONTH_NAMES_IT[target_month]
    seen_urls:   set[str] = set()
    seen_events: set[str] = set()

    if region:
        # ── Modalità regione specifica ─────────────────────────────────────
        cities_for_region = REGION_CITIES.get(region, [])
        # Capoluogo come città di riferimento per eventi senza città
        main_city = cities_for_region[0] if cities_for_region else region

        # Fase 1: tutte le query per regione (include social, TikTok, Facebook…)
        for template in REGION_QUERY_TEMPLATES:
            query = template.format(region=region, month=month_name, year=target_year)
            results = _ddg_search(query)
            time.sleep(1.2)
            yield from _process_results(results, main_city, region, target_year, target_month, seen_urls, seen_events)

        # Fase 2: query per ogni città della regione
        for city in cities_for_region:
            for template in CITY_QUERY_TEMPLATES:
                query = template.format(city=city, month=month_name, year=target_year)
                results = _ddg_search(query)
                time.sleep(1.2)
                yield from _process_results(results, city, region, target_year, target_month, seen_urls, seen_events)

        # Fase 3: fetch diretto dei siti locali regionali
        from ..regions import REGION_LOCAL_SITES
        for site in REGION_LOCAL_SITES.get(region, []):
            site_query = f'site:{site} mercatino antiquariato vintage {month_name} {target_year}'
            results = _ddg_search(site_query)
            time.sleep(1.2)
            yield from _process_results(results, main_city, region, target_year, target_month, seen_urls, seen_events)

    else:
        # ── Modalità legacy: rotazione su tutte le regioni ────────────────
        offset = (target_month - 1) % 4
        batch  = SEARCH_CITIES[offset * 9:(offset + 1) * 9]
        always = SEARCH_CITIES[:5]
        cities = list({c[0]: c for c in (always + batch)}.values())

        for city, reg in cities:
            for template in CITY_QUERY_TEMPLATES[:4]:
                query = template.format(city=city, month=month_name, year=target_year)
                results = _ddg_search(query)
                time.sleep(1.5)
                yield from _process_results(results, city, reg, target_year, target_month, seen_urls, seen_events)

        region_offset = (target_month - 1) % 4
        regions_batch = SEARCH_REGIONS[region_offset * 5:(region_offset + 1) * 5]

        for reg in regions_batch:
            region_city = next((c for c, r in SEARCH_CITIES if r == reg), reg)
            for template in REGION_QUERY_TEMPLATES[:4]:
                query = template.format(region=reg, month=month_name, year=target_year)
                results = _ddg_search(query)
                time.sleep(1.5)
                yield from _process_results(results, region_city, reg, target_year, target_month, seen_urls, seen_events)
