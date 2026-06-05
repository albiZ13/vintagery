from __future__ import annotations
"""
Enricher v2 — ricerca attiva + Claude Haiku per ogni mercato nuovo.

Pipeline:
  1. DDG search "{nome} {città}" — trova pagina ufficiale o articoli
  2. Fetch della pagina più rilevante — estrae testo pulito
  3. Claude Haiku — scrive card completa con tutti i campi disponibili
  4. Merge risultato con dati grezzi

Attivato solo se ANTHROPIC_API_KEY è impostata.
Costo: ~€0.002 per mercato (search + fetch + Haiku).
"""

import json
import os
import re
import time
import unicodedata
from typing import Any

import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

# ── Prompt Haiku — ricerca completa ──────────────────────────────────────────

_PROMPT = """\
Sei un esperto di mercatini vintage e antiquariato italiani. \
Devi creare una scheda COMPLETA per questo mercato.

DATI RACCOLTI:
{raw_text}

TESTO PAGINA WEB (se disponibile):
{web_text}

Scrivi una scheda professionale e dettagliata. \
Rispondi SOLO con JSON valido, nessun testo fuori dal JSON:
{{
  "name": "nome ufficiale e formale del mercato",
  "description": "3-4 frasi specifiche: cosa si trova tipicamente, \
quanti espositori se noto, storia o caratteristiche uniche, atmosfera. \
Mai generico.",
  "tip": "1 consiglio pratico e concreto per chi ci va: orario ideale di arrivo, \
cosa cercare, parcheggio, periodo migliore, cosa portare. Mai frasi vuote.",
  "address": "indirizzo preciso con via e città, oppure null",
  "start_time": "HH:MM apertura, oppure null",
  "end_time": "HH:MM chiusura, oppure null",
  "price_info": "Ingresso gratuito | A pagamento (€X) | null",
  "website": "URL ufficiale se presente nei dati, oppure null",
  "instagram": "handle Instagram senza @, oppure null",
  "organizer": "nome organizzatore ufficiale se noto, oppure null",
  "categories": ["max 3 categorie"],
  "schedule_text": "descrizione umana cadenza, es: Ogni seconda domenica del mese",
  "is_recurring": true
}}

Categorie disponibili: Antiquariato, Vintage, Vinili, Fumetti, Libri, \
Abbigliamento, Arte, Ceramiche, Gioielli, Collezionismo, Usato, Design, Artigianato

REGOLE:
- description e tip devono essere SPECIFICI per questo mercato esatto
- Se non hai abbastanza info per un campo metti null, NON inventare
- is_recurring è true se ha cadenza fissa (mensile/settimanale), false altrimenti\
"""


# ── Funzioni di supporto ──────────────────────────────────────────────────────

def _norm(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def _ddg_search(query: str, max_results: int = 5) -> list[dict]:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region='it-it', max_results=max_results))
        time.sleep(1.0)
        return results
    except Exception:
        return []


def _fetch_page(url: str) -> str:
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept-Language': 'it-IT,it;q=0.9',
        }
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)
        return re.sub(r'\s+', ' ', text)[:4000]
    except Exception:
        return ''


def _research_market(name: str, city: str, source_url: str | None) -> str:
    """Cerca informazioni sul mercato via DDG e fetch pagina."""
    queries = [
        f'"{name}" {city} mercato antiquariato',
        f'{name} {city} orario cadenza antiquariato',
    ]
    if source_url and source_url.startswith('http'):
        page_text = _fetch_page(source_url)
        if len(page_text) > 300:
            return page_text[:3000]

    for query in queries:
        results = _ddg_search(query, max_results=4)
        for r in results:
            url = r.get('href', '')
            snippet = r.get('body', '')
            # Cerca pagine ufficiali o articoli dettagliati
            if any(kw in url.lower() for kw in [
                'comune', 'proloco', 'turismo', 'antiquari', 'fieraantiquaria',
                'mercatino', 'balon', 'fierionline', 'eventiesagre', 'cosedicasa',
            ]):
                page = _fetch_page(url)
                if len(page) > 500:
                    return page[:3000]
        # Fallback: aggregated snippets
        if results:
            combined = '\n\n'.join(
                f"Fonte: {r.get('href','')}\n{r.get('title','')}\n{r.get('body','')}"
                for r in results
            )
            if combined.strip():
                return combined[:2000]
    return ''


