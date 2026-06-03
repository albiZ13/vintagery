from __future__ import annotations
"""
Web search scraper v2 — duckduckgo-search + Claude Haiku + estrazione rule-based.

Pipeline:
  1. duckduckgo-search: query DDG con libreria dedicata (nessun parsing HTML)
  2. Estrazione rule-based: regex veloci su snippet e pagine calendario
  3. Claude Haiku: estrazione AI su contenuto pagine — capisce date in parole,
     ricorrenze mensili, testi ambigui, social, articoli locali
     Costo ~€0.13/settimana per 20 regioni.
"""
import re
import time
import unicodedata
from datetime import date
from typing import Generator
from urllib.parse import urlparse

import json
import os
import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

from ..regions import REGION_CITIES, REGION_LOCAL_SITES, city_to_region

MONTH_NAMES_IT = [
    '', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

MONTHS_IT = {
    'gen': 1, 'gennaio': 1, 'feb': 2, 'febbraio': 2, 'mar': 3, 'marzo': 3,
    'apr': 4, 'aprile': 4, 'mag': 5, 'maggio': 5, 'giu': 6, 'giugno': 6,
    'lug': 7, 'luglio': 7, 'ago': 8, 'agosto': 8, 'set': 9, 'settembre': 9,
    'ott': 10, 'ottobre': 10, 'nov': 11, 'novembre': 11, 'dic': 12, 'dicembre': 12,
}

# ── Query templates ────────────────────────────────────────────────────────

REGION_TEMPLATES = [
    'mercatini antiquariato {region} {month} {year}',
    'mercatino vintage {region} {month} {year}',
    'svuotacantine {region} {month} {year}',
    'fiera antiquariato {region} {month} {year}',
    'fiera collezionismo {region} {month} {year}',
    'mercato vinile dischi {region} {month} {year}',
    'fumetti vintage {region} {month} {year}',
    'mercatino usato {region} {month} {year}',
    '{region} mercatino antiquariato ogni domenica {year}',
    '{region} fiera antiquariato prima domenica mese',
    '{region} mercatino vintage ricorrente mensile',
    'site:facebook.com mercatino vintage {region} {month} {year}',
    'site:facebook.com svuotacantine {region} {month} {year}',
    'site:instagram.com mercatino antiquariato {region} {month}',
    'tiktok mercatino vintage {region} {year}',
    'site:eventbrite.it antiquariato vintage {region} {month} {year}',
    'site:eventiesagre.it {region} {month} {year}',
    'site:fierionline.it {region} {month} {year}',
    'site:mercatinousato.it {region} mercatino',
    'vintage market antique fair {region} {month} {year}',
    'mercatino antiquariato {region} {year} notizie',
    'vintage {region} {month} {year} evento',
    '{region} mercato antiquariato sabato domenica {month} {year}',
    'collezionismo fumetti vinile {region} {month} {year}',
]

CITY_TEMPLATES = [
    'mercatino antiquariato {city} {month} {year}',
    'mercatino vintage {city} {month} {year}',
    'svuotacantina {city} {month} {year}',
    'fiera collezionismo {city} {month} {year}',
    'mercato vinile {city} {month} {year}',
]

# Siti da cui vale la pena scaricare la pagina completa
CALENDAR_DOMAINS = {
    'eventiesagre.it', 'fierionline.it', 'mercatinousato.it',
    'eventbrite.it', 'cosafareintoscana.it',
    'emiliaromagnaturismo.it', 'visittuscany.com',
    'turismo.intoscana.it', 'turismoroma.it',
}

EVENT_KEYWORDS = {
    'mercatino', 'mercato', 'antiquariato', 'vintage', 'svuotacantina',
    'svendita', 'fiera', 'collezionismo', 'vinile', 'dischi', 'fumetti',
    'bancarelle', 'espositori', 'usato', 'rigattiere', 'brocante',
}

SERVICE_EXCLUDE = {
    'sgombero', 'ritiro mobili', 'svuotiamo gratuitamente',
    'preventivo gratuito', 'numero verde', 'smaltimento', 'trasloco',
}


# ── Claude Haiku extraction ───────────────────────────────────────────────

_PROMPT = """\
Sei un esperto di mercatini vintage italiani. Analizza il testo e estrai \
TUTTI gli eventi di mercatini, fiere antiquariato, svuotacantine, vinile, \
fumetti, collezionismo nella regione {region} per {month} {year}.

TESTO:
{content}

Rispondi SOLO con un array JSON (nessun altro testo):
[{{
  "name": "nome evento",
  "city": "città",
  "start_date": "YYYY-MM-DD o null",
  "end_date": "YYYY-MM-DD o null",
  "start_time": "HH:MM o null",
  "end_time": "HH:MM o null",
  "event_type": "antiquariato|mercatino|svuotacantina|vinile|fumetti|collezionismo|altro",
  "is_recurring": true o false,
  "address": "indirizzo o null",
  "price_info": "es. ingresso libero o null",
  "organizer": "nome o null",
  "description": "1-2 frasi"
}}]

Regole:
- Solo eventi REALI trovati nel testo, mai inventare
- Domeniche giugno 2026: 7,14,21,28 — luglio: 5,12,19,26
- Per "prima domenica del mese" calcola la data corretta
- Se non ci sono eventi scrivi []
"""


def _extract_with_ai(content: str, region: str, month_name: str,
                     year: int, source_url: str) -> list[dict]:
    """Claude Haiku estrae eventi strutturati dal testo."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key or not content.strip():
        return []
    try:
        from anthropic import Anthropic
        msg = Anthropic(api_key=api_key).messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=2048,
            messages=[{'role': 'user', 'content': _PROMPT.format(
                region=region, month=month_name, year=year, content=content[:5000]
            )}],
        )
        raw = msg.content[0].text.strip()
        start, end = raw.find('['), raw.rfind(']') + 1
        if start == -1 or end == 0:
            return []
        events = json.loads(raw[start:end])
        for ev in events:
            ev['source_url'] = source_url
            ev['region'] = region
        return events
    except Exception as e:
        print(f'[websearch] AI error: {e}')
        return []


# ── DDG search ────────────────────────────────────────────────────────────

def _ddg_search(query: str, max_results: int = 10) -> list[dict]:
    """Cerca su DuckDuckGo con la libreria ufficiale — nessun parsing HTML."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region='it-it', max_results=max_results))
        time.sleep(1.0)
        return results  # [{title, href, body}]
    except Exception as e:
        print(f'[websearch] DDG "{query[:55]}": {e}')
        time.sleep(3)
        return []


# ── Page fetch ────────────────────────────────────────────────────────────

def _fetch_page(url: str) -> str:
    """Scarica una pagina e restituisce testo pulito (max 8000 char)."""
    try:
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
            ),
            'Accept-Language': 'it-IT,it;q=0.9',
        }
        resp = requests.get(url, headers=headers, timeout=12)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)
        return re.sub(r'\s+', ' ', text)[:8000]
    except Exception as e:
        print(f'[websearch] fetch {url[:55]}: {e}')
        return ''


