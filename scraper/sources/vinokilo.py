from __future__ import annotations
"""
Scraper for vinokilo.events — Italian kilo vintage sale events.
Uses Scrapling Fetcher (Shopify site, server-side rendered).
"""
import re
from datetime import date
from typing import Generator

from scrapling.fetchers import Fetcher

from ..regions import city_to_region

BASE = 'https://vinokilo.events'

MONTHS_IT = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12,
    # short forms
    'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6,
    'lug': 7, 'ago': 8, 'set': 9, 'ott': 10, 'nov': 11, 'dic': 12,
}


def _parse_date(text: str, year: int) -> str | None:
    text = text.lower().strip()
    # "30/05/2026" or "30/05/26"
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        return f'{y:04d}-{mo:02d}-{d:02d}'
    # "30 maggio" or "30 MAGGIO"
    m = re.search(r'(\d{1,2})\s+([a-z]+)', text)
    if m:
        d = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3])
        if mo:
            return f'{year:04d}-{mo:02d}-{d:02d}'
    return None


def _parse_time(text: str) -> tuple[str | None, str | None]:
    m = re.search(r'(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})', text)
    if m:
        return f'{int(m.group(1)):02d}:{m.group(2)}', f'{int(m.group(3)):02d}:{m.group(4)}'
    m = re.search(r'(\d{1,2}):(\d{2})', text)
    if m:
        return f'{int(m.group(1)):02d}:{m.group(2)}', None
    return None, None


def _parse_price(text: str) -> str | None:
    m = re.search(r'([\d,.]+)\s*[€$]|[€$]\s*([\d,.]+)', text)
    if m:
        val = m.group(1) or m.group(2)
        return f'{val}€'
    if 'grat' in text.lower() or 'free' in text.lower():
        return 'Gratuito'
    return None


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = Fetcher()

    # Get all event collection URLs
    try:
        index = fetcher.get(f'{BASE}/pages/all-events')
    except Exception as e:
        print(f'[vinokilo] index fetch error: {e}')
        return

    collection_links = index.css('a[href*="/collections/"]')
    seen_hrefs: set[str] = set()

    for link in collection_links:
        href = link.attrib.get('href', '')
        if not href or href in seen_hrefs:
            continue
        # skip non-city paths (cart, all, etc.)
        slug = href.split('/collections/')[-1].split('?')[0].strip('/')
        if not slug or slug in ('all', 'frontpage'):
            continue
        seen_hrefs.add(href)

        city_name = slug.replace('-', ' ').title()
        url = f'{BASE}/collections/{slug}'

        try:
            page = fetcher.get(url)
        except Exception as e:
            print(f'[vinokilo] {slug} fetch error: {e}')
            continue

        # Extract all text content to find date, time, price, address
        body_text = page.get_all_text(ignore_tags=('script', 'style'))

        start_date = _parse_date(body_text, target_year)
        if not start_date:
            continue

        # Filter by target month/year
        try:
            d = date.fromisoformat(start_date)
            if d.year != target_year or d.month != target_month:
                continue
        except ValueError:
            continue

        start_time, end_time = _parse_time(body_text)

        # Address: look for "Via", "Piazza", "Corso", "Largo"
        addr_match = re.search(
            r'((?:Via|Piazza|Corso|Largo|Viale|Strada|Loc\.?)\s+[^\n,]{3,60})',
            body_text, re.IGNORECASE
        )
        address = addr_match.group(1).strip() if addr_match else None

        # Price: look for € signs or "gratuito"
        price_match = re.search(r'([€$][\d,. ]+|[\d,.]+\s*€|grat\w+|free)', body_text, re.IGNORECASE)
        price_info: str | None = None
        if price_match:
            price_info = price_match.group(0).strip()

        region = city_to_region(city_name)

        yield {
            'name':        f'Vinokilo Vintage Kilo Sale – {city_name}',
            'description': (
                f'Vendita vintage al kilo a {city_name}. '
                'Capi selezionati pesati e venduti al chilo. '
                'Abbigliamento uomo/donna anni \'70–\'00.'
            ),
            'event_type':  'vinokilo',
            'city':        city_name,
            'region':      region,
            'address':     address,
            'start_date':  start_date,
            'end_date':    None,
            'start_time':  start_time,
            'end_time':    end_time,
            'website':     url,
            'instagram':   '@vinokilo',
            'price_info':  price_info,
            'organizer':   'Vinokilo',
            'source_url':  url,
            'is_verified': True,
            'is_featured': False,
            'is_recurring': True,
            'categories':  ['Abbigliamento', 'Vintage', 'Kilo'],
            'tags':        ['vinokilo', 'kilo', 'vintage', 'abbigliamento'],
        }
