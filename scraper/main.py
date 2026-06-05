from __future__ import annotations
"""
Vintagerie Event Scraper
Runs as standalone script or FastAPI service.

Usage:
  python -m scraper.main                         # current + next month
  python -m scraper.main --month 6 --year 2026   # specific month
  uvicorn scraper.main:app --port 8001            # as HTTP service
"""
import os
import re
import unicodedata
import argparse
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from supabase import create_client, Client
from scrapling.fetchers import Fetcher, StealthyFetcher

# Configurazione globale scrapling — disabilita auto_match (non serve)
# Fatto qui una volta sola vale per tutti i moduli importati
try:
    StealthyFetcher.configure(auto_match=False)
    Fetcher.configure(auto_match=False)
except Exception:
    pass

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

# Confidence scores per source (0.0–1.0)
SOURCE_CONFIDENCE = {
    'vinokilo':        1.0,   # official site, verified events
    'recurring_fairs': 1.0,   # hardcoded verified fairs
    'neventum':        0.85,  # B2B event directory
    'eventbrite':      0.75,  # official platform, organizer-submitted
    'comuni':          0.70,  # regional tourism portals + municipal sites
    'cosedicasa':      0.65,  # community calendar
    'websearch':       0.55,  # DuckDuckGo internet search
    'brand_sales':     0.60,  # Fair price vintage + brand sale sites
    'bakeca':          0.45,  # classified ads bakeca.it
    'kijiji':          0.40,  # classified ads kijiji.it
    'subito':          0.40,  # classified ads subito.it
    'reddit':          0.35,  # user posts on Italian subreddits
    'telegram':        0.30,  # public Telegram channels
    'facebook':        0.25,  # public group posts, unverified
}


def _dedup_key(name: str, start_date: str, city: str) -> str:
    """Dedup key per data+nome+città (usato per eventi one-time e ricorrenti mensili)."""
    def norm(s: str) -> str:
        s = unicodedata.normalize('NFD', s.lower())
        s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
        s = re.sub(r'[^a-z0-9\s]', '', s)
        return re.sub(r'\s+', ' ', s).strip()
    return f'{norm(name)}|{start_date}|{norm(city)}'


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert_event(supabase: Client, ev: dict, source: str, month: int, year: int) -> bool:
    confidence = SOURCE_CONFIDENCE.get(source, 0.3)

    desc = ev.get('description') or ''
    key  = _dedup_key(ev['name'], ev['start_date'], ev['city'])

    payload = {
        'name':         ev['name'],
        'description':  desc,
        'event_type':   ev.get('event_type', 'mercatino'),
        'city':         ev['city'],
        'region':       ev.get('region', 'Italia'),
        'address':      ev.get('address'),
        'lat':          ev.get('lat'),
        'lng':          ev.get('lng'),
        'start_date':   ev['start_date'],
        'end_date':     ev.get('end_date'),
        'start_time':   ev.get('start_time'),
        'end_time':     ev.get('end_time'),
        'website':      ev.get('website'),
        'instagram':    ev.get('instagram'),
        'price_info':   ev.get('price_info'),
        'organizer':    ev.get('organizer'),
        'source_url':   ev.get('source_url'),
        'source':       f'scraper-{source}',
        'is_verified':  confidence >= 0.75,
        'is_featured':  False,
        'is_recurring': ev.get('is_recurring', False),
        'categories':   ev.get('categories') or [],
        'tags':         (ev.get('tags') or []) + [f'confidence:{int(confidence*100)}'],
        'month':        month,
        'year':         year,
        'dedup_key':    key,
    }

    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}

    result = supabase.from_('market_events').upsert(
        payload,
        on_conflict='dedup_key',
        ignore_duplicates=True,
    ).execute()

    return not bool(getattr(result, 'error', None))


def delete_recurring_search_data(supabase: Client) -> int:
    """Elimina tutti i record trovati dallo scraper recurring-search prima di una nuova run."""
    result = supabase.from_('market_events').delete().eq('source', 'scraper-italy_recurring').execute()
    deleted = len(result.data) if result.data else 0
    print(f'[recurring] eliminati {deleted} record precedenti (source=scraper-italy_recurring)')
    return deleted


