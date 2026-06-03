from __future__ import annotations
"""
Web search scraper v2 — duckduckgo-search + Claude Haiku.

Pipeline per ogni query:
  1. DDGS.text() → risultati DDG puliti, nessun parsing HTML
  2. Claude Haiku → estrae eventi strutturati da titoli + snippet
  3. Per URL di calendari/aggregatori → fetch pagina intera + Claude estrazione

Vantaggi rispetto alla v1:
  - duckduckgo-search è una libreria dedicata, robusta e aggiornata
  - Claude Haiku capisce il linguaggio naturale: date scritte in parole,
    ricorrenze ("ogni prima domenica"), varianti regionali — tutto gestito
  - Nessuna regex fragile che si rompe al cambio layout
"""
import re
import time
import json
import os
import requests
from typing import Generator
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup

from ..regions import REGION_CITIES, REGION_LOCAL_SITES, city_to_region

MONTH_NAMES_IT = [
    '', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

# ── Query templates ────────────────────────────────────────────────────────

REGION_TEMPLATES = [
    # Aggregatori e ricerca generale
    'mercatini antiquariato {region} {month} {year}',
    'mercatino vintage {region} {month} {year}',
    'svuotacantine {region} {month} {year}',
    'fiera antiquariato {region} {month} {year}',
    'fiera collezionismo {region} {month} {year}',
    'mercato vinile dischi {region} {month} {year}',
    'fumetti vintage {region} {month} {year}',
    'mercatino usato {region} {month} {year}',
    # Ricorrenti mensili
    '{region} mercatino antiquariato ogni domenica {year}',
    '{region} fiera antiquariato prima domenica mese {year}',
    '{region} mercatino vintage ricorrente mensile',
    # Social (indicizzati da DDG)
    'site:facebook.com mercatino vintage {region} {month} {year}',
    'site:facebook.com svuotacantine {region} {month} {year}',
    'site:facebook.com fiera antiquariato {region} {month}',
    'site:instagram.com mercatino antiquariato {region} {month}',
    'tiktok mercatino vintage {region} {year}',
    'tiktok svuotacantina {region}',
    # Aggregatori specializzati
    'site:eventbrite.it antiquariato vintage {region} {month} {year}',
    'site:eventiesagre.it {region} {month} {year}',
    'site:fierionline.it {region} {month} {year}',
    'site:mercatinousato.it {region} mercatino',
    # Inglese (eventi internazionali / expat)
    'vintage market antique fair {region} {month} {year}',
    # Giornali locali
    'mercatino antiquariato {region} {year} notizie',
    'vintage {region} {month} {year} evento',
]

CITY_TEMPLATES = [
    'mercatino antiquariato {city} {month} {year}',
    'mercatino vintage {city} {month} {year}',
    'svuotacantina {city} {month} {year}',
    'fiera collezionismo {city} {month} {year}',
    'mercato vinile {city} {month} {year}',
]

# URL da cui conviene scaricare la pagina completa (calendari eventi)
CALENDAR_DOMAINS = {
    'eventiesagre.it', 'fierionline.it', 'mercatinousato.it',
    'eventbrite.it', 'cosafareintoscana.it', 'turismoroma.it',
    'emiliaromagnaturismo.it', 'visittuscany.com',
}

EVENT_KEYWORDS = {
    'mercatino', 'mercato', 'antiquariato', 'vintage', 'svuotacantina', 'svendita',
    'fiera', 'collezionismo', 'vinile', 'dischi', 'fumetti', 'bancarelle',
    'espositori', 'usato', 'rigattiere', 'seconda mano', 'brocante',
}

# ── Prompt per Claude Haiku ───────────────────────────────────────────────

_PROMPT = """\
Sei un esperto di mercatini vintage italiani. Analizza il testo seguente e \
estrai TUTTI gli eventi di mercatini, fiere antiquariato, svuotacantine, \
fiere del vinile/dischi, fumetti, collezionismo che si trovano nella \
regione {region} per {month} {year}.

TESTO:
{content}

Rispondi SOLO con un array JSON (nessun altro testo). Schema:
[{{
  "name": "nome evento",
  "city": "città",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD o null",
  "start_time": "HH:MM o null",
  "end_time": "HH:MM o null",
  "event_type": "antiquariato|mercatino|svuotacantina|vinile|fumetti|collezionismo|altro",
  "is_recurring": true o false,
  "address": "indirizzo completo o null",
  "price_info": "es. ingresso libero, 5€ o null",
  "organizer": "nome organizzatore o null",
  "description": "1-2 frasi descrittive"
}}]

Regole:
- Solo eventi REALI trovati nel testo, mai inventare
- Domeniche {month} {year}: se mese=giugno usa 7,14,21,28; luglio usa 5,12,19,26
- Per ricorrenze ("ogni prima domenica") calcola la data corretta
- Se la data non è chiara ma l'evento è reale, ometti start_date (null)
- Se non trovi eventi scrivi []
"""


# ── Funzioni di supporto ──────────────────────────────────────────────────

def _ddg_search(query: str, max_results: int = 10) -> list[dict]:
    """Cerca su DDG con la libreria ufficiale — nessun parsing HTML."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(
                query,
                region='it-it',
                max_results=max_results,
            ))
        time.sleep(1.0)
        return results  # [{title, href, body}]
    except Exception as e:
        print(f'[websearch] DDG error "{query[:60]}": {e}')
        time.sleep(3)
        return []


def _fetch_page(url: str) -> str:
    """Scarica una pagina e restituisce il testo pulito (max 6000 char)."""
    try:
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            ),
            'Accept-Language': 'it-IT,it;q=0.9,en;q=0.5',
        }
        resp = requests.get(url, headers=headers, timeout=12)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)
        text = re.sub(r'\s+', ' ', text)
        return text[:6000]
    except Exception as e:
        print(f'[websearch] fetch error {url[:60]}: {e}')
        return ''


def _is_calendar_url(url: str) -> bool:
    """True se l'URL è un sito di calendari eventi — vale la pena scaricare."""
    return any(d in url for d in CALENDAR_DOMAINS)


def _has_event_keywords(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in EVENT_KEYWORDS)


def _extract_with_ai(
    content: str,
    region: str,
    month_name: str,
    year: int,
    source_url: str,
) -> list[dict]:
    """
    Usa Claude Haiku per estrarre eventi strutturati dal contenuto.
    Fallback a lista vuota se API non disponibile.
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key or not content.strip():
        return []
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=2048,
            messages=[{
                'role': 'user',
                'content': _PROMPT.format(
                    region=region,
                    month=month_name,
                    year=year,
                    content=content,
                ),
            }],
        )
        raw = message.content[0].text.strip()
        start = raw.find('[')
        end   = raw.rfind(']') + 1
        if start == -1 or end == 0:
            return []
        events = json.loads(raw[start:end])
        for ev in events:
            ev['source_url'] = source_url
            ev['region']     = region
        return events
    except Exception as e:
        print(f'[websearch] AI extraction error: {e}')
        return []


def _normalize_event(ev: dict, region: str, source_url: str) -> dict | None:
    """Normalizza e valida un evento estratto da Claude."""
    name = (ev.get('name') or '').strip()
    city = (ev.get('city') or '').strip()
    if not name or len(name) < 5:
        return None

    # Valida data (può essere null)
    start_date = ev.get('start_date')
    if start_date:
        try:
            from datetime import date as _date
            _date.fromisoformat(start_date)
        except (ValueError, TypeError):
            start_date = None

    return {
        'name':        name[:150],
        'description': (ev.get('description') or '')[:400],
        'event_type':  ev.get('event_type', 'mercatino'),
        'city':        city or region,
        'region':      region,
        'address':     ev.get('address'),
        'start_date':  start_date,
        'end_date':    ev.get('end_date'),
        'start_time':  ev.get('start_time'),
        'end_time':    ev.get('end_time'),
        'website':     source_url,
        'instagram':   None,
        'price_info':  ev.get('price_info'),
        'organizer':   ev.get('organizer'),
        'source_url':  source_url,
        'is_verified': False,
        'is_featured': False,
        'is_recurring': bool(ev.get('is_recurring', False)),
        'categories':  [],
        'tags':        ['websearch-v2', 'ai-extracted'],
    }


# ── Entry point ───────────────────────────────────────────────────────────

def scrape(
    target_year: int,
    target_month: int,
    region: str | None = None,
) -> Generator[dict, None, None]:
    """
    Se `region` è specificata: ricerca esaustiva solo per quella regione.
    Altrimenti: fallback legacy (rotazione regioni).
    """
    month_name = MONTH_NAMES_IT[target_month]
    seen_events: set[str] = set()
    seen_urls:   set[str] = set()

    def _yield_from_content(content: str, source_url: str) -> Generator[dict, None, None]:
        """Estrae eventi dal contenuto con Claude e li yield."""
        if not _has_event_keywords(content):
            return
        events = _extract_with_ai(content, region or 'Italia', month_name, target_year, source_url)
        for raw in events:
            ev = _normalize_event(raw, region or 'Italia', source_url)
            if not ev:
                continue
            key = f"{ev['name'].lower()[:40]}|{ev.get('start_date', '')}|{ev['city'].lower()}"
            if key in seen_events:
                continue
            seen_events.add(key)
            yield ev

    def _process_ddg_results(results: list[dict]) -> Generator[dict, None, None]:
        """
        1. Aggrega tutti i snippet di una query → Claude estrae eventi
        2. Per URL di calendari → scarica pagina intera → Claude estrae
        """
        if not results:
            return

        # Fase 1: estrazione da titoli + snippet aggregati
        combined = '\n\n'.join(
            f"Fonte: {r.get('href', '')}\nTitolo: {r.get('title', '')}\nAnteprima: {r.get('body', '')}"
            for r in results if r.get('title')
        )
        if combined:
            yield from _yield_from_content(combined, 'duckduckgo-search')

        # Fase 2: fetch pagine complete dei siti calendario
        for r in results:
            url = r.get('href', '')
            if not url or url in seen_urls:
                continue
            if _is_calendar_url(url):
                seen_urls.add(url)
                page_text = _fetch_page(url)
                if page_text:
                    yield from _yield_from_content(page_text, url)
                time.sleep(0.8)

    if region:
        # ── Modalità regione specifica ─────────────────────────────────
        cities = REGION_CITIES.get(region, [])

        # Fase 1: query per regione
        for template in REGION_TEMPLATES:
            query = template.format(region=region, month=month_name, year=target_year)
            results = _ddg_search(query)
            yield from _process_ddg_results(results)

        # Fase 2: query per ogni città della regione
        for city in cities:
            for template in CITY_TEMPLATES:
                query = template.format(city=city, month=month_name, year=target_year)
                results = _ddg_search(query)
                yield from _process_ddg_results(results)

        # Fase 3: siti locali regionali (giornali, pro loco, turismo)
        for site in REGION_LOCAL_SITES.get(region, []):
            query = f'site:{site} mercatino antiquariato vintage {month_name} {target_year}'
            results = _ddg_search(query)
            yield from _process_ddg_results(results)

    else:
        # ── Modalità legacy: rotazione regioni ────────────────────────
        from ..regions import ITALIAN_REGIONS
        offset = (target_month - 1) % 4
        batch  = ITALIAN_REGIONS[offset * 5:(offset + 1) * 5]
        for reg in batch:
            cities = REGION_CITIES.get(reg, [])[:3]
            for template in REGION_TEMPLATES[:6]:
                query = template.format(region=reg, month=month_name, year=target_year)
                results = _ddg_search(query)
                yield from _process_ddg_results(results)
            for city in cities:
                query = f'mercatino antiquariato {city} {month_name} {target_year}'
                results = _ddg_search(query)
                yield from _process_ddg_results(results)
