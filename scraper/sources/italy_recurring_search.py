from __future__ import annotations
"""
Ricerca sistematica mercati ricorrenti in tutta Italia.
Percorso: Regione → Provincia → DDG + directory italiane.
Zero AI, zero costo — solo DuckDuckGo + scraping HTML rule-based.

Filtra SOLO mercati ricorrenti (settimanale/mensile/ecc.) con cadenza fissa.
"""

import re
import time
import unicodedata
from datetime import date, timedelta
from typing import Generator

import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

# ── Province per regione (tutti i 107 capoluoghi) ──────────────────────────

PROVINCES_BY_REGION: dict[str, list[str]] = {
    'Lombardia': [
        'Milano', 'Bergamo', 'Brescia', 'Como', 'Cremona',
        'Lecco', 'Lodi', 'Mantova', 'Monza', 'Pavia', 'Sondrio', 'Varese',
    ],
    'Piemonte': [
        'Torino', 'Alessandria', 'Asti', 'Biella', 'Cuneo',
        'Novara', 'Verbania', 'Vercelli',
    ],
    'Veneto': [
        'Venezia', 'Belluno', 'Padova', 'Rovigo', 'Treviso', 'Verona', 'Vicenza',
    ],
    'Emilia-Romagna': [
        'Bologna', 'Ferrara', 'Forlì', 'Modena', 'Parma',
        'Piacenza', 'Ravenna', 'Reggio Emilia', 'Rimini',
    ],
    'Toscana': [
        'Firenze', 'Arezzo', 'Grosseto', 'Livorno', 'Lucca',
        'Massa', 'Pisa', 'Pistoia', 'Prato', 'Siena',
    ],
    'Lazio': [
        'Roma', 'Frosinone', 'Latina', 'Rieti', 'Viterbo',
    ],
    'Campania': [
        'Napoli', 'Avellino', 'Benevento', 'Caserta', 'Salerno',
    ],
    'Puglia': [
        'Bari', 'Barletta', 'Brindisi', 'Foggia', 'Lecce', 'Taranto',
    ],
    'Sicilia': [
        'Palermo', 'Agrigento', 'Caltanissetta', 'Catania',
        'Enna', 'Messina', 'Ragusa', 'Siracusa', 'Trapani',
    ],
    'Sardegna': [
        'Cagliari', 'Nuoro', 'Oristano', 'Sassari',
    ],
    'Liguria': [
        'Genova', 'Imperia', 'La Spezia', 'Savona',
    ],
    'Marche': [
        'Ancona', 'Ascoli Piceno', 'Fermo', 'Macerata', 'Pesaro',
    ],
    'Abruzzo': [
        "L'Aquila", 'Chieti', 'Pescara', 'Teramo',
    ],
    'Umbria': [
        'Perugia', 'Terni',
    ],
    'Friuli-Venezia Giulia': [
        'Trieste', 'Gorizia', 'Pordenone', 'Udine',
    ],
    'Trentino-Alto Adige': [
        'Trento', 'Bolzano',
    ],
    'Calabria': [
        'Catanzaro', 'Cosenza', 'Crotone', 'Reggio Calabria', 'Vibo Valentia',
    ],
    'Basilicata': [
        'Potenza', 'Matera',
    ],
    'Molise': [
        'Campobasso', 'Isernia',
    ],
    "Valle d'Aosta": [
        'Aosta',
    ],
}

# ── Keyword che identificano ricorrenza ───────────────────────────────────

_RECURRING_PATTERNS = [re.compile(p, re.IGNORECASE) for p in [
    r'\bogni\s+(?:prima|seconda|terza|quarta|ultima|1[°oa]|2[°oa]|3[°oa]|4[°oa])\s+'
    r'(?:domenica|sabato|lunedì|martedì|mercoledì|giovedì|venerdì)\b',
    r'\bogni\s+(?:domenica|sabato|lunedì|martedì|mercoledì|giovedì|venerdì)\b',
    r'\b(?:mensile|settimanale|bimestrale|trimestrale)\b',
    r'\bcadenza\s+mensile\b',
    r'\bricorrente\b',
    r'\bogni\s+mese\b',
    r'\bappuntamento\s+fisso\b|\bfisso\s+appuntamento\b',
    r'\bmonthly\b|\bweekly\b',
    r'\bfirst\s+sunday\b|\bsecond\s+sunday\b|\blast\s+sunday\b',
]]

