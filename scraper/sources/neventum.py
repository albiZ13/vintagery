from __future__ import annotations
"""
Scraper for neventum.com — B2B antique/collectible fair directory for Italy.
~63 indexed fairs. Uses basic Fetcher with pagination.
Confidence: 0.85 — organizer-submitted fair calendar.
"""
import re
from datetime import date
from typing import Generator
from scrapling.fetchers import Fetcher
from ..regions import city_to_region

BASE  = 'https://www.neventum.com'
INDEX = '/tradeshows/antiques/italy'

MONTHS_EN = {
    'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,
    'july':7,'august':8,'september':9,'october':10,'november':11,'december':12,
    'jan':1,'feb':2,'mar':3,'apr':4,'jun':6,'jul':7,'aug':8,
    'sep':9,'oct':10,'nov':11,'dec':12,
}


def _parse_date(text: str, year: int) -> tuple[str | None, str | None]:
    """Returns (start_date, end_date) as ISO strings."""
    # "March 7-15, 2026" or "Jan 15-19, 2027"
    m = re.search(
        r'(\w+)\s+(\d{1,2})[-–](\d{1,2}),?\s*(\d{4})?', text, re.IGNORECASE
    )
    if m:
        mo = MONTHS_EN.get(m.group(1).lower())
        d1, d2 = int(m.group(2)), int(m.group(3))
        y = int(m.group(4)) if m.group(4) else year
        if mo:
            return f'{y:04d}-{mo:02d}-{d1:02d}', f'{y:04d}-{mo:02d}-{d2:02d}'
    # "March 7, 2026"
    m = re.search(r'(\w+)\s+(\d{1,2}),?\s*(\d{4})?', text, re.IGNORECASE)
    if m:
        mo = MONTHS_EN.get(m.group(1).lower())
        d1 = int(m.group(2))
        y = int(m.group(3)) if m.group(3) else year
        if mo:
            return f'{y:04d}-{mo:02d}-{d1:02d}', None
    return None, None


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = Fetcher()
    seen: set[str] = set()

    for page_num in range(1, 8):  # up to 7 pages (~63 events / 10 per page)
        url = f'{BASE}{INDEX}' + (f'?page={page_num}' if page_num > 1 else '')
        try:
            page = fetcher.get(url)
        except Exception as e:
            print(f'[neventum] p{page_num} error: {e}')
            break

        items = (
            page.css('article') or
            page.css('div[class*="fair"]') or
            page.css('div[class*="event"]') or
            page.css('li[class*="fair"]') or
            page.css('tr[class*="fair"]')
        )

        if not items:
            # Fallback: look for any heading + date pair
            headings = page.css('h2,h3,h4')
            if not headings:
                break
            items = headings

        found_on_page = False

        for item in items:
            text = item.get_all_text(ignore_tags=('script', 'style')).strip()
            if len(text) < 10:
                continue

            title_el = item.css('h2,h3,h4,a,strong')
            name = title_el[0].text.strip() if title_el else text[:80]
            if not name or name in seen:
                continue

            start_date, end_date = _parse_date(text, target_year)
            if not start_date:
                continue

            try:
                d = date.fromisoformat(start_date)
                if d.year != target_year or d.month != target_month:
                    continue
            except ValueError:
                continue

            found_on_page = True
            seen.add(name)

            city_match = re.search(r'\bin\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s+[a-z]+)?)\b', text)
            city = city_match.group(1) if city_match else 'Italia'
            region = city_to_region(city)

            link_el = item.css('a[href*="/tradeshow"]') or item.css('a[href]')
            source_url = link_el[0].attrib.get('href', '') if link_el else ''
            if source_url and not source_url.startswith('http'):
                source_url = BASE + source_url

            # Guess type from name
            name_l = name.lower()
            event_type = 'antiquariato'
            if 'fumett' in name_l or 'comic' in name_l:
                event_type = 'fumetti'
            elif 'militari' in name_l or 'memorabil' in name_l:
                event_type = 'memorabilia'
            elif 'numismat' in name_l or 'filatel' in name_l:
                event_type = 'collezionismo'
            elif 'vinile' in name_l or 'record' in name_l or 'vinyl' in name_l:
                event_type = 'vinili'

            yield {
                'name': name[:150],
                'description': text[:400],
                'event_type': event_type,
                'city': city,
                'region': region,
                'address': None,
                'start_date': start_date,
                'end_date': end_date,
                'start_time': None,
                'end_time': None,
                'website': source_url or None,
                'instagram': None,
                'price_info': None,
                'organizer': None,
                'source_url': source_url or url,
                'is_verified': True,
                'is_featured': False,
                'is_recurring': False,
                'categories': ['Antiquariato', 'Collezionismo'],
                'tags': ['neventum', event_type, 'fiera'],
            }

        if not found_on_page and page_num > 1:
            break