def run_recurring_search(month: int, year: int) -> dict:
    """
    Ricerca sistematica mercati ricorrenti in tutta Italia.
    - Dedup morbido: stesso nome+città → skip (indipendente dalla data)
    - Enricher: DDG search + Claude Haiku per ogni mercato nuovo
    """
    from .sources import italy_recurring_search
    from .enricher import enrich_market, market_exists_by_location

    supabase = get_supabase()
    SOURCE_CONFIDENCE['italy_recurring'] = 0.60

    inserted = 0
    filtered = 0
    enriched = 0
    errors: list[str] = []

    try:
        for ev in italy_recurring_search.scrape(year, month):
            if not ev.get('is_recurring'):
                filtered += 1
                continue
            try:
                # Dedup morbido: stessa città+nome → skip
                if market_exists_by_location(supabase, ev.get('name', ''), ev.get('city', '')):
                    filtered += 1
                    continue
                # Arricchimento completo con DDG + Haiku
                ev = enrich_market(ev)
                enriched += 1
                if upsert_event(supabase, ev, 'italy_recurring', month, year):
                    inserted += 1
            except Exception as e:
                errors.append(str(e))
    except Exception as e:
        errors.append(f'scraper crashed: {e}')

    result = {
        'italy_recurring': {
            'inserted':   inserted,
            'enriched':   enriched,
            'filtered':   filtered,
            'errors':     errors,
            'confidence': 0.60,
        }
    }
    print(f'[italy_recurring] inserted={inserted} enriched={enriched} filtered_out={filtered} errors={len(errors)}')
    return result


def run_scrape(month: int, year: int, source_filter: list[str] | None = None, region: str | None = None) -> dict:
    from .sources import (
        vinokilo, eventbrite, subito, facebook, neventum, cosedicasa,
        telegram, recurring_fairs, comuni, reddit, bakeca, kijiji,
        websearch, brand_sales, aggregators,
    )
    from .quality import filter_and_score

    supabase = get_supabase()
    results: dict[str, dict] = {}

    sources = [
        ('recurring_fairs', recurring_fairs.scrape),   # 1.0 — hardcoded verified
        ('vinokilo',        vinokilo.scrape),           # 1.0 — official site
        ('aggregators',     aggregators.scrape),        # 0.90 — direct aggregator sites
        ('neventum',        neventum.scrape),           # 0.85 — B2B directory
        ('eventbrite',      eventbrite.scrape),         # 0.75 — official platform
        ('comuni',          comuni.scrape),             # 0.70 — regional portals
        ('cosedicasa',      cosedicasa.scrape),         # 0.65 — community calendar
        ('brand_sales',     brand_sales.scrape),        # 0.60 — brand/fair price
        ('websearch',       websearch.scrape),          # 0.55 — DDG + Claude Haiku
        ('bakeca',          bakeca.scrape),             # 0.45 — classifieds bakeca.it
        ('kijiji',          kijiji.scrape),             # 0.40 — classifieds kijiji.it
        ('subito',          subito.scrape),             # 0.40 — classifieds subito.it
        ('reddit',          reddit.scrape),             # 0.35 — Italian subreddits
        ('telegram',        telegram.scrape),           # 0.30 — public channels
        ('facebook',        facebook.scrape),           # 0.25 — public groups
    ]

    # Aggiungi confidence score per aggregators
    SOURCE_CONFIDENCE['aggregators'] = 0.90

    if source_filter:
        sources = [(n, fn) for n, fn in sources if n in source_filter]

    for source_name, scrape_fn in sources:
        inserted  = 0
        filtered  = 0
        errors: list[str] = []

        try:
            import inspect
            sig    = inspect.signature(scrape_fn)
            kwargs = {'region': region} if region and 'region' in sig.parameters else {}

            # Raccogli eventi in batch per il quality filter
            raw_batch: list[dict] = []
            for ev in scrape_fn(year, month, **kwargs):
                if region and ev.get('region') and ev['region'] != region:
                    continue
                raw_batch.append(ev)

            # Applica quality filter (Claude Haiku) — salta per fonti già verificate
            SKIP_QUALITY = {'recurring_fairs', 'vinokilo'}
            if source_name in SKIP_QUALITY:
                validated = raw_batch
            else:
                pre_count = len(raw_batch)
                validated = filter_and_score(raw_batch)
                filtered  = pre_count - len(validated)

            # Upsert eventi validati con dedup morbido (nome+città) + enricher
            from .enricher import enrich_market, market_exists_by_location
            for ev in validated:
                try:
                    # Dedup morbido: stesso nome+città già in DB → salta
                    if market_exists_by_location(supabase, ev.get('name', ''), ev.get('city', '')):
                        filtered += 1
                        continue
                    # Arricchimento AI per mercati non già in DB
                    ev = enrich_market(ev)
                    if upsert_event(supabase, ev, source_name, month, year):
                        inserted += 1
                except Exception as e:
                    errors.append(str(e))

        except Exception as e:
            errors.append(f'scraper crashed: {e}')

        results[source_name] = {
            'inserted': inserted,
            'filtered': filtered,
            'errors':   errors,
            'confidence': SOURCE_CONFIDENCE.get(source_name),
        }
        print(f'[{source_name}] inserted={inserted} filtered_out={filtered} errors={len(errors)}')

    return results


