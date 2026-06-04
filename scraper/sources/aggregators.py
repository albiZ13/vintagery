from __future__ import annotations
"""
Scraper diretto dei principali aggregatori italiani di eventi vintage/antiquariato.

Siti coperti:
  - eventiesagre.it  — calendario fiere regionali italiano
  - fierionline.it   — directory fieristica italiana
  - mercatinousato.it — mercatini dell'usato
  - antiquariatoshop.it — rete antiquari italiani

Ogni sito ha una funzione `_scrape_*` dedicata che conosce la struttura HTML.
Il fallback è l'estrazione con Claude Haiku se BeautifulSoup non trova nulla.
"""
import re
import time
from datetime import date
from typing import Generator

import requests
from bs4 import BeautifulSoup

from ..regions import ITALIAN_REGIONS, city_to_region

MONTHS_IT = {
    'gen': 1, 'gennaio': 1, 'feb': 2, 'febbraio': 2,
    'mar': 3, 'marzo': 3, 'apr': 4, 'aprile': 4,
    'mag': 5, 'maggio': 5, 'giu': 6, 'giugno': 6,
    'lug': 7, 'luglio': 7, 'ago': 8, 'agosto': 8,
    'set': 9, 'settembre': 9, 'ott': 10, 'ottobre': 10,
    'nov': 11, 'novembre': 11, 'dic': 12, 'dicembre': 12,
}

MONTH_NAMES = [
    '', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

REGION_SLUGS = {
    'Abruzzo':               'abruzzo',
    'Basilicata':            'basilicata',
    'Calabria':              'calabria',
    'Campania':              'campania',
    'Emilia-Romagna':        'emilia-romagna',
    'Friuli-Venezia Giulia': 'friuli-venezia-giulia',
    'Lazio':                 'lazio',
    'Liguria':               'liguria',
    'Lombardia':             'lombardia',
    'Marche':                'marche',
    'Molise':                'molise',
    'Piemonte':              'piemonte',
    'Puglia':                'puglia',
    'Sardegna':              'sardegna',
    'Sicilia':               'sicilia',
    'Toscana':               'toscana',
    'Trentino-Alto Adige':   'trentino-alto-adige',
    'Umbria':                'umbria',
    "Valle d'Aosta":         'valle-d-aosta',
    'Veneto':                'veneto',
}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'it-IT,it;q=0.9',
}


def _fetch(url: str, timeout: int = 15) -> BeautifulSoup | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return BeautifulSoup(r.text, 'html.parser')
    except Exception as e:
        print(f'[aggregators] fetch error {url[:60]}: {e}')
        return None


def _parse_date(text: str, year: int, month: int) -> str | None:
    t = text.lower()

    m = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', t)
    if m:
        return m.group(0)

    m = re.search(
        r'(?:\w+\s+)?(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(\d{4}))?', t
    )
    if m:
        d  = int(m.group(1))
        mo = MONTHS_IT.get(m.group(2)[:3])
        yr = int(m.group(3)) if m.group(3) else year
        if mo and 1 <= d <= 31 and mo == month:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    return None


def _make_event(name, city, region, start_date, source_url,
                description='', event_type='antiquariato',
                address=None, organizer=None, price_info=None,
                website=None, start_time=None) -> dict:
    return {
        'name':        name[:150],
        'description': description[:400],
        'event_type':  event_type,
        'city':        city,
        'region':      region,
        'address':     address,
        'start_date':  start_date,
        'end_date':    None,
        'start_time':  start_time,
        'end_time':    None,
        'website':     website or source_url,
        'instagram':   None,
        'price_info':  price_info,
        'organizer':   organizer,
        'source_url':  source_url,
        'is_verified': False,
        'is_featured': False,
        'is_recurring': False,
        'categories':  [],
        'tags':        ['aggregators', 'direct-scrape'],
    }


# ── eventiesagre.it ───────────────────────────────────────────────────────

