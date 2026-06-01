from __future__ import annotations
"""
Scraper per bakeca.it — annunci privati di svuotacantine, svendite e mercatini.
Bakeca è uno dei più grandi siti di annunci gratuiti in Italia (~300k annunci/mese).

URL pattern: https://www.bakeca.it/annunci/{categoria}/{città}/
Categorie rilevanti: svuotacantina, oggetti-vintage, fumetti-libri
"""
import re
from datetime import date, datetime
from typing import Generator

from scrapling.fetchers import StealthyFetcher

from ..regions import city_to_region

MONTHS_IT = {
    'gennaio': 1, 'gen': 1,
    'febbraio': 2, 'feb': 2,
    'marzo': 3, 'mar': 3,
    'aprile': 4, 'apr': 4,
    'maggio': 5, 'mag': 5,
    'giugno': 6, 'giu': 6,
    'luglio': 7, 'lug': 7,
    'agosto': 8, 'ago': 8,
    'settembre': 9, 'set': 9,
    'ottobre': 10, 'ott': 10,
    'novembre': 11, 'nov': 11,
    'dicembre': 12, 'dic': 12,
}

# (bakeca_slug, display_name) per le principali città
CITIES = [
    ('milano',          'Milano'),
    ('roma',            'Roma'),
    ('torino',          'Torino'),
    ('napoli',          'Napoli'),
    ('bologna',         'Bologna'),
    ('firenze',         'Firenze'),
    ('venezia',         'Venezia'),
    ('genova',          'Genova'),
    ('bari',            'Bari'),
    ('palermo',         'Palermo'),
    ('catania',         'Catania'),
    ('verona',          'Verona'),
    ('padova',          'Padova'),
    ('brescia',         'Brescia'),
    ('bergamo',         'Bergamo'),
    ('trieste',         'Trieste'),
    ('parma',           'Parma'),
    ('modena',          'Modena'),
    ('reggio-emilia',   'Reggio Emilia'),
    ('perugia',         'Perugia'),
    ('cagliari',        'Cagliari'),
    ('salerno',         'Salerno'),
    ('pescara',         'Pescara'),
    ('ancona',          'Ancona'),
]

# Categorie bakeca rilevanti
CATEGORIES = [
    'svuotacantina',
    'oggetti-collezionismo',
]

EVENT_KEYWORDS = {
    'svuotacantina', 'svendita', 'vintage', 'mercatino', 'antiquariato',
    'vinili', 'fumetti', 'collezionismo', 'memorabilia', 'usato', 'retro',
    'abbigliamento', 'libri', 'dischi',
}

DATE_KEYWORDS = {
    'domenica', 'sabato', 'sabato e domenica', 'weekend',
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
}


def _is_event(title: str, desc: str) -> bool:
    text = (title + ' ' + desc).lower()
    has_keyword = any(kw in text for kw in EVENT_KEYWORDS)
    has_date = any(dk in text for dk in DATE_KEYWORDS) or bool(re.search(r'\d{1,2}[/\-]\d{1,2}', text))
    return has_keyword and has_date


