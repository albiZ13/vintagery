from __future__ import annotations
"""
Scraper for Italian regional tourism portals, municipal event calendars,
and national event aggregators covering all 20 Italian regions.

Sources per tier:
  Tier 1 — Regional tourism portals (official, high confidence): 0.80
  Tier 2 — Event aggregators (curated, medium confidence): 0.65
  Tier 3 — Municipal calendars (official but sparse): 0.75

Targets:
  - 2night.it     — national nightlife/events aggregator, covers all regions
  - eventiesagre.it — sagre & local events
  - iovadoevento.it — Lombardia + Piemonte aggregator
  - mercatiniditalia.it — mercatini directory
  - sagre.it — national sagre/markets database
  - Regional tourism portals for Toscana, Lazio, Veneto, Piemonte, Emilia-Romagna
  - Municipal sites: comune.firenze.it, comune.bologna.it, comune.napoli.it
"""
import re
from datetime import date, datetime
from typing import Generator

from scrapling.fetchers import Fetcher, StealthyFetcher

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

KEYWORD_TO_TYPE = {
    'vintage':       'mercatino',
    'mercatino':     'mercatino',
    'mercatini':     'mercatino',
    'mercato':       'mercatino',
    'antiquariato':  'antiquariato',
    'antichità':     'antiquariato',
    'antico':        'antiquariato',
    'vinokilo':      'vinokilo',
    'kilo':          'vinokilo',
    'svuotacantina': 'svuotacantina',
    'svendita':      'svendita',
    'fumetti':       'fumetti',
    'vinili':        'vinili',
    'vinile':        'vinili',
    'vinyl':         'vinili',
    'memorabilia':   'memorabilia',
    'collezionismo': 'collezionismo',
    'numismatica':   'collezionismo',
    'collezion':     'collezionismo',
}

EVENT_KEYWORDS = {
    'mercatino', 'vintage', 'antiquariato', 'antichità', 'svuotacantina',
    'svendita', 'fumetti', 'vinili', 'vinokilo', 'memorabilia',
    'collezionismo', 'fiera', 'mercato', 'pulci', 'rigattiere',
    'usato', 'second hand', 'retro', 'brocante',
}


def _guess_type(text: str) -> str:
    t = text.lower()
    for kw, etype in KEYWORD_TO_TYPE.items():
        if kw in t:
            return etype
    return 'mercatino'


def _parse_date_it(text: str, target_year: int) -> str | None:
    """Parse Italian date formats: '31 maggio 2026', '31 mag', '31/05/2026'."""
    t = text.strip().lower()
    # Full ISO
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', t)
    if m:
        return f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
    # dd/mm/yyyy
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', t)
    if m:
        return f'{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}'
    # dd month [yyyy]  (e.g. "31 maggio 2026" or "31 maggio")
    m = re.search(r'(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(\d{4}))?', t)
    if m:
        day = int(m.group(1))
        mo_word = m.group(2)[:3]
        mo = MONTHS_IT.get(mo_word)
        yr = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31:
            return f'{yr:04d}-{mo:02d}-{day:02d}'
    return None


def _is_relevant(name: str, description: str = '') -> bool:
    combined = (name + ' ' + description).lower()
    return any(kw in combined for kw in EVENT_KEYWORDS)


def _make_event(name: str, city: str, start_date: str, end_date: str | None = None,
                address: str | None = None, description: str | None = None,
                website: str | None = None, price_info: str | None = None,
                start_time: str | None = None, end_time: str | None = None,
                source_tag: str = 'comuni') -> dict:
    return {
        'name':        name[:150],
        'description': description,
        'event_type':  _guess_type(name + ' ' + (description or '')),
        'city':        city,
        'region':      city_to_region(city),
        'address':     address,
        'start_date':  start_date,
        'end_date':    end_date,
        'start_time':  start_time,
        'end_time':    end_time,
        'website':     website,
        'instagram':   None,
        'price_info':  price_info,
        'organizer':   None,
        'source_url':  website,
        'is_verified': False,
        'is_featured': False,
        'is_recurring': False,
        'categories':  [],
        'tags':        ['comuni', source_tag],
    }


# ─── Source 1: mercatiniditalia.it ────────────────────────────────────────────

