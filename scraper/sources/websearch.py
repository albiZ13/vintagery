from __future__ import annotations
"""
Web search scraper v3 — duckduckgo-search + Claude Haiku + query vintage-specifiche.

Ogni query è mirata esclusivamente al mondo vintage/antiquariato/rivendita.
Niente query generiche: zero sprechi di API call su concerti o sagre.

Pipeline per ogni query:
  1. DDGS.text() → risultati DDG puliti (libreria dedicata, no HTML parsing)
  2. Rule-based su snippet → estrazione veloce eventi con data
  3. Claude Haiku su snippet aggregati → cattura ciò che regex manca
  4. Per siti calendario → fetch pagina + Claude estrazione completa
"""
import json
import os
import re
import time
from datetime import date
from typing import Generator
from urllib.parse import urlparse

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

# ── Query templates — TUTTE vintage-specifiche ────────────────────────────
# Ogni template genera una ricerca mirata; zero query generiche.

REGION_TEMPLATES = [
    # Ricerca diretta mercatini
    'fiera antiquariato {region} {month} {year}',
    'mercatino antiquariato {region} {month} {year}',
    'mercatino vintage {region} {month} {year}',
    'mercato usato {region} {month} {year}',
    'svuotacantine {region} {month} {year}',
    'mercato delle pulci brocante {region} {month} {year}',
    # Collezionismo
    'fiera del vinile record fair {region} {month} {year}',
    'mercatino fumetti {region} {month} {year}',
    'fiera collezionismo {region} {month} {year}',
    'kilo vintage {region} {month} {year}',
    # Ricorrenti mensili
    '{region} fiera antiquariato prima domenica {year}',
    '{region} mercatino antiquariato ricorrente mensile',
    '{region} mercato usato ogni domenica {year}',
    # Organizzatori ufficiali
    '{region} proloco mercatino antiquariato {year}',
    '{region} associazione antiquari fiera {year}',
    # Aggregatori noti
    'site:eventiesagre.it mercatino antiquariato {region} {month}',
    'site:fierionline.it fiera antiquariato {region} {month}',
    'site:eventbrite.it mercatino vintage antiquariato {region} {month} {year}',
    # Social (indicizzati)
    'facebook.com mercatino vintage {region} {month} {year}',
    'instagram mercatino antiquariato {region} {month}',
    'tiktok mercatino vintage {region} {year}',
    # Giornali locali
    'notizie mercatino antiquariato {region} {month} {year}',
    # Inglese (expat, mercati internazionali)
    'antique market vintage fair {region} italy {month} {year}',
]

CITY_TEMPLATES = [
    'fiera antiquariato {city} {month} {year}',
    'mercatino vintage usato {city} {month} {year}',
    'svuotacantina svendita privata {city} {month} {year}',
    'fiera collezionismo vinile {city} {month} {year}',
    '{city} mercato delle pulci {month} {year}',
]

# Siti da cui vale la pena scaricare la pagina intera
CALENDAR_DOMAINS = {
    'eventiesagre.it', 'fierionline.it', 'mercatinousato.it',
    'eventbrite.it', 'cosafareintoscana.it', 'turismo.intoscana.it',
    'emiliaromagnaturismo.it', 'visittuscany.com', 'turismoroma.it',
    'fieraantiquaria.org', 'granbalon.com', 'portaportese.it',
}

# ── Prompt Claude Haiku — vintage-focused ─────────────────────────────────

_EXTRACT_PROMPT = """\
Sei un esperto di mercatini vintage italiani. Dal testo seguente estrai \
TUTTI gli eventi di mercatini, fiere antiquariato, svuotacantine, \
vinile/dischi, fumetti, collezionismo nella regione {region} per {month} {year}.

INCLUDI SOLO: mercatini usato/vintage, antiquariato, svuotacantine, \
fiere del vinile, fumetti, collezionismo, mercati delle pulci, brocante, \
svendite private di brand, vendite in stock, mercati delle pulci.
ESCLUDI: concerti, sagre cibo, eventi sportivi, fiere nuovi prodotti.

REGOLA CRITICA — is_recurring:
- true SOLO SE il mercato ha cadenza fissa ripetuta ogni mese o ogni settimana.
  Esempi: "ogni seconda domenica del mese", "ogni martedì", "mensile", "settimanale".
- false per TUTTI gli altri: Vinokilo, svuotacantine, svendite private di brand,
  eventi speciali, fiere una tantum, qualsiasi evento che non si ripete ogni mese/settimana.
  In caso di dubbio: false.

TESTO:
{content}

Rispondi SOLO con array JSON:
[{{
  "name": "nome evento",
  "city": "città",
  "start_date": "YYYY-MM-DD o null",
  "end_date": "YYYY-MM-DD o null",
  "start_time": "HH:MM o null",
  "event_type": "antiquariato|mercatino|svuotacantina|vinile|fumetti|collezionismo|brand_sale|svendita",
  "is_recurring": true/false,
  "address": "indirizzo o null",
  "price_info": "prezzo o null",
  "organizer": "nome o null",
  "description": "2-3 frasi"
}}]

Domeniche {month} {year}: giugno→7,14,21,28 | luglio→5,12,19,26 | agosto→2,9,16,23,30
Per ricorrenze ("prima domenica") calcola la data corretta.
Se non trovi eventi vintage scrivi [].
"""