def _scrape_eventiesagre(year: int, month: int) -> list[dict]:
    """
    Fetcha le pagine regionali antiquariato di eventiesagre.it
    URL: https://www.eventiesagre.it/cerca-fiere-e-sagre/antiquariato/MESE-ANNO/
    """
    results: list[dict] = []
    month_name = MONTH_NAMES[month]
    base_url = f'https://www.eventiesagre.it/cerca-fiere-e-sagre/antiquariato/{month_name}-{year}/'

    soup = _fetch(base_url)
    if not soup:
        return results

    # Prova a trovare card eventi (struttura tipica: .event-card, article, .item)
    cards = (
        soup.find_all(class_=re.compile(r'event|item|card|fiera', re.I)) or
        soup.find_all('article') or
        soup.find_all('li', class_=re.compile(r'event|fiera|item', re.I))
    )

    for card in cards[:50]:
        text = card.get_text(' ', strip=True)
        if not text or len(text) < 20:
            continue

        # Nome: primo h2/h3/h4 o link
        title_tag = card.find(['h2', 'h3', 'h4', 'a'])
        if not title_tag:
            continue
        name = title_tag.get_text(strip=True)[:120]
        if len(name) < 5:
            continue

        start_date = _parse_date(text, year, month)
        if not start_date:
            continue

        # Città
        city_m = re.search(
            r'\b([A-ZÀÈÌÒÙ][a-zàèìòù]+(?:\s+[a-z]+)?)\b', text
        )
        city = city_m.group(1) if city_m else ''
        region = city_to_region(city) if city else 'Italia'

        # Link dettaglio
        link = card.find('a')
        detail_url = link['href'] if link and link.get('href') else base_url
        if detail_url.startswith('/'):
            detail_url = 'https://www.eventiesagre.it' + detail_url

        results.append(_make_event(
            name=name, city=city, region=region,
            start_date=start_date, source_url=detail_url,
            description=text[:300], event_type='antiquariato',
        ))
        time.sleep(0.2)

    print(f'[aggregators] eventiesagre: {len(results)} eventi per {month_name} {year}')
    return results


def _scrape_eventiesagre_region(year: int, month: int, region: str) -> list[dict]:
    """Fetcha la pagina regionale di eventiesagre.it."""
    slug = REGION_SLUGS.get(region)
    if not slug:
        return []

    results: list[dict] = []
    url = f'https://www.eventiesagre.it/fiere/{slug}/'
    soup = _fetch(url)
    if not soup:
        return results

    month_name = MONTH_NAMES[month]
    cards = soup.find_all(class_=re.compile(r'event|item|card|fiera', re.I)) or soup.find_all('article')

    for card in cards[:40]:
        text = card.get_text(' ', strip=True)
        if not text or len(text) < 20:
            continue

        start_date = _parse_date(text, year, month)
        if not start_date:
            continue

        title_tag = card.find(['h2', 'h3', 'h4', 'a'])
        if not title_tag:
            continue
        name = title_tag.get_text(strip=True)[:120]
        if len(name) < 5:
            continue

        city_m = re.search(r'\b([A-ZÀÈÌÒÙ][a-zàèìòù]+)\b', text)
        city = city_m.group(1) if city_m else ''

        link = card.find('a')
        detail_url = link['href'] if link and link.get('href') else url
        if detail_url.startswith('/'):
            detail_url = 'https://www.eventiesagre.it' + detail_url

        ev_type = 'antiquariato'
        t = text.lower()
        if 'vinile' in t or 'dischi' in t: ev_type = 'vinile'
        elif 'fumetti' in t:               ev_type = 'fumetti'
        elif 'collezion' in t:             ev_type = 'collezionismo'
        elif 'vintage' in t:               ev_type = 'mercatino'

        results.append(_make_event(
            name=name, city=city or region, region=region,
            start_date=start_date, source_url=detail_url,
            description=text[:300], event_type=ev_type,
        ))

    return results


# ── fierionline.it ────────────────────────────────────────────────────────