def _scrape_mercatiniditalia(target_year: int, target_month: int) -> list[dict]:
    """mercatiniditalia.it — Italian mercatini/vintage directory."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)
    base = 'https://www.mercatiniditalia.it'

    month_str = f'{target_month:02d}'
    urls = [
        f'{base}/regione/',
    ]

    # Try region-based listing pages
    regions_slugs = [
        'lombardia', 'piemonte', 'toscana', 'lazio', 'veneto',
        'emilia-romagna', 'campania', 'puglia', 'sicilia', 'sardegna',
        'liguria', 'marche', 'abruzzo', 'umbria', 'friuli-venezia-giulia',
        'trentino-alto-adige', 'calabria', 'basilicata', 'molise',
        'valle-daosta',
    ]

    for region_slug in regions_slugs[:8]:  # limit to avoid rate limiting
        url = f'{base}/regione/{region_slug}/'
        try:
            page = fetcher.fetch(url)
            html = str(page.content) if hasattr(page, 'content') else str(page)
            # Extract event card links and titles
            cards = re.findall(
                r'href="(/mercatino/[^"]+)"[^>]*>.*?<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,100})',
                html, re.DOTALL
            )
            for path, name in cards[:20]:
                name = re.sub(r'\s+', ' ', name).strip()
                if not _is_relevant(name):
                    continue
                # Try to get city from URL slug
                city_match = re.search(r'/mercatino/[^/]+-([a-z\-]+)/', path)
                city = city_match.group(1).replace('-', ' ').title() if city_match else region_slug.title()
                events.append(_make_event(
                    name=name,
                    city=city,
                    start_date=f'{target_year}-{month_str}-01',
                    website=base + path,
                    source_tag='mercatiniditalia',
                ))
        except Exception as e:
            print(f'[comuni/mercatiniditalia] {region_slug}: {e}')

    return events


# ─── Source 2: eventiesagre.it ────────────────────────────────────────────────

def _scrape_eventiesagre(target_year: int, target_month: int) -> list[dict]:
    """eventiesagre.it — sagre, fiere, mercatini italiani per mese."""
    events: list[dict] = []
    fetcher = StealthyFetcher(auto_match=False)

    month_names_it = [
        '', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ]
    month_name = month_names_it[target_month]
    url = f'https://www.eventiesagre.it/mercatini/{month_name}-{target_year}/'

    try:
        page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
        html = str(page.html_content) if hasattr(page, 'html_content') else ''
        if not html:
            return events

        # Find event blocks: <div class="event-item"> or similar
        # Pattern: title, city, date in structured HTML
        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*event[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )

        for block in blocks[:50]:
            title_m = re.search(r'<h[23][^>]*>([^<]{5,120})</h[23]>', block, re.IGNORECASE)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})', block, re.IGNORECASE)
            if not date_m:
                continue
            start_date = _parse_date_it(date_m.group(0), target_year)
            if not start_date:
                continue

            city_m = re.search(r'<[^>]*class="[^"]*(?:city|luogo|comune|location)[^"]*"[^>]*>([^<]{2,50})<', block, re.IGNORECASE)
            city = city_m.group(1).strip() if city_m else 'Italia'

            link_m = re.search(r'href="(https?://[^"]+)"', block)
            website = link_m.group(1) if link_m else url

            events.append(_make_event(
                name=name, city=city, start_date=start_date,
                website=website, source_tag='eventiesagre',
            ))

    except Exception as e:
        print(f'[comuni/eventiesagre] {e}')

    return events


# ─── Source 3: 2night.it ──────────────────────────────────────────────────────

def _scrape_2night(target_year: int, target_month: int) -> list[dict]:
    """2night.it — events aggregator covering all Italian cities."""
    events: list[dict] = []
    fetcher = StealthyFetcher(auto_match=False)

    cities = [
        ('milano', 'Milano'), ('roma', 'Roma'), ('napoli', 'Napoli'),
        ('torino', 'Torino'), ('bologna', 'Bologna'), ('firenze', 'Firenze'),
        ('venezia', 'Venezia'), ('bari', 'Bari'), ('palermo', 'Palermo'),
        ('catania', 'Catania'), ('genova', 'Genova'), ('verona', 'Verona'),
    ]

    search_terms = ['mercatino+vintage', 'antiquariato', 'svuotacantina', 'mercatino']

    for city_slug, city_name in cities[:6]:
        for term in search_terms[:2]:
            url = f'https://www.2night.it/{city_slug}/eventi?q={term}'
            try:
                page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
                html = str(page.html_content) if hasattr(page, 'html_content') else ''
                if not html:
                    continue

                blocks = re.findall(
                    r'<(?:article|div|li)[^>]*class="[^"]*(?:event|card)[^"]*"[^>]*>(.*?)</(?:article|div|li)>',
                    html, re.DOTALL | re.IGNORECASE
                )
                for block in blocks[:15]:
                    title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
                    if not title_m:
                        continue
                    name = title_m.group(1).strip()
                    if not _is_relevant(name):
                        continue

                    date_m = re.search(r'(\d{1,2})[/\-\s](\d{1,2})[/\-\s](\d{2,4})', block)
                    if not date_m:
                        # try text date
                        date_m2 = re.search(r'(\d{1,2})\s+([a-z]{3,9})', block, re.IGNORECASE)
                        if date_m2:
                            start_date = _parse_date_it(date_m2.group(0), target_year)
                        else:
                            continue
                    else:
                        d, mo, yr = date_m.groups()
                        yr_int = int(yr) if len(yr) == 4 else 2000 + int(yr)
                        start_date = f'{yr_int:04d}-{int(mo):02d}-{int(d):02d}'

                    if not start_date:
                        continue
                    try:
                        pd = date.fromisoformat(start_date)
                        if pd.month != target_month or pd.year != target_year:
                            continue
                    except ValueError:
                        continue

                    link_m = re.search(r'href="(https?://[^"]+)"', block)
                    website = link_m.group(1) if link_m else url

                    events.append(_make_event(
                        name=name, city=city_name, start_date=start_date,
                        website=website, source_tag='2night',
                    ))

            except Exception as e:
                print(f'[comuni/2night] {city_slug}/{term}: {e}')

    return events


# ─── Source 4: turismo.intoscana.it ───────────────────────────────────────────

def _scrape_intoscana(target_year: int, target_month: int) -> list[dict]:
    """Regione Toscana official tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.turismo.intoscana.it/allthingstuscany/eventi/'
        f'?month={target_year}-{target_month:02d}'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*(?:event|card)[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:30]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', block, re.IGNORECASE)
            if not date_m:
                continue
            start_date = _parse_date_it(date_m.group(0), target_year)
            if not start_date:
                continue

            city_m = re.search(r'<[^>]*(?:city|comune|location)[^>]*>([^<]{2,40})<', block, re.IGNORECASE)
            city = city_m.group(1).strip() if city_m else 'Toscana'

            link_m = re.search(r'href="(https?://[^"]+)"', block)
            website = link_m.group(1) if link_m else url

            events.append(_make_event(
                name=name, city=city, start_date=start_date,
                website=website, source_tag='intoscana',
            ))
    except Exception as e:
        print(f'[comuni/intoscana] {e}')

    return events