# ── Funzioni di supporto ──────────────────────────────────────────────────

def _ddg_search(query: str, max_results: int = 10) -> list[dict]:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region='it-it', max_results=max_results))
        time.sleep(1.0)
        return results
    except Exception as e:
        print(f'[websearch] DDG "{query[:55]}": {e}')
        time.sleep(3)
        return []


def _fetch_page(url: str) -> str:
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                          'AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
            'Accept-Language': 'it-IT,it;q=0.9',
        }
        r = requests.get(url, headers=headers, timeout=12)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)
        return re.sub(r'\s+', ' ', text)[:8000]
    except Exception as e:
        print(f'[websearch] fetch {url[:55]}: {e}')
        return ''


def _is_calendar_url(url: str) -> bool:
    try:
        return any(d in urlparse(url).netloc for d in CALENDAR_DOMAINS)
    except Exception:
        return False


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
        r'(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)?\s*'
        r'(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(\d{4}))?', t
    )
    if m:
        day = int(m.group(1))
        mo  = MONTHS_IT.get(m.group(2)[:3])
        yr  = int(m.group(3)) if m.group(3) else year
        if mo and 1 <= day <= 31 and mo == month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'
    m = re.search(r'\b([a-zà-ú]{4,9})\s+(\d{4})\b', t)
    if m:
        mo = MONTHS_IT.get(m.group(1)[:3])
        yr = int(m.group(2))
        if mo and mo == month and yr == year:
            return f'{yr:04d}-{mo:02d}-01'
    return None


def _is_vintage(text: str) -> bool:
    keywords = {
        'mercatino', 'antiquariato', 'vintage', 'usato', 'svuotacantina',
        'pulci', 'brocante', 'rigattiere', 'svendita', 'collezionismo',
        'vinile', 'dischi', 'fumetti', 'seconda mano', 'second hand',
        'antiquario', 'antique', 'flea market',
    }
    t = text.lower()
    return any(k in t for k in keywords)


def _guess_type(text: str) -> str:
    t = text.lower()
    if 'svuotacantina' in t:               return 'svuotacantina'
    if 'svendita' in t:                    return 'svendita'
    if 'fumetti' in t:                     return 'fumetti'
    if 'vinile' in t or 'dischi' in t:     return 'vinile'
    if 'collezion' in t:                   return 'collezionismo'
    if 'antiquariato' in t or 'antique' in t: return 'antiquariato'
    return 'mercatino'