# ── FastAPI app (for HTTP trigger from Next.js) ────────────────────────────

app = FastAPI(title='Vintagerie Scraper')


@app.post('/scrape')
async def scrape_endpoint(
    month: int = Query(default=None),
    year:  int = Query(default=None),
    secret: str = Query(default=None),
):
    if secret != os.environ.get('CRON_SECRET'):
        raise HTTPException(status_code=401, detail='Unauthorized')

    now = datetime.now()
    m = month or now.month
    y = year or now.year

    results = run_scrape(m, y)
    total = sum(r['inserted'] for r in results.values())
    return {'success': True, 'month': m, 'year': y, 'total_inserted': total, 'by_source': results}


@app.post('/scrape-recurring')
async def scrape_recurring_endpoint(
    month:  int = Query(default=None),
    year:   int = Query(default=None),
    secret: str = Query(default=None),
):
    """
    Ricerca sistematica mercati ricorrenti — tutta Italia, zero AI.
    Cancella dati precedenti e ri-scansiona regione per regione.
    """
    if secret != os.environ.get('CRON_SECRET'):
        raise HTTPException(status_code=401, detail='Unauthorized')

    now = datetime.now()
    m = month or now.month
    y = year  or now.year

    results = run_recurring_search(m, y)
    total   = sum(r['inserted'] for r in results.values())
    return {'success': True, 'month': m, 'year': y, 'total_inserted': total, 'by_source': results}


@app.get('/health')
async def health():
    return {'status': 'ok'}


# ── CLI entry point ────────────────────────────────────────────────────────

if __name__ == '__main__':
    from .scheduler import ALL_SOURCES
    parser = argparse.ArgumentParser()
    parser.add_argument('--month',  type=int,    default=None)
    parser.add_argument('--year',   type=int,    default=None)
    parser.add_argument('--region', type=str,    default=None, help='Limita a una regione specifica')
    parser.add_argument('--sources', nargs='+',  default=None, choices=ALL_SOURCES)
    parser.add_argument(
        '--mode', type=str, default=None,
        choices=['recurring'],
        help='recurring = ricerca sistematica mercati ricorrenti (cancella dati precedenti)',
    )
    args = parser.parse_args()

    now = datetime.now()
    month = args.month or now.month
    year  = args.year  or now.year

    if args.mode == 'recurring':
        print(f'Ricerca mercati ricorrenti — {month:02d}/{year}')
        print('Questo processo cancella i dati precedenti e ri-scansiona tutta Italia.')
        results = run_recurring_search(month, year)
    else:
        label = f'{month:02d}/{year}' + (f' [{args.region}]' if args.region else ' [tutte le regioni]')
        print(f'Scraping events for {label}...')
        results = run_scrape(month, year, source_filter=args.sources, region=args.region)

    total = sum(r['inserted'] for r in results.values())
    print(f'\nDone. Total inserted: {total}')
    for src, r in results.items():
        print(f'  {src}: {r["inserted"]} events (confidence {r.get("confidence", 0)*100:.0f}%)')