def _is_calendar_url(url: str) -> bool:
    try:
        domain = urlparse(url).netloc.lstrip('www.')
        return any(d in domain for d in CALENDAR_DOMAINS)
    except Exception:
        return False


# ── Estrazione eventi ─────────────────────────────────────────────────────

def _is_relevant(text: str) -> bool:
    t = text.lower()
    if any(ex in t for ex in SERVICE_EXCLUDE):
        return False
    return any(kw in t for kw in EVENT_KEYWORDS)


def _guess_type(text: str) -> str:
    t = text.lower()
    if 'svuotacantina' in t:              return 'svuotacantina'
    if 'svendita' in t:                   return 'svendita'
    if 'fumetti' in t:                    return 'fumetti'
    if 'vinile' in t or 'dischi' in t:   return 'vinile'
    if 'collezion' in t:                  return 'collezionismo'
    if 'antiquariato' in t:               return 'antiquariato'
    if 'vintage' in t:                    return 'mercatino'
    return 'mercatino'


def _parse_date(text: str, target_year: int, target_month: int) -> str | None:
    t = text.lower()

    # dd/mm/yyyy o dd-mm-yyyy
    m = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    # ISO yyyy-mm-dd
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', t)
    if m:
        return m.group(0)

    # "31 giugno 2026" / "sabato 14 giugno"
    m = re.search(
        r'(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)?'
        r'\s*(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(\d{4}))?', t
    )
    if m:
        day = int(m.group(1))
        mo  = MONTHS_IT.get(m.group(2)[:3])
        yr  = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31 and mo == target_month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'

    # "giugno 2026" → primo del mese
    m = re.search(r'\b([a-zà-ú]{4,9})\s+(\d{4})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        yr = int(m.group(2))
        if mo and mo == target_month and yr == target_year:
            return f'{yr:04d}-{mo:02d}-01'

    # "a giugno" / "in giugno"
    m = re.search(r'\b(?:a|in|nel mese di|per)\s+([a-zà-ú]{4,9})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        if mo and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-01'

    return None


def _extract_events(text: str, source_url: str, target_year: int, target_month: int,
                    default_city: str, region: str) -> list[dict]:
    """Estrae eventi da un blocco di testo con pattern matching."""
    if not _is_relevant(text):
        return []

    events = []
    seen_names: set[str] = set()

    # Prova a estrarre blocchi strutturati (article, div evento, ecc.)
    blocks = re.split(r'\n{2,}|(?<=[.!?])\s{2,}', text)
    if len(blocks) < 3:
        blocks = [text[:3000]]

    for block in blocks[:25]:
        block = block.strip()
        if len(block) < 20 or not _is_relevant(block):
            continue

        start_date = _parse_date(block, target_year, target_month)
        if not start_date:
            continue

        try:
            d = date.fromisoformat(start_date)
            if d.month != target_month or d.year != target_year:
                continue
        except ValueError:
            continue

        # Nome evento: prima riga significativa
        lines = [l.strip() for l in block.split('\n') if len(l.strip()) > 8]
        name = lines[0][:120] if lines else block[:80]
        name = re.sub(r'\s+', ' ', name).rstrip('.,:-')

        if name in seen_names or len(name) < 8:
            continue
        seen_names.add(name)

        # Città: cerca pattern "a Milano", "in via X, Bologna"
        city_m = re.search(
            r'\b(Milano|Roma|Torino|Napoli|Bologna|Firenze|Venezia|Genova|'
            r'Bari|Palermo|Catania|Verona|Padova|Brescia|Bergamo|Trieste|'
            r'Parma|Modena|Arezzo|Siena|Lucca|Perugia|Cagliari|Salerno|'
            r'Lecce|Pescara|Ancona|Reggio\s+Calabria|Matera|Trento|Aosta|'
            r'Pisa|Livorno|Pistoia|Prato|Grosseto|Ravenna|Rimini|Ferrara|'
            r'Sassari|Nuoro|Oristano|Taranto|Foggia|Brindisi|Potenza|'
            r'Campobasso|Cosenza|Catanzaro|Vibo\s+Valentia|Crotone|'
            r'Udine|Pordenone|Gorizia|Bolzano|Rovereto)\b',
            block, re.IGNORECASE
        )
        city = city_m.group(1) if city_m else default_city

        # Orario
        time_m = re.search(r'(?:ore|dalle)\s+(\d{1,2})[:\.](\d{2})', block, re.IGNORECASE)
        start_time = f'{int(time_m.group(1)):02d}:{time_m.group(2)}' if time_m else None

        # Prezzo
        price_m = re.search(r'(?:ingresso|entrata|ticket)[:\s]*([^\.\n]{3,40})', block, re.IGNORECASE)
        price_info = price_m.group(1).strip() if price_m else None
        if re.search(r'\bgratuito\b|\bgratis\b|\bfree\b|\blibero\b', block, re.IGNORECASE):
            price_info = 'Ingresso gratuito'

        # Indirizzo
        addr_m = re.search(
            r'(?:via|piazza|corso|viale|largo|borgo)\s+[A-Za-zÀ-ú][A-Za-zÀ-ú\s]{2,30}(?:,\s*\d+)?',
            block, re.IGNORECASE
        )

        events.append({
            'name':        name,
            'description': block[:350].strip(),
            'event_type':  _guess_type(block),
            'city':        city,
            'region':      region,
            'address':     addr_m.group(0).strip() if addr_m else None,
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
            'is_recurring': bool(re.search(r'ogni\s+(?:prima|seconda|terza|ultima|domenica|sabato|mese)', block, re.IGNORECASE)),
            'categories':  [],
            'tags':        ['websearch-v2', urlparse(source_url).netloc.lstrip('www.')],
        })

    return events


# ── Entry point ───────────────────────────────────────────────────────────

def scrape(
    target_year: int,
    target_month: int,
    region: str | None = None,
) -> Generator[dict, None, None]:
    month_name = MONTH_NAMES_IT[target_month]
    seen_events: set[str] = set()
    seen_urls:   set[str] = set()

    def _default_city(reg: str) -> str:
        cities = REGION_CITIES.get(reg, [])
        return cities[0] if cities else reg

    def _norm_ev(raw: dict, reg: str, src: str) -> dict | None:
        name = (raw.get('name') or '').strip()
        if not name or len(name) < 5:
            return None
        sd = raw.get('start_date')
        if sd:
            try:
                date.fromisoformat(sd)
            except (ValueError, TypeError):
                sd = None
        return {
            'name':        name[:150],
            'description': (raw.get('description') or '')[:400],
            'event_type':  raw.get('event_type', 'mercatino'),
            'city':        (raw.get('city') or _default_city(reg))[:80],
            'region':      reg,
            'address':     raw.get('address'),
            'start_date':  sd,
            'end_date':    raw.get('end_date'),
            'start_time':  raw.get('start_time'),
            'end_time':    raw.get('end_time'),
            'website':     src,
            'instagram':   None,
            'price_info':  raw.get('price_info'),
            'organizer':   raw.get('organizer'),
            'source_url':  src,
            'is_verified': False,
            'is_featured': False,
            'is_recurring': bool(raw.get('is_recurring', False)),
            'categories':  [],
            'tags':        ['websearch-v2', 'ai-extracted'],
        }

    def _yield_ai(content: str, src: str, reg: str) -> Generator[dict, None, None]:
        for raw in _extract_with_ai(content, reg, month_name, target_year, src):
            ev = _norm_ev(raw, reg, src)
            if not ev:
                continue
            key = f"{ev['name'][:35].lower()}|{ev.get('start_date','')[:10]}|{ev['city'].lower()}"
            if key not in seen_events:
                seen_events.add(key)
                yield ev

    def _process_results(results: list[dict], reg: str) -> Generator[dict, None, None]:
        city = _default_city(reg)

        # Aggrega tutti gli snippet in un unico testo per il batch AI
        combined = '\n\n'.join(
            f"URL: {r.get('href','')}\nTitolo: {r.get('title','')}\nAnteprima: {r.get('body','')}"
            for r in results if r.get('title')
        )

        # Rule-based su snippet (veloce, gratis)
        for ev in _extract_events(combined, 'duckduckgo', target_year, target_month, city, reg):
            key = f"{ev['name'][:35].lower()}|{ev.get('start_date','')[:10]}|{ev['city'].lower()}"
            if key not in seen_events:
                seen_events.add(key)
                yield ev

        # Claude Haiku sugli stessi snippet (cattura ciò che regex manca)
        yield from _yield_ai(combined, 'duckduckgo', reg)

        # Fetch pagine calendario + Claude estrazione completa
        for r in results:
            url = r.get('href', '')
            if not url or url in seen_urls or not _is_calendar_url(url):
                continue
            seen_urls.add(url)
            page_text = _fetch_page(url)
            if not page_text:
                continue
            # Rule-based sulla pagina
            for ev in _extract_events(page_text, url, target_year, target_month, city, reg):
                key = f"{ev['name'][:35].lower()}|{ev.get('start_date','')[:10]}|{ev['city'].lower()}"
                if key not in seen_events:
                    seen_events.add(key)
                    yield ev
            # Claude sulla pagina
            yield from _yield_ai(page_text, url, reg)
            time.sleep(0.8)

    if region:
        # ── Modalità regione specifica ─────────────────────────────────
        cities = REGION_CITIES.get(region, [])

        for template in REGION_TEMPLATES:
            query   = template.format(region=region, month=month_name, year=target_year)
            results = _ddg_search(query)
            yield from _process_results(results, region)

        for city in cities:
            for template in CITY_TEMPLATES:
                query   = template.format(city=city, month=month_name, year=target_year)
                results = _ddg_search(query)
                yield from _process_results(results, region)

        for site in REGION_LOCAL_SITES.get(region, []):
            query   = f'site:{site} mercatino antiquariato vintage {month_name} {target_year}'
            results = _ddg_search(query)
            yield from _process_results(results, region)

    else:
        # ── Modalità legacy: rotazione regioni ────────────────────────
        from ..regions import ITALIAN_REGIONS
        offset = (target_month - 1) % 4
        for reg in ITALIAN_REGIONS[offset * 5:(offset + 1) * 5]:
            for template in REGION_TEMPLATES[:8]:
                query   = template.format(region=reg, month=month_name, year=target_year)
                results = _ddg_search(query)
                yield from _process_results(results, reg)
            for city in REGION_CITIES.get(reg, [])[:3]:
                query   = f'mercatino antiquariato {city} {month_name} {target_year}'
                results = _ddg_search(query)
                yield from _process_results(results, reg)