def _build_raw_text(raw: dict) -> str:
    parts = []
    if raw.get('name'):        parts.append(f"Nome: {raw['name']}")
    if raw.get('city'):        parts.append(f"Città: {raw['city']}")
    if raw.get('region'):      parts.append(f"Regione: {raw['region']}")
    if raw.get('address'):     parts.append(f"Indirizzo: {raw['address']}")
    if raw.get('description'): parts.append(f"Desc grezza: {raw['description'][:400]}")
    if raw.get('start_time'):  parts.append(f"Orario apertura: {raw['start_time']}")
    if raw.get('end_time'):    parts.append(f"Orario chiusura: {raw['end_time']}")
    if raw.get('price_info'):  parts.append(f"Ingresso: {raw['price_info']}")
    if raw.get('website'):     parts.append(f"Sito: {raw['website']}")
    if raw.get('organizer'):   parts.append(f"Organizzatore: {raw['organizer']}")
    if raw.get('tags'):        parts.append(f"Tags: {', '.join(raw['tags'])}")
    return '\n'.join(parts)


# ── Entry point ───────────────────────────────────────────────────────────────

def enrich_market(raw: dict) -> dict:
    """
    Ricerca attiva + Claude Haiku per popolare la card completa.
    Restituisce il dict arricchito (merge con raw).
    Se ANTHROPIC_API_KEY non è impostata, restituisce raw invariato.
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY', '').strip()
    if not api_key:
        return raw

    name = raw.get('name', '')
    city = raw.get('city', '')

    # Step 1: ricerca web
    web_text = _research_market(name, city, raw.get('source_url') or raw.get('website'))

    # Step 2: chiama Haiku
    raw_text = _build_raw_text(raw)
    try:
        from anthropic import Anthropic
        msg = Anthropic(api_key=api_key).messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=800,
            messages=[{'role': 'user', 'content': _PROMPT.format(
                raw_text=raw_text,
                web_text=web_text[:2000] if web_text else '(nessuna pagina trovata)',
            )}],
        )
        text = msg.content[0].text.strip()
        start = text.find('{')
        end   = text.rfind('}') + 1
        if start == -1 or end == 0:
            return raw
        data = json.loads(text[start:end])
    except Exception as e:
        print(f'[enricher] Haiku error "{name}": {e}')
        return raw

    # Step 3: merge
    enriched = dict(raw)

    if data.get('name') and len(data['name']) > 4:
        enriched['name'] = data['name'][:150]

    if data.get('description'):
        schedule = data.get('schedule_text', '')
        desc = data['description']
        if schedule:
            desc = f"{desc}\n\nCadenza: {schedule}"
        enriched['description'] = desc[:800]

    if data.get('tip'):
        enriched['tips'] = data['tip'][:400]

    for field in ('address', 'start_time', 'end_time', 'price_info', 'organizer'):
        if data.get(field):
            enriched[field] = data[field]

    if data.get('website') and data['website'].startswith('http'):
        enriched['website'] = data['website'][:300]

    if data.get('instagram'):
        enriched['instagram'] = data['instagram'].lstrip('@')[:80]

    if data.get('categories') and isinstance(data['categories'], list):
        enriched['categories'] = [str(c) for c in data['categories'][:3]]

    if 'is_recurring' in data:
        enriched['is_recurring'] = bool(data['is_recurring'])

    return enriched


def location_key(name: str, city: str) -> str:
    """
    Chiave morbida per dedup per nome+luogo (senza data).
    Rimuove parole generiche e tiene i primi 4 termini significativi.
    """
    STOP = {
        'mercatino', 'mercato', 'antiquariato', 'fiera', 'mostra', 'di', 'del',
        'delle', 'degli', 'il', 'la', 'lo', 'le', 'i', 'e', 'a', 'in', 'da',
        'mercatini', 'vintage', 'usato', 'pulci', 'antiquario', 'collezionismo',
    }
    words = [w for w in _norm(name).split() if w not in STOP and len(w) > 2]
    key = ' '.join(words[:4])
    return f"{_norm(city)}|{key}"


def market_exists_by_location(supabase: Any, name: str, city: str) -> bool:
    """
    Controlla se esiste già in DB un mercato con stesso nome+città
    (dedup morbido, indipendente dalla data).
    """
    loc_key = location_key(name, city)
    try:
        result = supabase.from_('market_events') \
            .select('id, name, city') \
            .ilike('city', f'%{city}%') \
            .limit(30) \
            .execute()
        for row in result.data or []:
            if location_key(row.get('name', ''), row.get('city', '')) == loc_key:
                return True
        return False
    except Exception:
        return False