def _parse_date(text: str, target_year: int, target_month: int) -> str | None:
    t = text.lower()

    # dd/mm/yyyy
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    # dd/mm (no year)
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})(?!\d)', t)
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if 1 <= d <= 31 and 1 <= mo <= 12 and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-{d:02d}'

    # "31 maggio" / "sabato 14 giugno"
    m = re.search(r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', t)
    if m:
        day = int(m.group(1))
        mo_word = m.group(2)[:3]
        mo = MONTHS_IT.get(mo_word)
        yr = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31 and mo == target_month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'

    # Giorno della settimana senza data → usa prima domenica/sabato del mese
    if 'domenica' in t:
        # First Sunday
        d = date(target_year, target_month, 1)
        while d.weekday() != 6:
            from datetime import timedelta
            d += timedelta(days=1)
        return d.isoformat()
    if 'sabato' in t:
        d = date(target_year, target_month, 1)
        while d.weekday() != 5:
            from datetime import timedelta
            d += timedelta(days=1)
        return d.isoformat()

    return None


def _guess_type(text: str) -> str:
    t = text.lower()
    if 'svuotacantina' in t:   return 'svuotacantina'
    if 'svendita' in t:         return 'svendita'
    if 'fumetti' in t:          return 'fumetti'
    if 'vinili' in t or 'dischi' in t: return 'vinili'
    if 'collezion' in t:        return 'collezionismo'
    if 'antiquariato' in t:     return 'antiquariato'
    if 'vintage' in t:          return 'mercatino'
    return 'svuotacantina'


def _parse_listing_page(html: str, city_name: str, category: str,
                        target_year: int, target_month: int, base_url: str) -> list[dict]:
    events = []
    seen_titles: set[str] = set()

    # Bakeca listing: each ad is in a <article> or <div class="listing-item">
    # Title in <h2> or <a class="listing-item__title">
    # Description in <p class="listing-item__description">
    blocks = re.findall(
        r'<(?:article|div)[^>]*class="[^"]*listing[^"]*"[^>]*>(.*?)</(?:article|div)>',
        html, re.DOTALL | re.IGNORECASE
    )

    for block in blocks[:30]:
        title_m = re.search(r'<(?:h[1-4]|a)[^>]*(?:title|heading)[^>]*>([^<]{5,120})</', block, re.IGNORECASE)
        if not title_m:
            title_m = re.search(r'<h[1-4][^>]*>([^<]{5,120})</h[1-4]>', block, re.IGNORECASE)
        if not title_m:
            continue
        title = re.sub(r'\s+', ' ', title_m.group(1)).strip()
        if title in seen_titles:
            continue

        desc_m = re.search(r'<p[^>]*(?:description|desc|text)[^>]*>([^<]{10,300})</p>', block, re.IGNORECASE)
        desc = re.sub(r'\s+', ' ', desc_m.group(1)).strip() if desc_m else ''

        if not _is_event(title, desc):
            continue

        text = f'{title} {desc}'
        start_date = _parse_date(text, target_year, target_month)
        if not start_date:
            continue

        link_m = re.search(r'href="(/annunci/[^"]+)"', block)
        url = f'https://www.bakeca.it{link_m.group(1)}' if link_m else base_url

        price_m = re.search(r'(?:ingresso|entrata)[:\s]*([^\.\n]{3,40})', text, re.IGNORECASE)
        price_info = price_m.group(1).strip() if price_m else None
        if re.search(r'\bgratuito\b|\bgratis\b|\bfree\b', text, re.IGNORECASE):
            price_info = 'Ingresso gratuito'

        addr_m = re.search(r'(?:via|piazza|corso|viale|largo)\s+[A-Za-zÀ-ú\s]{3,40}', text, re.IGNORECASE)
        address = addr_m.group(0).strip() if addr_m else None

        seen_titles.add(title)
        events.append({
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
            'website':      url,
            'instagram':    None,
            'price_info':   price_info,
            'organizer':    None,
            'source_url':   url,
            'is_verified':  False,
            'is_featured':  False,
            'is_recurring': False,
            'categories':   [],
            'tags':         ['bakeca', category, city_name.lower()],
        })

    return events


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = StealthyFetcher(auto_match=False)
    seen_globally: set[str] = set()

    for city_slug, city_name in CITIES[:12]:  # top 12 cities to limit rate
        for category in CATEGORIES:
            url = f'https://www.bakeca.it/annunci/{category}/{city_slug}/'
            try:
                page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
                html = str(page.html_content) if hasattr(page, 'html_content') else ''
                if not html:
                    continue

                events = _parse_listing_page(html, city_name, category, target_year, target_month, url)
                for ev in events:
                    key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
                    if key in seen_globally:
                        continue
                    seen_globally.add(key)
                    yield ev

            except Exception as e:
                print(f'[bakeca] {city_slug}/{category}: {e}')
