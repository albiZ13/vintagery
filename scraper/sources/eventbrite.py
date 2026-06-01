from __future__ import annotations
"""
Scraper for eventbrite.it — vintage/antiquariato/mercatino events in Italy.
Uses StealthyFetcher (JS-heavy site).
"""
import re
from datetime import date, datetime
from typing import Generator

from scrapling.fetchers import StealthyFetcher

from ..regions import city_to_region

BASE = 'https://www.eventbrite.it'

SEARCHES = [
    'vintage-market',
    'mercatino-vintage',
    'mercatino-antiquariato',
    'mercatino',
    'svuotacantina',
    'vinili',
    'fumetti',
    'collezionismo',
    'memorabilia',
]

KEYWORD_TO_TYPE = {
    'vinokilo': 'vinokilo',
    'kilo':     'vinokilo',
    'svuotacantina': 'svuotacantina',
    'svendita': 'svendita',
    'antiquariato': 'antiquariato',
    'antichità': 'antiquariato',
    'fumetti':  'fumetti',
    'vinili':   'vinili',
    'vinile':   'vinili',
    'record':   'vinili',
    'memorabilia': 'memorabilia',
    'collezionismo': 'collezionismo',
    'numismatica': 'collezionismo',
}

MONTHS_EN = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}
MONTHS_IT = {
    'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6,
    'lug': 7, 'ago': 8, 'set': 9, 'ott': 10, 'nov': 11, 'dic': 12,
}


def _guess_event_type(name: str) -> str:
    name_lower = name.lower()
    for kw, etype in KEYWORD_TO_TYPE.items():
        if kw in name_lower:
            return etype
    return 'mercatino'


def _parse_eb_date(text: str, target_year: int) -> str | None:
    t = text.strip().lower()
    # Italian Eventbrite: "dom 31 mag, 08:00" / "sab 13 giu" / "ven 14 lug"
    m = re.search(r'(?:lun|mar|mer|gio|ven|sab|dom)\.?\s+(\d{1,2})\s+(\w{3})', t)
    if m:
        day = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3])
        if mo:
            return f'{target_year:04d}-{mo:02d}-{day:02d}'
    # "31 mag" or "31 maggio" without day name
    m = re.search(r'(\d{1,2})\s+(\w{3,})', t)
    if m:
        day = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3]) or MONTHS_EN.get(m.group(2)[:3])
        if mo:
            return f'{target_year:04d}-{mo:02d}-{day:02d}'
    # "31/05/2026"
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', t)
    if m:
        return f'{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}'
    return None


def _parse_eb_time(text: str) -> str | None:
    m = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', text, re.IGNORECASE)
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    ampm = (m.group(3) or '').upper()
    if ampm == 'PM' and h != 12:
        h += 12
    elif ampm == 'AM' and h == 12:
        h = 0
    return f'{h:02d}:{mi:02d}'


def _parse_events_from_html(html: str, target_year: int, target_month: int, category: str, url: str) -> list[dict]:
    """
    Parse Eventbrite event cards directly from raw HTML.
    Structure (confirmed from DOM inspection):
      <a class="event-card-link" aria-label="View {NAME}" data-event-location="{CITY}, {REGION}" href="{URL}">
        <img ...>
        <h3 class="...event-card__clamp-line--two...">{NAME}</h3>
      </a>
      <p class="...body-md-bold...">{DATE}</p>
      <p class="...body-md...">{CITY} · {ADDRESS}</p>
    """
    events = []
    seen: set[str] = set()

    # Extract all event blocks: (name, date_str, location_str, event_url)
    pattern = re.compile(
        r'aria-label="View ([^"]+)"[^>]*data-event-location="([^"]*)"[^>]*href="(https://www\.eventbrite\.it/e/[^"?]+)'
        r'.*?'
        r'<p[^>]*body-md-bold[^>]*>([^<]+)</p>'
        r'.*?'
        r'<p[^>]*body-md[^>]*event-card__clamp[^>]*>([^<]+)</p>',
        re.DOTALL
    )
    # Simpler fallback: find all aria-labels + next p with date
    # HTML attr order: href → class → aria-label → data-event-location
    cards = re.findall(
        r'href="(https://www\.eventbrite\.it/e/[^"?]+)[^"]*"[^>]*class="event-card-link[^"]*"[^>]*aria-label="View ([^"]{3,120})"[^>]*data-event-location="([^"]*)"',
        html
    )

    for ev_url, name, location_attr in cards:
        if name in seen:
            continue

        # Find date text after this card's occurrence
        card_pos = html.find(f'aria-label="View {name}"')
        if card_pos == -1:
            continue
        # Look for the date paragraph after the card (within 2000 chars)
        chunk = html[card_pos:card_pos + 4000]
        # Date is in first <p class="...body-md-bold..."> after the card
        date_m = re.search(r'<p[^>]*body-md-bold[^>]*>([^<]{5,60})</p>', chunk)
        date_str = date_m.group(1).strip() if date_m else ''

        # Location text (city · address) is in next <p class="...body-md...">
        loc_m = re.search(r'<p[^>]*body-md[^>]*event-card__clamp[^>]*>([^<]{3,120})</p>', chunk)
        location_text = loc_m.group(1).strip() if loc_m else location_attr

        start_date = _parse_eb_date(date_str, target_year)
        if not start_date:
            continue
        try:
            d = date.fromisoformat(start_date)
            if d.year != target_year or d.month != target_month:
                continue
        except ValueError:
            continue

        seen.add(name)

        # City from "Milano · Via X" or from data-event-location attr
        city = location_attr.split(',')[0].strip() if location_attr else 'Italia'
        if ' · ' in location_text:
            city = location_text.split(' · ')[0].strip()
        address = location_text.split(' · ')[1].strip() if ' · ' in location_text else None
        region = city_to_region(city)
        start_time = _parse_eb_time(date_str)
        event_type = _guess_event_type(name)

        # Price
        price_m = re.search(r'<p[^>]*price[^>]*>([^<]{2,40})</p>', chunk, re.IGNORECASE)
        price_info = price_m.group(1).strip() if price_m else None
        if 'gratuito' in date_str.lower() or 'free' in date_str.lower():
            price_info = 'Gratuito'

        source_url = ev_url.split('?')[0]

        events.append({
            'name':        name[:150],
            'description': None,
            'event_type':  event_type,
            'city':        city,
            'region':      region,
            'address':     address,
            'start_date':  start_date,
            'end_date':    None,
            'start_time':  start_time,
            'end_time':    None,
            'website':     source_url,
            'instagram':   None,
            'price_info':  price_info,
            'organizer':   None,
            'source_url':  source_url,
            'is_verified': False,
            'is_featured': False,
            'is_recurring': False,
            'categories':  [],
            'tags':        ['eventbrite', category],
        })

    return events


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = StealthyFetcher(auto_match=False)
    seen_globally: set[str] = set()

    for category in SEARCHES:
        for page_num in range(1, 4):
            url = f'{BASE}/d/italy/{category}/?page={page_num}'
            try:
                page = fetcher.fetch(url, headless=True, network_idle=True, wait=3000)
            except Exception as e:
                print(f'[eventbrite] {category} p{page_num} error: {e}')
                break

            html = str(page.html_content) if hasattr(page, 'html_content') else ''
            if not html:
                break

            events = _parse_events_from_html(html, target_year, target_month, category, url)
            found_new = False

            for ev in events:
                key = f'{ev["name"]}:{ev["start_date"]}'
                if key in seen_globally:
                    continue
                seen_globally.add(key)
                found_new = True
                yield ev

            if not found_new and page_num > 1:
                break
