from __future__ import annotations
"""
Scraper per kijiji.it — annunci privati di svuotacantine, svendite, mercatini.
Kijiji Italia (eBay classifieds) ha un'ampia sezione eventi locali.

URL: https://www.kijiji.it/annunci/{categoria}/{città}/
"""
import re
from datetime import date, timedelta
from typing import Generator

from scrapling.fetchers import StealthyFetcher

from ..regions import city_to_region

MONTHS_IT = {
    'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6,
    'lug': 7, 'ago': 8, 'set': 9, 'ott': 10, 'nov': 11, 'dic': 12,
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5,
    'giugno': 6, 'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10,
    'novembre': 11, 'dicembre': 12,
}

CITIES = [
    ('milano',    'Milano'),
    ('roma',      'Roma'),
    ('torino',    'Torino'),
    ('napoli',    'Napoli'),
    ('bologna',   'Bologna'),
    ('firenze',   'Firenze'),
    ('venezia',   'Venezia'),
    ('bari',      'Bari'),
    ('genova',    'Genova'),
    ('palermo',   'Palermo'),
    ('verona',    'Verona'),
    ('padova',    'Padova'),
    ('brescia',   'Brescia'),
]

EVENT_KEYWORDS = {
    'svuotacantina', 'svendita', 'vintage', 'mercatino', 'mercato',
    'antiquariato', 'vinili', 'fumetti', 'collezionismo', 'usato',
    'abbigliamento vintage', 'retro', 'second hand', 'brocante',
}

DATE_KEYWORDS = {
    'domenica', 'sabato', 'weekend', 'sabato e domenica',
    'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
    'lug', 'ago', 'set', 'ott', 'nov', 'dic',
}


def _is_event(title: str, desc: str = '') -> bool:
    text = (title + ' ' + desc).lower()
    has_kw = any(kw in text for kw in EVENT_KEYWORDS)
    has_date = any(dk in text for dk in DATE_KEYWORDS) or bool(
        re.search(r'\d{1,2}[/\-]\d{1,2}', text)
    )
    return has_kw and has_date


def _parse_date(text: str, target_year: int, target_month: int) -> str | None:
    t = text.lower()

    # dd/mm/yyyy
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    # dd/mm
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})(?!\d)', t)
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if 1 <= d <= 31 and 1 <= mo <= 12 and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-{d:02d}'

    # "31 maggio" / "5 giu 2026"
    m = re.search(r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', t)
    if m:
        day = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3])
        yr = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31 and mo == target_month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'

    # fallback: domenica/sabato → first occurrence in month
    if 'domenica' in t:
        d = date(target_year, target_month, 1)
        while d.weekday() != 6:
            d += timedelta(days=1)
        return d.isoformat()
    if 'sabato' in t:
        d = date(target_year, target_month, 1)
        while d.weekday() != 5:
            d += timedelta(days=1)
        return d.isoformat()

    return None


def _guess_type(text: str) -> str:
    t = text.lower()
    if 'svuotacantina' in t: return 'svuotacantina'
    if 'svendita' in t:       return 'svendita'
    if 'fumetti' in t:        return 'fumetti'
    if 'vinili' in t:         return 'vinili'
    if 'collezion' in t:      return 'collezionismo'
    if 'antiquariato' in t:   return 'antiquariato'
    return 'mercatino'


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = StealthyFetcher(auto_match=False)
    seen: set[str] = set()

    # Kijiji search URL for events/svuotacantine
    search_terms = ['svuotacantina', 'mercatino-vintage', 'svendita']

    for term in search_terms:
        for city_slug, city_name in CITIES[:10]:
            url = f'https://www.kijiji.it/annunci/{term}/{city_slug}/'
            try:
                page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
                html = str(page.html_content) if hasattr(page, 'html_content') else ''
                if not html:
                    continue

                # Extract listing cards
                blocks = re.findall(
                    r'<(?:article|div|li)[^>]*class="[^"]*(?:listing|annuncio|card)[^"]*"[^>]*>(.*?)</(?:article|div|li)>',
                    html, re.DOTALL | re.IGNORECASE
                )

                for block in blocks[:20]:
                    title_m = re.search(r'<h[1-4][^>]*>([^<]{5,120})</h[1-4]>', block, re.IGNORECASE)
                    if not title_m:
                        title_m = re.search(r'<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,120})<', block, re.IGNORECASE)
                    if not title_m:
                        continue

                    title = re.sub(r'\s+', ' ', title_m.group(1)).strip()
                    if not title:
                        continue

                    desc_m = re.search(r'<p[^>]*>([^<]{10,200})</p>', block)
                    desc = re.sub(r'\s+', ' ', desc_m.group(1)).strip() if desc_m else ''

                    if not _is_event(title, desc):
                        continue

                    text = f'{title} {desc}'
                    start_date = _parse_date(text, target_year, target_month)
                    if not start_date:
                        continue

                    key = f'{title}:{start_date}:{city_name}'
                    if key in seen:
                        continue
                    seen.add(key)

                    link_m = re.search(r'href="(/annunci/[^"]+)"', block)
                    website = f'https://www.kijiji.it{link_m.group(1)}' if link_m else url

                    price_m = re.search(r'(?:ingresso|entrata)[:\s]*([^\.\n]{3,40})', text, re.IGNORECASE)
                    price_info = price_m.group(1).strip() if price_m else None
                    if re.search(r'\bgratuito\b|\bgratis\b|\bfree\b', text, re.IGNORECASE):
                        price_info = 'Ingresso gratuito'

                    addr_m = re.search(r'(?:via|piazza|corso|viale)\s+[A-Za-zÀ-ú\s]{3,40}', text, re.IGNORECASE)
                    address = addr_m.group(0).strip() if addr_m else None

                    yield {
                        'name':         title[:150],
                        'description':  desc[:300] if desc else None,
                        'event_type':   _guess_type(text),
                        'city':         city_name,
                        'region':       city_to_region(city_name),
                        'address':      address,
                        'start_date':   start_date,
                        'end_date':     None,
                        'start_time':   None,
                        'end_time':     None,
                        'website':      website,
                        'instagram':    None,
                        'price_info':   price_info,
                        'organizer':    None,
                        'source_url':   website,
                        'is_verified':  False,
                        'is_featured':  False,
                        'is_recurring': False,
                        'categories':   [],
                        'tags':         ['kijiji', term, city_name.lower()],
                    }

            except Exception as e:
                print(f'[kijiji] {city_slug}/{term}: {e}')