# ─── Source 5: emiliaromagnaturismo.it ────────────────────────────────────────

def _scrape_emiliaromagna(target_year: int, target_month: int) -> list[dict]:
    """Emilia-Romagna regional tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.emiliaromagnaturismo.it/it/eventi'
        f'?dateFrom={target_year}-{target_month:02d}-01'
        f'&dateTo={target_year}-{target_month:02d}-31'
        f'&category=mercati'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*class="[^"]*(?:title|name)[^"]*"[^>]*>([^<]{5,120})</h[2-4]>',
            html, re.IGNORECASE
        )
        for name in title_blocks[:20]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Emilia-Romagna',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='emiliaromagna',
            ))
    except Exception as e:
        print(f'[comuni/emiliaromagna] {e}')

    return events


# ─── Source 6: viaggiareinpuglia.it ───────────────────────────────────────────

def _scrape_puglia(target_year: int, target_month: int) -> list[dict]:
    """Puglia regional tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.viaggiareinpuglia.it/at/5/eventi'
        f'?data={target_year}-{target_month:02d}-01'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*event[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:25]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            city_m = re.search(r'<[^>]*(?:city|comune|location)[^>]*>([^<]{2,40})<', block, re.IGNORECASE)
            city = city_m.group(1).strip() if city_m else 'Puglia'

            date_m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', block)
            if date_m:
                start_date = f'{date_m.group(3)}-{int(date_m.group(2)):02d}-{int(date_m.group(1)):02d}'
            else:
                start_date = f'{target_year}-{target_month:02d}-01'

            link_m = re.search(r'href="(https?://[^"]+)"', block)
            website = link_m.group(1) if link_m else url

            events.append(_make_event(
                name=name, city=city, start_date=start_date,
                website=website, source_tag='puglia',
            ))
    except Exception as e:
        print(f'[comuni/puglia] {e}')

    return events


# ─── Source 7: turismoroma.it ─────────────────────────────────────────────────

