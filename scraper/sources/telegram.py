from __future__ import annotations
"""
Scraper for public Telegram channels — svuotacantine, svendite, vintage events.
Uses Scrapling's StealthyFetcher on t.me/s/{channel} (public preview URLs).
Requires NO login. Only public channels accessible without account.
Confidence: 0.30 — posts are informal, dates often implicit.
"""
import re
from datetime import date
from typing import Generator
from scrapling.fetchers import StealthyFetcher
from ..regions import city_to_region

# Public Telegram channels focused on Italian vintage/svuotacantine
# t.me/s/{username} is the public web preview — accessible without login
PUBLIC_CHANNELS = [
    {'username': 'svuotacantinenews',    'event_type': 'svuotacantina', 'region': None},
    {'username': 'mercatinivintage',     'event_type': 'mercatino',     'region': None},
    {'username': 'vintageitalia',        'event_type': 'mercatino',     'region': None},
    {'username': 'svuotacantinemilano',  'event_type': 'svuotacantina', 'region': 'Lombardia'},
    {'username': 'vintageromaevents',    'event_type': 'mercatino',     'region': 'Lazio'},
    {'username': 'mercatiniroma',        'event_type': 'mercatino',     'region': 'Lazio'},
    {'username': 'antiquariatotoscana',  'event_type': 'antiquariato',  'region': 'Toscana'},
    {'username': 'fumettifiere',         'event_type': 'fumetti',       'region': None},
    {'username': 'vinylfairs_italy',     'event_type': 'vinili',        'region': None},
]

MONTHS_IT = {
    'gennaio':1,'febbraio':2,'marzo':3,'aprile':4,'maggio':5,'giugno':6,
    'luglio':7,'agosto':8,'settembre':9,'ottobre':10,'novembre':11,'dicembre':12,
}

EVENT_KEYWORDS = [
    'svuotacantina','svendita','mercatino','mercato','fiera','vintage','antiquariato',
    'kilo','vinile','fumetti','collezionismo','memorabilia','record fair',
]


def _extract_date(text: str, target_year: int) -> str | None:
    # "31/05/2026" or "31.05.2026"
    m = re.search(r'(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})', text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f'{y:04d}-{mo:02d}-{d:02d}'
    # "31 maggio 2026" or "31 maggio"
    m = re.search(
        r'(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*(\d{4})?',
        text.lower()
    )
    if m:
        d = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2))
        y = int(m.group(3)) if m.group(3) else target_year
        if mo:
            return f'{y:04d}-{mo:02d}-{d:02d}'
    return None


def _has_event_kw(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in EVENT_KEYWORDS)


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    fetcher = StealthyFetcher()
    seen: set[str] = set()

    for ch in PUBLIC_CHANNELS:
        url = f'https://t.me/s/{ch["username"]}'
        try:
            page = fetcher.fetch(url, headless=True, network_idle=True, timeout=15000)
        except Exception as e:
            print(f'[telegram] {ch["username"]} error: {e}')
            continue

        # Telegram web preview: messages in div.tgme_widget_message_text
        messages = (
            page.css('div.tgme_widget_message_text') or
            page.css('div[class*="message_text"]') or
            page.css('div[class*="message"]')
        )

        for msg in messages:
            text = msg.get_all_text(ignore_tags=('script', 'style')).strip()
            if len(text) < 20 or not _has_event_kw(text):
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

            key = f'{start_date}:{text[:60]}'
            if key in seen:
                continue
            seen.add(key)

            city_m = re.search(r'\ba\s+([A-ZÀÈÌÒÙ][a-zàèìòù]+)\b', text)
            city = city_m.group(1) if city_m else 'Italia'
            region = ch.get('region') or city_to_region(city)

            addr_m = re.search(
                r'((?:Via|Piazza|Corso|Largo|Viale)\s+[^\n,]{3,60})', text, re.IGNORECASE
            )
            address = addr_m.group(1).strip() if addr_m else None

            name_line = next((l.strip() for l in text.split('\n') if len(l.strip()) > 8), text[:80])
            name = name_line[:120].rstrip('.,: ')

            time_m = re.search(r'(\d{1,2}):(\d{2})', text)
            start_time = f'{int(time_m.group(1)):02d}:{time_m.group(2)}' if time_m else None

            yield {
                'name':        name,
                'description': text[:400],
                'event_type':  ch['event_type'],
                'city':        city,
                'region':      region,
                'address':     address,
                'start_date':  start_date,
                'end_date':    None,
                'start_time':  start_time,
                'end_time':    None,
                'website':     url,
                'instagram':   None,
                'price_info':  None,
                'organizer':   None,
                'source_url':  url,
                'is_verified': False,
                'is_featured': False,
                'is_recurring': False,
                'categories':  [],
                'tags':        ['telegram', ch['event_type'], ch['username']],
            }