def _extract_with_ai(content: str, region: str, month_name: str,
                     year: int, source_url: str) -> list[dict]:
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key or not content.strip():
        return []
    try:
        from anthropic import Anthropic
        msg = Anthropic(api_key=api_key).messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=2048,
            messages=[{'role': 'user', 'content': _EXTRACT_PROMPT.format(
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
        print(f'[websearch] AI extract error: {e}')
        return []


def _rule_extract(text: str, source_url: str, year: int, month: int,
                  city: str, region: str) -> list[dict]:
    """Estrazione rule-based veloce da snippet."""
    if not _is_vintage(text):
        return []
    start_date = _parse_date(text, year, month)
    if not start_date:
        return []
    try:
        d = date.fromisoformat(start_date)
        if d.month != month or d.year != year:
            return []
    except (ValueError, TypeError):
        return []

    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 8]
    name = lines[0][:120] if lines else text[:80]
    name = re.sub(r'\s+', ' ', name).rstrip('.,:-')

    city_m = re.search(
        r'\b(Milano|Roma|Torino|Napoli|Bologna|Firenze|Venezia|Genova|'
        r'Bari|Palermo|Catania|Verona|Padova|Brescia|Bergamo|Trieste|'
        r'Parma|Modena|Arezzo|Siena|Lucca|Perugia|Cagliari|Salerno|'
        r'Lecce|Pescara|Ancona|Reggio Calabria|Matera|Trento|Aosta|'
        r'Ravenna|Rimini|Ferrara|Udine|Pisa|Livorno|Pistoia)\b',
        text, re.IGNORECASE
    )
    ev_city = city_m.group(1) if city_m else city

    t_m = re.search(r'(?:ore|dalle)\s+(\d{1,2})[:\.](\d{2})', text, re.IGNORECASE)
    start_time = f'{int(t_m.group(1)):02d}:{t_m.group(2)}' if t_m else None

    price_info = None
    if re.search(r'\bgratuito\b|\bgratis\b|\blibero\b', text, re.IGNORECASE):
        price_info = 'Ingresso gratuito'

    return [{
        'name':        name[:150],
        'description': text[:350],
        'event_type':  _guess_type(text),
        'city':        ev_city,
        'region':      region,
        'address':     None,
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
        'is_recurring': bool(re.search(
            r'\bogni\s+(?:prima|seconda|terza|quarta|ultima)\s+(?:domenica|sabato|lunedì|martedì|mercoledì|giovedì|venerdì)\b'
            r'|\bogni\s+(?:domenica|sabato|martedì|mercoledì|giovedì|venerdì|lunedì)\b'
            r'|\b(?:mensile|settimanale|bimestrale)\b'
            r'|\bcadenza\s+mensile\b',
            text, re.IGNORECASE
        )),
        'categories':  [],
        'tags':        ['websearch-v3', urlparse(source_url).netloc.lstrip('www.')],
    }]


def _normalize_ai_event(raw: dict, region: str, src: str) -> dict | None:
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
        'city':        (raw.get('city') or region)[:80],
        'region':      region,
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
        'tags':        ['websearch-v3', 'ai-extracted'],
    }


# ── Entry point ───────────────────────────────────────────────────────────

def scrape(
    target_year: int,
    target_month: int,
    region: str | None = None,
) -> Generator[dict, None, None]:
    month_name  = MONTH_NAMES_IT[target_month]
    seen_events: set[str] = set()
    seen_urls:   set[str] = set()

    def _key(ev: dict) -> str:
        return f"{(ev.get('name') or '')[:35].lower()}|{(ev.get('start_date') or '')[:10]}|{(ev.get('city') or '').lower()}"

    def _emit(ev: dict) -> bool:
        k = _key(ev)
        if k in seen_events:
            return False
        seen_events.add(k)
        return True

    def _default_city(reg: str) -> str:
        cities = REGION_CITIES.get(reg, [])
        return cities[0] if cities else reg

    def _process(results: list[dict], reg: str) -> Generator[dict, None, None]:
        if not results:
            return
        city = _default_city(reg)

        # Aggrega snippet per Claude
        combined = '\n\n'.join(
            f"URL: {r.get('href','')}\nTitolo: {r.get('title','')}\nAnteprima: {r.get('body','')}"
            for r in results if r.get('title') and _is_vintage(
                (r.get('title', '') + ' ' + r.get('body', ''))
            )
        )

        # Rule-based su snippet
        for r in results:
            snippet = f"{r.get('title','')} {r.get('body','')}"
            for ev in _rule_extract(snippet, r.get('href','') or 'duckduckgo',
                                    target_year, target_month, city, reg):
                if _emit(ev):
                    yield ev

        # Claude Haiku su snippet aggregati
        if combined:
            for raw in _extract_with_ai(combined, reg, month_name, target_year, 'duckduckgo'):
                ev = _normalize_ai_event(raw, reg, 'duckduckgo')
                if ev and _emit(ev):
                    yield ev

        # Fetch pagine calendario + Claude
        for r in results:
            url = r.get('href', '')
            if not url or url in seen_urls or not _is_calendar_url(url):
                continue
            seen_urls.add(url)
            page = _fetch_page(url)
            if not page:
                continue
            # Rule-based sulla pagina
            for ev in _rule_extract(page, url, target_year, target_month, city, reg):
                if _emit(ev):
                    yield ev
            # Claude sulla pagina intera
            for raw in _extract_with_ai(page, reg, month_name, target_year, url):
                ev = _normalize_ai_event(raw, reg, url)
                if ev and _emit(ev):
                    yield ev
            time.sleep(0.8)

    if region:
        # ── Modalità regione specifica: tutte le query ─────────────────
        cities = REGION_CITIES.get(region, [])

        for template in REGION_TEMPLATES:
            query   = template.format(region=region, month=month_name, year=target_year)
            results = _ddg_search(query)
            yield from _process(results, region)

        for city in cities:
            for template in CITY_TEMPLATES:
                query   = template.format(city=city, month=month_name, year=target_year)
                results = _ddg_search(query)
                yield from _process(results, region)

        for site in REGION_LOCAL_SITES.get(region, []):
            query   = f'site:{site} mercatino antiquariato vintage {month_name} {target_year}'
            results = _ddg_search(query)
            yield from _process(results, region)

    else:
        # ── Modalità legacy: rotazione ─────────────────────────────────
        from ..regions import ITALIAN_REGIONS
        offset = (target_month - 1) % 4
        for reg in ITALIAN_REGIONS[offset * 5:(offset + 1) * 5]:
            for template in REGION_TEMPLATES[:8]:
                query   = template.format(region=reg, month=month_name, year=target_year)
                results = _ddg_search(query)
                yield from _process(results, reg)
            for city in REGION_CITIES.get(reg, [])[:3]:
                query   = f'mercatino antiquariato {city} {month_name} {target_year}'
                results = _ddg_search(query)
                yield from _process(results, reg)