def _scrape_turismoroma(target_year: int, target_month: int) -> list[dict]:
    """Rome official tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.turismoroma.it/it/eventi'
        f'?field_periodo_value%5Bvalue%5D%5Byear%5D={target_year}'
        f'&field_periodo_value%5Bvalue%5D%5Bmonth%5D={target_month}'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*(?:event|views-row)[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:25]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', block, re.IGNORECASE)
            start_date = _parse_date_it(date_m.group(0), target_year) if date_m else f'{target_year}-{target_month:02d}-01'

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.turismoroma.it{path}'

            events.append(_make_event(
                name=name, city='Roma', start_date=start_date,
                website=website, source_tag='turismoroma',
            ))
    except Exception as e:
        print(f'[comuni/turismoroma] {e}')

    return events


# ─── Source 8: comune.firenze.it ──────────────────────────────────────────────

def _scrape_comune_firenze(target_year: int, target_month: int) -> list[dict]:
    """Municipality of Florence — official event calendar."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.comune.fi.it/agenda'
        f'?field_data_value[value][year]={target_year}'
        f'&field_data_value[value][month]={target_month:02d}'
        f'&field_tag_target_id=mercato'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*(?:event|agenda)[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:20]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})[/\.\-](\d{1,2})[/\.\-](\d{4})', block)
            if date_m:
                start_date = f'{date_m.group(3)}-{int(date_m.group(2)):02d}-{int(date_m.group(1)):02d}'
            else:
                start_date = f'{target_year}-{target_month:02d}-01'

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.comune.fi.it{path}'

            events.append(_make_event(
                name=name, city='Firenze', start_date=start_date,
                website=website, source_tag='comune_firenze',
            ))
    except Exception as e:
        print(f'[comuni/firenze] {e}')

    return events


# ─── Source 9: comune.bologna.it ──────────────────────────────────────────────

def _scrape_comune_bologna(target_year: int, target_month: int) -> list[dict]:
    """Municipality of Bologna — event calendar."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.comune.bologna.it/vivere-bologna/agenda?anno={target_year}&mese={target_month:02d}'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div|li)[^>]*class="[^"]*(?:event|agenda|card)[^"]*"[^>]*>(.*?)</(?:article|div|li)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:20]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})[/\.\-](\d{1,2})[/\.\-](\d{4})', block)
            if date_m:
                start_date = f'{date_m.group(3)}-{int(date_m.group(2)):02d}-{int(date_m.group(1)):02d}'
            else:
                start_date = f'{target_year}-{target_month:02d}-01'

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.comune.bologna.it{path}'

            events.append(_make_event(
                name=name, city='Bologna', start_date=start_date,
                website=website, source_tag='comune_bologna',
            ))
    except Exception as e:
        print(f'[comuni/bologna] {e}')

    return events


# ─── Source 10: eventbrite.it regional search (complementary) ─────────────────

def _scrape_yesmilano(target_year: int, target_month: int) -> list[dict]:
    """YesMilano (Milan DMO) — official Milan events portal."""
    events: list[dict] = []
    fetcher = StealthyFetcher(auto_match=False)

    url = (
        f'https://www.yesmilano.it/eventi'
        f'?start={target_year}-{target_month:02d}-01'
        f'&end={target_year}-{target_month:02d}-31'
        f'&keyword=mercatino'
    )
    try:
        page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
        html = str(page.html_content) if hasattr(page, 'html_content') else ''
        if not html:
            return events

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*(?:event|card)[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:20]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})[/\.\-](\d{1,2})[/\.\-](\d{4})', block)
            if date_m:
                start_date = f'{date_m.group(3)}-{int(date_m.group(2)):02d}-{int(date_m.group(1)):02d}'
            else:
                start_date = f'{target_year}-{target_month:02d}-01'

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.yesmilano.it{path}'

            events.append(_make_event(
                name=name, city='Milano', start_date=start_date,
                website=website, source_tag='yesmilano',
            ))
    except Exception as e:
        print(f'[comuni/yesmilano] {e}')

    return events


# ─── Source 11: turismovenezia.it ─────────────────────────────────────────────

def _scrape_venezia(target_year: int, target_month: int) -> list[dict]:
    """Venice official tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.turismovenezia.it/Venezia/Mercatini-e-fiere-6118.html'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div|li)[^>]*class="[^"]*(?:event|item)[^"]*"[^>]*>(.*?)</(?:article|div|li)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:20]:
            title_m = re.search(r'<(?:h[2-4]|strong)[^>]*>([^<]{5,120})</(?:h[2-4]|strong)>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            date_m = re.search(r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', block, re.IGNORECASE)
            start_date = _parse_date_it(date_m.group(0), target_year) if date_m else f'{target_year}-{target_month:02d}-01'
            if not start_date:
                continue
            try:
                pd = date.fromisoformat(start_date)
                if pd.month != target_month or pd.year != target_year:
                    continue
            except ValueError:
                continue

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.turismovenezia.it{path}'

            events.append(_make_event(
                name=name, city='Venezia', start_date=start_date,
                website=website, source_tag='venezia',
            ))
    except Exception as e:
        print(f'[comuni/venezia] {e}')

    return events


