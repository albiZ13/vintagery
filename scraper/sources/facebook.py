from __future__ import annotations
"""
Scraper for public Facebook groups — svuotacantine, svendite private, vintage.

Targets public groups whose posts are visible without login.
Uses PlayWrightFetcher for JS rendering with stealth headers.

NOTE: Requires `scrapling install` to install Playwright browsers.
      Only scrapes PUBLIC groups. Never stores credentials.
"""
import re
from datetime import date, datetime, timedelta
from typing import Generator

from scrapling.fetchers import PlayWrightFetcher

from ..regions import city_to_region

# Public Italian Facebook groups focused on svuotacantine/svendite/vintage
# These must be public (visible without login)
PUBLIC_GROUPS = [
    {
        'url': 'https://www.facebook.com/groups/svuotacantine.italia/',
        'event_type': 'svuotacantina',
        'region_hint': None,
    },
    {
        'url': 'https://www.facebook.com/groups/mercatinodellarcipelago/',
        'event_type': 'mercatino',
        'region_hint': 'Toscana',
    },
    {
        'url': 'https://www.facebook.com/groups/svuotacantinemilano/',
        'event_type': 'svuotacantina',
        'region_hint': 'Lombardia',
    },
    {
        'url': 'https://www.facebook.com/groups/svuotacantinetorino/',
        'event_type': 'svuotacantina',
        'region_hint': 'Piemonte',
    },
    {
        'url': 'https://www.facebook.com/groups/svuotacantineroma/',
        'event_type': 'svuotacantina',
        'region_hint': 'Lazio',
    },
    {
        'url': 'https://www.facebook.com/groups/svuotacantinenord/',
        'event_type': 'svuotacantina',
        'region_hint': None,
    },
    {
        'url': 'https://www.facebook.com/groups/vendita.privata.vintage.italia/',
        'event_type': 'svendita',
        'region_hint': None,
    },
]

MONTHS_IT = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12,
}

DATE_PATTERNS = [
    # "31 maggio 2026" or "31 maggio"
    r'(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*(\d{4})?',
    # "31/05/2026" or "31-05-2026"
    r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})',
    # "domenica 31 maggio" (day name + date)
    r'(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)',
]

EVENT_KEYWORDS = [
    'svuotacantina', 'svendita', 'vendita', 'mercatino', 'vintage',
    'antiquariato', 'usato', 'seconda mano', 'garage sale',
    'liquidazione', 'stock', 'occasione',
]


def _extract_date(text: str, target_year: int) -> str | None:
    text_lower = text.lower()

    # "31/05/2026"
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})', text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        return f'{y:04d}-{mo:02d}-{d:02d}'

    # "31 maggio 2026" or "31 maggio"
    m = re.search(
        r'(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*(\d{4})?',
        text_lower
    )
    if m:
        d = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2))
        y = int(m.group(3)) if m.group(3) else target_year
        if mo:
            return f'{y:04d}-{mo:02d}-{d:02d}'

    return None


def _extract_city(text: str) -> str | None:
    # "a Milano", "a Roma", "in via X, Bologna"
    m = re.search(r'\ba\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s+[a-z]+)?)\b', text)
    if m:
        return m.group(1)
    # City after address: "Via X 5, Bologna"
    m = re.search(r',\s*([A-ZÀÈÌÒÙ][a-zàèìòù]+)\b', text)
    if m:
        return m.group(1)
    return None


def _extract_address(text: str) -> str | None:
    m = re.search(
        r'((?:Via|Piazza|Corso|Largo|Viale|Strada)\s+[^\n,]{3,60})',
        text, re.IGNORECASE
    )
    return m.group(1).strip() if m else None


def _has_event_keyword(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in EVENT_KEYWORDS)


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = PlayWrightFetcher(auto_match=False)
    seen: set[str] = set()

    for group in PUBLIC_GROUPS:
        try:
            page = fetcher.fetch(
                group['url'],
                headless=True,
                network_idle=True,
                timeout=20000,
                wait=3000,
            )
        except Exception as e:
            print(f'[facebook] {group["url"]} error: {e}')
            continue

        # Facebook renders posts as articles or divs with role="article"
        posts = (
            page.css('[role="article"]') or
            page.css('div[data-pagelet*="FeedUnit"]') or
            page.css('div[class*="story"]')
        )

        if not posts:
            # Fallback: extract all text blocks and look for event keywords
            text = page.get_all_text(ignore_tags=('script', 'style', 'nav'))
            blocks = [b.strip() for b in text.split('\n\n') if len(b.strip()) > 50]
            posts = [type('Post', (), {'get_all_text': lambda self, **kw: b})() for b in blocks]

        for post in posts:
            try:
                text = post.get_all_text(ignore_tags=('script', 'style')) if callable(getattr(post, 'get_all_text', None)) else str(post)
            except Exception:
                continue

            if not _has_event_keyword(text):
                continue

            start_date = _extract_date(text, target_year)
            if not start_date:
                continue

            try:
                d = date.fromisoformat(start_date)
                if d.year != target_year or d.month != target_month:
                    continue
            except ValueError:
                continue

            # Deduplicate by date+snippet
            key = f'{start_date}:{text[:80]}'
            if key in seen:
                continue
            seen.add(key)

            city = _extract_city(text)
            region = city_to_region(city) if city else group.get('region_hint') or 'Italia'
            address = _extract_address(text)

            # Name: first meaningful line (max 80 chars)
            name_line = next((l.strip() for l in text.split('\n') if len(l.strip()) > 10), text[:80])
            name = name_line[:80].rstrip(',.:')

            event_type = group['event_type']
            if 'vintage' in text.lower():
                event_type = 'mercatino'
            if 'svuotacantina' in text.lower():
                event_type = 'svuotacantina'
            if 'svendita' in text.lower() or 'liquidazi' in text.lower():
                event_type = 'svendita'

            yield {
                'name':        name,
                'description': text[:300].strip(),
                'event_type':  event_type,
                'city':        city or 'Italia',
                'region':      region,
                'address':     address,
                'start_date':  start_date,
                'end_date':    None,
                'start_time':  None,
                'end_time':    None,
                'website':     group['url'],
                'instagram':   None,
                'price_info':  None,
                'organizer':   None,
                'source_url':  group['url'],
                'is_verified': False,
                'is_featured': False,
                'is_recurring': False,
                'categories':  ['Vintage', 'Usato'],
                'tags':        ['facebook', event_type, 'privato'],
            }
