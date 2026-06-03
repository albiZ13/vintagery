from __future__ import annotations
"""
Scraper for cosedicasa.com/mercatini
Weekly calendar of Italian flea markets and antique fairs, grouped by region.
Uses basic Fetcher (static HTML, no JS).
Confidence: 0.65 — events are community-submitted, recurring ones are reliable.
"""
import re
from datetime import date, timedelta
from typing import Generator
from scrapling.fetchers import Fetcher
from ..regions import city_to_region

BASE = 'https://www.cosedicasa.com'

MONTHS_IT = {
    'gennaio':1,'febbraio':2,'marzo':3,'aprile':4,'maggio':5,'giugno':6,
    'luglio':7,'agosto':8,'settembre':9,'ottobre':10,'novembre':11,'dicembre':12,
}


def _parse_italian_date(text: str, year: int) -> str | None:
    m = re.search(r'(\d{1,2})\s+(\w+)\s+(\d{4})', text.lower())
    if m:
        d = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2))
        y = int(m.group(3))
        if mo:
            return f'{y:04d}-{mo:02d}-{d:02d}'
    m = re.search(r'(\d{1,2})\s+(\w+)', text.lower())
    if m:
        d = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2))
        if mo:
            return f'{year:04d}-{mo:02d}-{d:02d}'
    return None


def _sundays_in_month(year: int, month: int) -> list[date]:
    sundays = []
    d = date(year, month, 1)
    while d.month == month:
        if d.weekday() == 6:
            sundays.append(d)
        d += timedelta(days=1)
    return sundays


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date | None:
    """Return the Nth occurrence of weekday (0=Mon,6=Sun) in the given month."""
    count = 0
    d = date(year, month, 1)
    while d.month == month:
        if d.weekday() == weekday:
            count += 1
            if count == n:
                return d
        d += timedelta(days=1)
    return None


def _resolve_recurring(desc: str, year: int, month: int) -> list[str]:
    """Convert recurring schedule description into concrete dates for the month."""
    desc_l = desc.lower()
    dates = []

    patterns = [
        (r'prima\s+domenica',  lambda: [_nth_weekday(year, month, 6, 1)]),
        (r'seconda\s+domenica', lambda: [_nth_weekday(year, month, 6, 2)]),
        (r'terza\s+domenica',  lambda: [_nth_weekday(year, month, 6, 3)]),
        (r'quarta\s+domenica', lambda: [_nth_weekday(year, month, 6, 4)]),
        (r'ogni\s+domenica',   lambda: _sundays_in_month(year, month)),
        (r'primo\s+sabato',    lambda: [_nth_weekday(year, month, 5, 1)]),
        (r'secondo\s+sabato',  lambda: [_nth_weekday(year, month, 5, 2)]),
        (r'terzo\s+sabato',    lambda: [_nth_weekday(year, month, 5, 3)]),
        (r'ogni\s+sabato',     lambda: [
            d for d in [date(year, month, i) for i in range(1, 32)
                        if date(year, month, 1).replace(day=i).month == month]
            if d.weekday() == 5
        ]),
    ]

    for pattern, resolver in patterns:
        if re.search(pattern, desc_l):
            resolved = resolver()
            for d in resolved:
                if d and d.year == year and d.month == month:
                    dates.append(d.isoformat())
            if dates:
                return dates

    return []


REGION_MAP = {
    'abruzzo': 'Abruzzo', 'basilicata': 'Basilicata', 'calabria': 'Calabria',
    'campania': 'Campania', 'emilia-romagna': 'Emilia-Romagna',
    'friuli-venezia-giulia': 'Friuli-Venezia Giulia', 'lazio': 'Lazio',
    'liguria': 'Liguria', 'lombardia': 'Lombardia', 'marche': 'Marche',
    'molise': 'Molise', 'piemonte': 'Piemonte', 'puglia': 'Puglia',
    'sardegna': 'Sardegna', 'sicilia': 'Sicilia', 'toscana': 'Toscana',
    'trentino-alto-adige': 'Trentino-Alto Adige', 'umbria': 'Umbria',
    "valle-d-aosta": "Valle d'Aosta", 'veneto': 'Veneto',
}


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = Fetcher()

    # Correct URL format: /mercatini/mese/{month}
    month_url = f'{BASE}/mercatini/mese/{target_month}'
    try:
        page = fetcher.get(month_url)
    except Exception as e:
        print(f'[cosedicasa] fetch error: {e}')
        return

    # Structure: dd.mercatini-fiere-loop-item with data-day, data-region, data-latitude, data-longitude
    html = str(page.html_content) if hasattr(page, 'html_content') else str(page)

    # Step 1: extract all dd blocks
    dd_blocks = re.findall(r'(<dd[^>]*class="mercatini-fiere-loop-item[^"]*"[^>]*>.*?</dd>)', html, re.DOTALL)

    seen: set[str] = set()

    for block in dd_blocks:
        # Extract data attrs (order may vary)
        day_str   = (re.search(r'data-day="(\d{8})"',        block) or object()).group(1) if re.search(r'data-day="(\d{8})"', block) else None
        region_slug = (re.search(r'data-region="([^"]*)"',   block) or object()).group(1) if re.search(r'data-region="([^"]*)"', block) else ''
        lat       = (re.search(r'data-latitude="([^"]*)"',    block) or object()).group(1) if re.search(r'data-latitude="([^"]*)"', block) else ''
        lng       = (re.search(r'data-longitude="([^"]*)"',   block) or object()).group(1) if re.search(r'data-longitude="([^"]*)"', block) else ''
        url_m     = re.search(r'href="(/mercatini/[^"?]+)"',  block)
        title_m   = re.search(r'title="([^"]+)"',             block)
        name_m    = re.search(r'<span[^>]*bigtitle[^>]*>(.*?)</span>', block, re.DOTALL)

        if not day_str or not name_m:
            continue
        url    = url_m.group(1) if url_m else ''
        title  = title_m.group(1) if title_m else ''
        name_raw = name_m.group(1)
        # Parse date from YYYYMMDD
        try:
            y, m, d_num = int(day_str[:4]), int(day_str[4:6]), int(day_str[6:8])
            if y != target_year or m != target_month:
                continue
            start_date = f'{y:04d}-{m:02d}-{d_num:02d}'
        except (ValueError, IndexError):
            continue

        # Clean name (remove <em> and HTML tags)
        name = re.sub(r'<[^>]+>', '', name_raw).strip()
        name = re.sub(r'\s+', ' ', name)
        if not name or name in seen:
            continue
        seen.add(name)

        region = REGION_MAP.get(region_slug.lower(), city_to_region(title.split(',')[0].strip()))
        city = title.split(',')[0].strip() if title else name

        full_url = url if url.startswith('http') else BASE + url

        yield {
            'name':        name[:150],
            'description': None,
            'event_type':  'mercatino',
            'city':        city,
            'region':      region,
            'address':     None,
            'lat':         float(lat) if lat else None,
            'lng':         float(lng) if lng else None,
            'start_date':  start_date,
            'end_date':    None,
            'start_time':  None,
            'end_time':    None,
            'website':     full_url,
            'instagram':   None,
            'price_info':  None,
            'organizer':   None,
            'source_url':  full_url,
            'is_verified': False,
            'is_featured': False,
            'is_recurring': False,
            'categories':  ['Antiquariato', 'Usato'],
            'tags':        ['cosedicasa', 'mercatino'],
        }