# ─── Source 12: piemonteitalia.eu ─────────────────────────────────────────────

def _scrape_piemonte(target_year: int, target_month: int) -> list[dict]:
    """Piemonte regional tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.piemonteitalia.eu/it/eventi'
        f'?dateFrom={target_year}-{target_month:02d}-01'
        f'&categories=mercati-e-fiere'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*(?:event|card)[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:25]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            city_m = re.search(r'<[^>]*(?:city|comune|luogo)[^>]*>([^<]{2,40})<', block, re.IGNORECASE)
            city = city_m.group(1).strip() if city_m else 'Piemonte'

            date_m = re.search(r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', block, re.IGNORECASE)
            start_date = _parse_date_it(date_m.group(0), target_year) if date_m else f'{target_year}-{target_month:02d}-01'

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.piemonteitalia.eu{path}'

            events.append(_make_event(
                name=name, city=city, start_date=start_date,
                website=website, source_tag='piemonte',
            ))
    except Exception as e:
        print(f'[comuni/piemonte] {e}')

    return events


# ─── Source 13: visitnaples.eu / Campania ─────────────────────────────────────

def _scrape_campania(target_year: int, target_month: int) -> list[dict]:
    """Campania / Naples events portal."""
    events: list[dict] = []
    fetcher = StealthyFetcher(auto_match=False)

    searches = [
        ('https://www.napoliunplugged.com/category/markets', 'Napoli'),
    ]

    for url, city in searches:
        try:
            page = fetcher.fetch(url, headless=True, network_idle=True, wait=2000)
            html = str(page.html_content) if hasattr(page, 'html_content') else ''
            if not html:
                continue

            blocks = re.findall(
                r'<(?:article|div)[^>]*class="[^"]*(?:post|event|card)[^"]*"[^>]*>(.*?)</(?:article|div)>',
                html, re.DOTALL | re.IGNORECASE
            )
            for block in blocks[:20]:
                title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
                if not title_m:
                    continue
                name = title_m.group(1).strip()
                if not _is_relevant(name):
                    continue

                link_m = re.search(r'href="(https?://[^"]+)"', block)
                website = link_m.group(1) if link_m else url

                events.append(_make_event(
                    name=name, city=city,
                    start_date=f'{target_year}-{target_month:02d}-01',
                    website=website, source_tag='campania',
                ))
        except Exception as e:
            print(f'[comuni/campania] {city}: {e}')

    return events


# ─── Source 14: visitsicily.info ──────────────────────────────────────────────

def _scrape_sicilia(target_year: int, target_month: int) -> list[dict]:
    """Sicily official tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.visitsicily.info/it/eventi/?'
        f'period={target_year}-{target_month:02d}'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', html, re.IGNORECASE
        )
        for name in title_blocks[:30]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Sicilia',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='sicilia',
            ))
    except Exception as e:
        print(f'[comuni/sicilia] {e}')

    return events


# ─── Source 15: sardegnaturismo.it ────────────────────────────────────────────

