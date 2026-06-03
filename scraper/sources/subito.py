from __future__ import annotations
"""
Scraper for subito.it — svuotacantine, svendite private, mercatini usato.
Uses StealthyFetcher. Targets the "svuotacantine" and "oggettistica" categories.
"""
import re
from datetime import date
from typing import Generator

from scrapling.fetchers import StealthyFetcher

from ..regions import city_to_region, ITALIAN_REGIONS

BASE = 'https://www.subito.it'

SEARCHES = [
    {'path': '/campania/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': None},
    {'path': '/lombardia/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Lombardia'},
    {'path': '/lazio/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Lazio'},
    {'path': '/toscana/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Toscana'},
    {'path': '/piemonte/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Piemonte'},
    {'path': '/veneto/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Veneto'},
    {'path': '/emilia-romagna/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Emilia-Romagna'},
    {'path': '/sicilia/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Sicilia'},
    {'path': '/puglia/vendita/oggettistica-e-arredamento/?q=svuotacantina', 'region': 'Puglia'},
]

MONTHS_IT = {
    'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6,
    'lug': 7, 'ago': 8, 'set': 9, 'ott': 10, 'nov': 11, 'dic': 12,
}


def _extract_date(text: str, target_year: int) -> str | None:
    # "31/05/2026" or "31-05-2026"
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})', text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        return f'{y:04d}-{mo:02d}-{d:02d}'
    # "oggi", "domani", etc. → use target month
    if 'oggi' in text.lower():
        from datetime import datetime
        now = datetime.now()
        return now.strftime('%Y-%m-%d')
    return None


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = StealthyFetcher()
    seen_titles: set[str] = set()

    for search in SEARCHES:
        url = f'{BASE}{search["path"]}'
        try:
            page = fetcher.fetch(url, headless=True, network_idle=True)
        except Exception as e:
            print(f'[subito] {url} error: {e}')
            continue

        # Subito uses article or li elements for listings
        items = (
            page.css('article[class*="item"]') or
            page.css('div[class*="item-card"]') or
            page.css('div[class*="listing"]')
        )

        for item in items:
            text = item.get_all_text(ignore_tags=('script', 'style'))
            if not text.strip():
                continue

            # Title
            title_el = item.css('h2') or item.css('[class*="title"]') or item.css('a')
            name = title_el[0].text.strip() if title_el else text[:60].strip()
            if not name or name in seen_titles:
                continue

            # Only include event-like listings (contain date keywords)
            has_date = bool(re.search(r'\d{1,2}[/\-]\d{1,2}|\b(domenica|sabato|venerdì|giovedì)\b', text, re.IGNORECASE))
            if not has_date:
                continue

            seen_titles.add(name)
            start_date = _extract_date(text, target_year)

            # If no date found, use first day of target month
            if not start_date:
                start_date = f'{target_year:04d}-{target_month:02d}-01'

            # City from listing location
            city_el = item.css('[class*="city"]') or item.css('[class*="location"]')
            city = city_el[0].text.strip().split('(')[0].strip() if city_el else 'Italia'
            region = search['region'] or city_to_region(city)

            address_match = re.search(
                r'((?:Via|Piazza|Corso|Largo|Viale)\s+[^\n,]{3,50})',
                text, re.IGNORECASE
            )
            address = address_match.group(1).strip() if address_match else None

            link_el = item.css('a[href*="/annunci/"]') or item.css('a')
            source_url = link_el[0].attrib.get('href') if link_el else url
            if source_url and not source_url.startswith('http'):
                source_url = BASE + source_url

            price_match = re.search(r'([\d,.]+)\s*€|€\s*([\d,.]+)', text)
            price_info = f'{(price_match.group(1) or price_match.group(2))}€' if price_match else None

            yield {
                'name':        name[:150],
                'description': text[:300].strip(),
                'event_type':  'svuotacantina',
                'city':        city,
                'region':      region,
                'address':     address,
                'start_date':  start_date,
                'end_date':    None,
                'start_time':  None,
                'end_time':    None,
                'website':     source_url,
                'instagram':   None,
                'price_info':  price_info,
                'organizer':   None,
                'source_url':  source_url,
                'is_verified': False,
                'is_featured': False,
                'is_recurring': False,
                'categories':  ['Usato', 'Casa', 'Oggettistica'],
                'tags':        ['subito', 'svuotacantina', 'privato'],
            }