_VINTAGE_KEYWORDS = {
    'antiquariato', 'vintage', 'usato', 'mercatino', 'mercato',
    'pulci', 'brocante', 'rigattiere', 'svuotacantina', 'collezionismo',
    'vinile', 'dischi', 'fumetti', 'seconda mano', 'antique', 'fiera',
}

_SCHEDULE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'ogni\s+domenica', re.I),                  'every_sunday'),
    (re.compile(r'ogni\s+sabato',   re.I),                  'every_saturday'),
    (re.compile(r'ogni\s+lunedì',   re.I),                  'every_monday'),
    (re.compile(r'ogni\s+martedì',  re.I),                  'every_tuesday'),
    (re.compile(r'ogni\s+mercoledì',re.I),                  'every_wednesday'),
    (re.compile(r'ogni\s+giovedì',  re.I),                  'every_thursday'),
    (re.compile(r'ogni\s+venerdì',  re.I),                  'every_friday'),
    (re.compile(r'prima\s+domenica.*sabato', re.I),         'first_sunday_and_prev_saturday'),
    (re.compile(r'seconda\s+domenica.*sabato', re.I),       'second_sunday_and_prev_saturday'),
    (re.compile(r'prima\s+domenica',   re.I),               'first_sunday'),
    (re.compile(r'seconda\s+domenica', re.I),               'second_sunday'),
    (re.compile(r'terza\s+domenica',   re.I),               'third_sunday'),
    (re.compile(r'quarta\s+domenica',  re.I),               'fourth_sunday'),
    (re.compile(r'ultima\s+domenica',  re.I),               'last_sunday'),
    (re.compile(r'primo\s+sabato',     re.I),               'first_saturday'),
    (re.compile(r'secondo\s+sabato',   re.I),               'second_saturday'),
    (re.compile(r'terzo\s+(?:sabato|weekend|fine\s+settimana)', re.I), 'third_weekend'),
    (re.compile(r'quarto\s+sabato',    re.I),               'fourth_saturday'),
    (re.compile(r'ultimo\s+sabato',    re.I),               'last_saturday'),
    (re.compile(r'last\s+sunday',      re.I),               'last_sunday'),
    (re.compile(r'first\s+sunday',     re.I),               'first_sunday'),
    (re.compile(r'second\s+sunday',    re.I),               'second_sunday'),
]

# Directory italiane specializzate in mercati ricorrenti
_DIRECTORY_SEARCHES: list[str] = [
    'site:fierionline.it mercatino antiquariato ricorrente {region}',
    'site:eventiesagre.it mercatino antiquariato {region} mensile',
    'site:mercatinousato.it mercatino antiquariato {region}',
    'site:antiquariato.it fiera antiquariato ricorrente {region}',
    'site:gliamantidellantico.com fiera antiquariato {region}',
    'site:mercatinoitaliano.it mercatino {region}',
]

_PROVINCE_SEARCHES: list[str] = [
    'mercatino antiquariato "{province}" mensile ricorrente ogni domenica',
    'fiera antiquariato "{province}" ricorrente settimanale mensile',
]


# ── Funzioni di supporto ───────────────────────────────────────────────────

