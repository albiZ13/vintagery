#!/usr/bin/env python3
"""
Aggregates JSON results from the 20 region research agents
and upserts everything into Supabase market_events.

Usage:
    python scraper/aggregate_agents.py
"""
import json, glob, os, sys, unicodedata, re
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
MONTH, YEAR = 6, 2026

def norm(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def dedup_key(ev: dict) -> str:
    return f"{norm(ev.get('name',''))}|{ev.get('start_date','')}|{norm(ev.get('city',''))}"

def insert_batch(supabase, events: list[dict]) -> tuple[int, list[str]]:
    inserted, errors = 0, []
    for ev in events:
        try:
            payload = {k: v for k, v in ev.items() if v is not None and v != ''}
            payload.update({
                'dedup_key':   dedup_key(ev),
                'source':      'scraper-ai-agent',
                'is_verified': False,
                'is_featured': False,
                'month':       MONTH,
                'year':        YEAR,
                'tags':        list(set((payload.get('tags') or []) + ['ai-agent', 'giugno-2026'])),
            })
            res = supabase.from_('market_events').upsert(
                payload, on_conflict='dedup_key', ignore_duplicates=True
            ).execute()
            if not getattr(res, 'error', None):
                inserted += 1
        except Exception as e:
            errors.append(f"{ev.get('name','?')} ({ev.get('city','?')}): {e}")
    return inserted, errors

def main():
    files = sorted(glob.glob('/tmp/vintagery_*.json'))
    if not files:
        print('Nessun file trovato in /tmp/vintagery_*.json')
        sys.exit(1)

    all_events: list[dict] = []
    for f in files:
        slug = Path(f).stem.replace('vintagery_', '')
        try:
            with open(f) as fh:
                data = json.load(fh)
            if isinstance(data, list):
                all_events.extend(data)
                print(f'✓ {slug}: {len(data)} eventi caricati')
            else:
                print(f'⚠ {slug}: formato non valido (atteso array)')
        except Exception as e:
            print(f'✗ {slug}: errore lettura — {e}')

    print(f'\nTotale eventi: {len(all_events)}')
    print('Inserimento in Supabase...\n')

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    inserted, errors = insert_batch(supabase, all_events)

    print(f'✅ Inseriti: {inserted} / {len(all_events)}')
    if errors:
        print(f'⚠  Errori ({len(errors)}):')
        for e in errors[:20]:
            print(f'   {e}')

if __name__ == '__main__':
    main()