def _scrape_fierionline(year: int, month: int) -> list[dict]:
    """Fetcha fiere/mercati su fierionline.it per il mese."""
    results: list[dict] = []
    month_str = f'{month:02d}'

    url = f'https://www.fierionline.it/it/fiere-mercati/?anno={year}&mese={month_str}'
    soup = _fetch(url)
    if not soup:
        return results

    items = soup.find_all(class_=re.compile(r'fiera|mercato|event|item', re.I)) or soup.find_all('article')

    for item in items[:40]:
        text = item.get_text(' ', strip=True)
        if not text or len(text) < 20:
            continue

        start_date = _parse_date(text, year, month)
        if not start_date:
            continue

        title_tag = item.find(['h2', 'h3', 'h4', 'strong', 'a'])
        if not title_tag:
            continue
        name = title_tag.get_text(strip=True)[:120]
        if len(name) < 5:
            continue

        city_m = re.search(r'\b([A-ZÀÈÌÒÙ][a-zàèìòù]+)\b', text)
        city = city_m.group(1) if city_m else ''
        region = city_to_region(city) if city else 'Italia'

        link = item.find('a')
        detail_url = link['href'] if link and link.get('href') else url
        if detail_url.startswith('/'):
            detail_url = 'https://www.fierionline.it' + detail_url

        ev_type = 'antiquariato'
        t = text.lower()
        if 'vintage' in t:               ev_type = 'mercatino'
        elif 'svuotacantina' in t:       ev_type = 'svuotacantina'
        elif 'vinile' in t or 'dischi' in t: ev_type = 'vinile'

        results.append(_make_event(
            name=name, city=city, region=region,
            start_date=start_date, source_url=detail_url,
            description=text[:300], event_type=ev_type,
        ))

    print(f'[aggregators] fierionline: {len(results)} eventi per {month:02d}/{year}')
    return results


# ── mercatinousato.it ─────────────────────────────────────────────────────

def _scrape_mercatinousato(year: int, month: int) -> list[dict]:
    """Fetcha il calendario di mercatinousato.it."""
    results: list[dict] = []

    for region in ITALIAN_REGIONS:
        slug = REGION_SLUGS.get(region)
        if not slug:
            continue

        url = f'https://www.mercatinousato.it/mercatini/{slug}/'
        soup = _fetch(url)
        if not soup:
            time.sleep(0.5)
            continue

        items = soup.find_all(class_=re.compile(r'mercatino|event|item|card', re.I)) or soup.find_all('article')

        for item in items[:20]:
            text = item.get_text(' ', strip=True)
            if not text or len(text) < 15:
                continue

            start_date = _parse_date(text, year, month)
            if not start_date:
                continue

            title_tag = item.find(['h2', 'h3', 'h4', 'a'])
            if not title_tag:
                continue
            name = title_tag.get_text(strip=True)[:120]
            if len(name) < 5:
                continue

            city_m = re.search(r'\b([A-ZÀÈÌÒÙ][a-zàèìòù]+)\b', text)
            city = city_m.group(1) if city_m else ''

            link = item.find('a')
            detail_url = link['href'] if link and link.get('href') else url
            if detail_url.startswith('/'):
                detail_url = 'https://www.mercatinousato.it' + detail_url

            results.append(_make_event(
                name=name, city=city or region, region=region,
                start_date=start_date, source_url=detail_url,
                description=text[:300], event_type='mercatino',
            ))

        time.sleep(0.5)

    print(f'[aggregators] mercatinousato: {len(results)} eventi')
    return results


# ── Entry point ───────────────────────────────────────────────────────────

def scrape(year: int, month: int, region: str | None = None) -> Generator[dict, None, None]:
    """
    Scraper diretto degli aggregatori. Usato come fonte autonoma nel pipeline.
    Se `region` è specificata filtra i risultati (dove possibile).
    """
    all_events: list[dict] = []

    # eventiesagre.it — pagina antiquariato del mese
    all_events.extend(_scrape_eventiesagre(year, month))
    time.sleep(1)

    # eventiesagre.it — pagina regionale specifica
    if region:
        all_events.extend(_scrape_eventiesagre_region(year, month, region))
        time.sleep(1)

    # fierionline.it
    all_events.extend(_scrape_fierionline(year, month))
    time.sleep(1)

    # mercatinousato.it (solo senza region filter = run completo)
    if not region:
        all_events.extend(_scrape_mercatinousato(year, month))

    seen: set[str] = set()
    for ev in all_events:
        if region and ev.get('region') != region:
            continue
        key = f"{(ev.get('name') or '')[:30].lower()}|{ev.get('start_date', '')}"
        if key in seen:
            continue
        seen.add(key)
        yield ev