def _scrape_sardegna(target_year: int, target_month: int) -> list[dict]:
    """Sardinia official tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = (
        f'https://www.sardegnaturismo.it/it/esplora/eventi'
        f'?field_periodo_value={target_year}-{target_month:02d}'
    )
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        blocks = re.findall(
            r'<(?:article|div)[^>]*class="[^"]*(?:event|card)[^"]*"[^>]*>(.*?)</(?:article|div)>',
            html, re.DOTALL | re.IGNORECASE
        )
        for block in blocks[:20]:
            title_m = re.search(r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', block)
            if not title_m:
                continue
            name = title_m.group(1).strip()
            if not _is_relevant(name):
                continue

            city_m = re.search(r'<[^>]*(?:city|comune|luogo)[^>]*>([^<]{2,40})<', block, re.IGNORECASE)
            city = city_m.group(1).strip() if city_m else 'Sardegna'

            link_m = re.search(r'href="([^"]+)"', block)
            path = link_m.group(1) if link_m else ''
            website = path if path.startswith('http') else f'https://www.sardegnaturismo.it{path}'

            events.append(_make_event(
                name=name, city=city,
                start_date=f'{target_year}-{target_month:02d}-01',
                website=website, source_tag='sardegna',
            ))
    except Exception as e:
        print(f'[comuni/sardegna] {e}')

    return events


# ─── Source 16: umbria.it ─────────────────────────────────────────────────────

def _scrape_umbria(target_year: int, target_month: int) -> list[dict]:
    """Umbria regional tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.umbriatourism.it/it/eventi?month={target_month}&year={target_year}'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', html, re.IGNORECASE
        )
        for name in title_blocks[:20]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Umbria',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='umbria',
            ))
    except Exception as e:
        print(f'[comuni/umbria] {e}')

    return events


# ─── Source 17: visittrento.it (Trentino-Alto Adige) ─────────────────────────

def _scrape_trentino(target_year: int, target_month: int) -> list[dict]:
    """Trentino-Alto Adige tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.visittrentino.info/it/eventi?mese={target_month}&anno={target_year}'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', html, re.IGNORECASE
        )
        for name in title_blocks[:20]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Trento',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='trentino',
            ))
    except Exception as e:
        print(f'[comuni/trentino] {e}')

    return events


# ─── Source 18: turismofvg.it (Friuli-Venezia Giulia) ────────────────────────

def _scrape_friuli(target_year: int, target_month: int) -> list[dict]:
    """Friuli-Venezia Giulia tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.turismofvg.it/it/agenda?anno={target_year}&mese={target_month}'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', html, re.IGNORECASE
        )
        for name in title_blocks[:20]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Trieste',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='friuli',
            ))
    except Exception as e:
        print(f'[comuni/friuli] {e}')

    return events


# ─── Source 19: visitliguria.it ───────────────────────────────────────────────

def _scrape_liguria(target_year: int, target_month: int) -> list[dict]:
    """Liguria tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.visitliguria.it/it/eventi?month={target_month}&year={target_year}&type=mercati'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', html, re.IGNORECASE
        )
        for name in title_blocks[:20]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Genova',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='liguria',
            ))
    except Exception as e:
        print(f'[comuni/liguria] {e}')

    return events


# ─── Source 20: marchetourism.com ─────────────────────────────────────────────

def _scrape_marche(target_year: int, target_month: int) -> list[dict]:
    """Marche regional tourism portal."""
    events: list[dict] = []
    fetcher = Fetcher(auto_match=False)

    url = f'https://www.le-marche.eu/it/eventi/?mese={target_month}&anno={target_year}'
    try:
        page = fetcher.fetch(url)
        html = str(page.content) if hasattr(page, 'content') else str(page)

        title_blocks = re.findall(
            r'<h[2-4][^>]*>([^<]{5,120})</h[2-4]>', html, re.IGNORECASE
        )
        for name in title_blocks[:20]:
            name = name.strip()
            if not _is_relevant(name):
                continue
            events.append(_make_event(
                name=name, city='Ancona',
                start_date=f'{target_year}-{target_month:02d}-01',
                website=url, source_tag='marche',
            ))
    except Exception as e:
        print(f'[comuni/marche] {e}')

    return events


# ─── Main scrape entry point ───────────────────────────────────────────────────

SCRAPERS = [
    _scrape_eventiesagre,
    _scrape_intoscana,
    _scrape_turismoroma,
    _scrape_emiliaromagna,
    _scrape_puglia,
    _scrape_2night,
    _scrape_yesmilano,
    _scrape_venezia,
    _scrape_piemonte,
    _scrape_campania,
    _scrape_sicilia,
    _scrape_sardegna,
    _scrape_umbria,
    _scrape_trentino,
    _scrape_friuli,
    _scrape_liguria,
    _scrape_marche,
    _scrape_comune_firenze,
    _scrape_comune_bologna,
    _scrape_mercatiniditalia,
]


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    seen: set[str] = set()

    for scraper_fn in SCRAPERS:
        try:
            results = scraper_fn(target_year, target_month)
        except Exception as e:
            print(f'[comuni] {scraper_fn.__name__} crashed: {e}')
            results = []

        for ev in results:
            key = f'{ev["name"]}:{ev.get("start_date", "")}:{ev.get("city", "")}'
            if key in seen:
                continue
            seen.add(key)
            yield ev