def _norm(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def _dedup_key(ev: dict) -> str:
    name = _norm(ev.get('name', ''))[:40]
    city = _norm(ev.get('city', ''))
    return f'{name}|{city}'


def _is_recurring(text: str) -> bool:
    t = text.lower()
    return any(p.search(t) for p in _RECURRING_PATTERNS)


def _is_vintage(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in _VINTAGE_KEYWORDS)


def _detect_schedule(text: str) -> str:
    for pattern, schedule in _SCHEDULE_PATTERNS:
        if pattern.search(text):
            return schedule
    return 'monthly'


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date | None:
    days = []
    for d in range(1, 32):
        try:
            dt = date(year, month, d)
        except ValueError:
            break
        if dt.weekday() == weekday:
            days.append(dt)
    if not days:
        return None
    if n == -1:
        return days[-1]
    if n <= len(days):
        return days[n - 1]
    return None


def _date_from_schedule(schedule: str, year: int, month: int) -> tuple[str, str | None]:
    """Restituisce (start_date, end_date) per lo schedule dato nel mese/anno."""
    def iso(d: date | None) -> str | None:
        return d.isoformat() if d else None

    if schedule == 'every_sunday':
        d = _nth_weekday(year, month, 6, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'every_saturday':
        d = _nth_weekday(year, month, 5, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'every_monday':
        d = _nth_weekday(year, month, 0, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'every_tuesday':
        d = _nth_weekday(year, month, 1, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'every_wednesday':
        d = _nth_weekday(year, month, 2, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'every_thursday':
        d = _nth_weekday(year, month, 3, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'every_friday':
        d = _nth_weekday(year, month, 4, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'first_sunday_and_prev_saturday':
        sun = _nth_weekday(year, month, 6, 1)
        if sun:
            return ((sun - timedelta(days=1)).isoformat(), sun.isoformat())

    if schedule == 'second_sunday_and_prev_saturday':
        sun = _nth_weekday(year, month, 6, 2)
        if sun:
            return ((sun - timedelta(days=1)).isoformat(), sun.isoformat())

    if schedule == 'first_sunday':
        d = _nth_weekday(year, month, 6, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'second_sunday':
        d = _nth_weekday(year, month, 6, 2)
        return (iso(d) or f'{year}-{month:02d}-08', None)

    if schedule == 'third_sunday':
        d = _nth_weekday(year, month, 6, 3)
        return (iso(d) or f'{year}-{month:02d}-15', None)

    if schedule == 'fourth_sunday':
        d = _nth_weekday(year, month, 6, 4)
        return (iso(d) or f'{year}-{month:02d}-22', None)

    if schedule == 'last_sunday':
        d = _nth_weekday(year, month, 6, -1)
        return (iso(d) or f'{year}-{month:02d}-28', None)

    if schedule == 'first_saturday':
        d = _nth_weekday(year, month, 5, 1)
        return (iso(d) or f'{year}-{month:02d}-01', None)

    if schedule == 'second_saturday':
        d = _nth_weekday(year, month, 5, 2)
        return (iso(d) or f'{year}-{month:02d}-08', None)

    if schedule == 'third_weekend':
        sat = _nth_weekday(year, month, 5, 3)
        if sat:
            return (sat.isoformat(), (sat + timedelta(days=1)).isoformat())

    if schedule == 'fourth_saturday':
        d = _nth_weekday(year, month, 5, 4)
        return (iso(d) or f'{year}-{month:02d}-22', None)

    if schedule == 'last_saturday':
        d = _nth_weekday(year, month, 5, -1)
        return (iso(d) or f'{year}-{month:02d}-28', None)

    # fallback: prima domenica del mese
    d = _nth_weekday(year, month, 6, 1)
    return (iso(d) or f'{year}-{month:02d}-01', None)


def _fetch_page(url: str, timeout: int = 12) -> str:
    try:
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0 Safari/537.36'
            ),
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.5',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        r = requests.get(url, headers=headers, timeout=timeout)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
            tag.decompose()
        return re.sub(r'\s+', ' ', soup.get_text(separator=' ', strip=True))
    except Exception as e:
        print(f'[italy_recurring] fetch {url[:60]}: {e}')
        return ''


def _ddg_search(query: str, max_results: int = 8) -> list[dict]:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region='it-it', max_results=max_results))
        time.sleep(1.2)
        return results
    except Exception as e:
        print(f'[italy_recurring] DDG "{query[:55]}": {e}')
        time.sleep(3)
        return []


def _extract_city_from_text(text: str, fallback: str) -> str:
    city_pattern = re.compile(
        r'\b(Milano|Roma|Torino|Napoli|Bologna|Firenze|Venezia|Genova|Bari|Palermo|'
        r'Catania|Verona|Padova|Brescia|Bergamo|Trieste|Parma|Modena|Arezzo|Siena|'
        r'Lucca|Perugia|Cagliari|Salerno|Lecce|Pescara|Ancona|Reggio\s+Calabria|'
        r'Matera|Trento|Bolzano|Aosta|Ravenna|Rimini|Ferrara|Udine|Pisa|Livorno|'
        r'Pistoia|Prato|Viterbo|Frosinone|Latina|Rieti|Caserta|Avellino|Benevento|'
        r'Foggia|Taranto|Brindisi|Barletta|Cosenza|Catanzaro|Crotone|Potenza|'
        r'Campobasso|Isernia|Sassari|Nuoro|Oristano|Messina|Siracusa|Agrigento|'
        r'Caltanissetta|Enna|Trapani|Ragusa|Verbania|Asti|Alessandria|Novara|'
        r'Vercelli|Biella|Cuneo|Mantova|Como|Cremona|Lecco|Lodi|Varese|Sondrio|'
        r'Monza|Treviso|Vicenza|Belluno|Rovigo|Macerata|Pesaro|Ascoli\s+Piceno|'
        r'Fermo|Teramo|Chieti|L\'Aquila|Gorizia|Pordenone|Imperia|La\s+Spezia|'
        r'Savona|Reggio\s+Emilia|Piacenza|Forlì|Terni|Vibo\s+Valentia|Grosseto|'
        r'Massa|Empoli|Piazzola\s+sul\s+Brenta)\b',
        re.IGNORECASE,
    )
    m = city_pattern.search(text)
    if m:
        return m.group(1).title()
    return fallback


def _guess_type(text: str) -> str:
    t = text.lower()
    if 'svuotacantina' in t:                     return 'svuotacantina'
    if 'vinile' in t or 'dischi' in t:           return 'vinile'
    if 'fumetti' in t:                           return 'fumetti'
    if 'collezion' in t:                         return 'collezionismo'
    if 'antiquariato' in t or 'antique' in t:    return 'antiquariato'
    if 'vintage' in t:                           return 'mercatino'
    return 'mercatino'


def _build_event(
    name: str,
    city: str,
    region: str,
    text: str,
    source_url: str,
    year: int,
    month: int,
) -> dict:
    schedule = _detect_schedule(text)
    start_date, end_date = _date_from_schedule(schedule, year, month)

    # Estrai orari se presenti
    t_m = re.search(r'(?:ore|dalle|orario:?)\s+(\d{1,2})[:\.](\d{2})', text, re.IGNORECASE)
    start_time = f'{int(t_m.group(1)):02d}:{t_m.group(2)}' if t_m else None

    price_info = None
    if re.search(r'\b(?:gratuito|gratis|libero|free)\b', text, re.IGNORECASE):
        price_info = 'Ingresso gratuito'
    elif re.search(r'\b(?:pagamento|ticket|biglietto|euro|€)\b', text, re.IGNORECASE):
        price_info = 'A pagamento'

    website_m = re.search(r'https?://[^\s\'"<>]+', text)
    website = website_m.group(0)[:200] if website_m else source_url

    return {
        'name':         name[:150],
        'description':  text[:400],
        'event_type':   _guess_type(text),
        'city':         city[:80],
        'region':       region,
        'address':      None,
        'lat':          None,
        'lng':          None,
        'start_date':   start_date,
        'end_date':     end_date,
        'start_time':   start_time,
        'end_time':     None,
        'website':      website,
        'organizer':    None,
        'price_info':   price_info,
        'source_url':   source_url,
        'is_recurring': True,
        'is_verified':  False,
        'is_featured':  False,
        'categories':   [],
        'tags':         ['italy-recurring-search', _norm(region)],
    }


# ── Scraping directory dirette ─────────────────────────────────────────────

def _scrape_fierionline(region: str, year: int, month: int) -> list[dict]:
    """Scraping fierionline.it per regione — elenco mercatini ricorrenti."""
    region_slug = _norm(region).replace(' ', '-')
    urls = [
        f'https://www.fierionline.it/mercatini/{region_slug}/',
        f'https://www.fierionline.it/cerca/?tipo=mercatino&regione={region_slug}&stato=1',
    ]
    results = []
    for url in urls:
        text = _fetch_page(url)
        if not text or len(text) < 200:
            continue
        soup_text = text
        entries = re.split(r'(?=Mercatino|Fiera|Mercato dell)', soup_text)
        for entry in entries:
            if len(entry) < 30:
                continue
            if not (_is_vintage(entry) and _is_recurring(entry)):
                continue
            city = _extract_city_from_text(entry, region)
            name_m = re.match(r'([A-Z][^\n.]{5,80})', entry.strip())
            name = name_m.group(1).strip() if name_m else f'Mercatino Antiquariato – {city}'
            if len(name) < 5:
                continue
            results.append(_build_event(name, city, region, entry[:500], url, year, month))
        if results:
            break
    time.sleep(0.5)
    return results


def _scrape_eventiesagre(region: str, year: int, month: int) -> list[dict]:
    """Scraping eventiesagre.it per regione."""
    region_slug = _norm(region).replace(' ', '-')
    urls = [
        f'https://www.eventiesagre.it/mercatini/{region_slug}/',
        f'https://www.eventiesagre.it/ricerca/?tipo=mercatino&regione={region_slug}',
    ]
    results = []
    for url in urls:
        text = _fetch_page(url)
        if not text or len(text) < 200:
            continue
        entries = re.split(r'(?=Mercatino|Fiera|Antiquariato)', text)
        for entry in entries:
            if not (_is_vintage(entry) and _is_recurring(entry)):
                continue
            city = _extract_city_from_text(entry, region)
            name_m = re.match(r'([A-Z][^\n.]{5,80})', entry.strip())
            name = name_m.group(1).strip() if name_m else f'Mercatino Ricorrente – {city}'
            if len(name) < 5:
                continue
            results.append(_build_event(name, city, region, entry[:500], url, year, month))
        if results:
            break
    time.sleep(0.5)
    return results


def _scrape_mercatinoitaliano(region: str, year: int, month: int) -> list[dict]:
    """Scraping mercatinoitaliano.it per regione."""
    region_slug = _norm(region).replace(' ', '-')
    url = f'https://www.mercatinoitaliano.it/{region_slug}/'
    text = _fetch_page(url)
    results = []
    if not text or len(text) < 200:
        return results
    entries = re.split(r'(?=Mercatino|Fiera|Usato)', text)
    for entry in entries:
        if not (_is_vintage(entry) and _is_recurring(entry)):
            continue
        city = _extract_city_from_text(entry, region)
        name_m = re.match(r'([A-Z][^\n.]{5,80})', entry.strip())
        name = name_m.group(1).strip() if name_m else f'Mercatino – {city}'
        if len(name) < 5:
            continue
        results.append(_build_event(name, city, region, entry[:500], url, year, month))
    time.sleep(0.5)
    return results


# ── Ricerca DDG per directory specializzate ────────────────────────────────

def _ddg_directory_search(region: str, year: int, month: int) -> list[dict]:
    """Per ogni regione: cerca su directory italiane via DDG site: searches."""
    results = []
    for template in _DIRECTORY_SEARCHES:
        query = template.format(region=region)
        for r in _ddg_search(query, max_results=6):
            title  = r.get('title', '')
            body   = r.get('body', '')
            href   = r.get('href', '')
            snippet = f'{title} {body}'
            if not (_is_vintage(snippet) and _is_recurring(snippet)):
                continue
            city = _extract_city_from_text(snippet, region)
            name = re.sub(r'\s+', ' ', title.strip())[:120]
            if len(name) < 5:
                continue
            results.append(_build_event(name, city, region, snippet[:500], href, year, month))
    return results


def _ddg_province_search(province: str, region: str, year: int, month: int) -> list[dict]:
    """Per ogni provincia: 2 ricerche DDG mirate su mercati ricorrenti."""
    results = []
    for template in _PROVINCE_SEARCHES:
        query = template.format(province=province)
        for r in _ddg_search(query, max_results=8):
            title  = r.get('title', '')
            body   = r.get('body', '')
            href   = r.get('href', '')
            snippet = f'{title} {body}'
            if not (_is_vintage(snippet) and _is_recurring(snippet)):
                continue
            city = _extract_city_from_text(snippet, province)
            name = re.sub(r'\s+', ' ', title.strip())[:120]
            if len(name) < 5:
                name = f'Mercatino Antiquariato – {city}'
            results.append(_build_event(name, city, region, snippet[:500], href, year, month))
    return results


# ── Entry point ───────────────────────────────────────────────────────────

def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    """
    Ricerca sistematica: Regione → Provincia.
    Fase 1 (per ogni regione): scraping directory dirette + DDG su directory.
    Fase 2 (per ogni provincia): 2 DDG searches mirate.
    Filtro: solo is_recurring=True, solo vintage/antiquariato.
    Dedup: stessa città + stesso nome normalizzato.
    """
    seen: set[str] = set()

    def _emit(ev: dict) -> dict | None:
        k = _dedup_key(ev)
        if k in seen:
            return None
        seen.add(k)
        return ev

    for region, provinces in PROVINCES_BY_REGION.items():
        print(f'[italy_recurring] Regione: {region}')

        # Fase 1a: scraping directory dirette
        for ev in _scrape_fierionline(region, target_year, target_month):
            out = _emit(ev)
            if out:
                yield out

        for ev in _scrape_eventiesagre(region, target_year, target_month):
            out = _emit(ev)
            if out:
                yield out

        for ev in _scrape_mercatinoitaliano(region, target_year, target_month):
            out = _emit(ev)
            if out:
                yield out

        # Fase 1b: DDG su directory specializzate per regione
        for ev in _ddg_directory_search(region, target_year, target_month):
            out = _emit(ev)
            if out:
                yield out

        # Fase 2: per ogni provincia, 2 DDG searches mirate
        for province in provinces:
            print(f'[italy_recurring]   Provincia: {province}')
            for ev in _ddg_province_search(province, region, target_year, target_month):
                out = _emit(ev)
                if out:
                    yield out
