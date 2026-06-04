from __future__ import annotations
"""
Quality filter — valida che ogni evento sia realmente vintage/rivendita.

Pipeline:
  1. Scarta eventi senza campi obbligatori (nome, città, data)
  2. Claude Haiku (batch 15 eventi / chiamata) valuta:
     - L'evento appartiene al mondo vintage/antiquariato/rivendita?
     - Score 1-10
     - Corregge event_type se classificato male
  3. Scarta eventi con score < MIN_SCORE o fuori categoria

Costo: ~€0.001 per batch di 15 eventi = trascurabile.
"""
import json
import os
import re
from datetime import date as _date
from typing import Generator

BATCH_SIZE  = 15
MIN_SCORE   = 5   # 1-10, sotto questo soglia l'evento viene scartato

REQUIRED_FIELDS = ['name', 'city', 'start_date']

# Tipi di evento ammessi
VALID_TYPES = {
    'antiquariato', 'mercatino', 'svuotacantina', 'vinile',
    'fumetti', 'collezionismo', 'svendita', 'mercato',
}

_PROMPT = """\
Sei il responsabile qualità di Vintagery, la directory italiana di mercatini \
vintage e antiquariato. Valuta questi {n} eventi e decidi se ognuno appartiene \
alla directory.

INCLUDI (esempi): fiere dell'antiquariato, mercatini vintage/usato, \
svuotacantine, mercati delle pulci, brocante, fiere del vinile e dei dischi, \
mercatini del fumetto, fiere del collezionismo (monete/francobolli/giocattoli \
antichi/modellismo), kilo-vintage, svendite private, mercati dell'usato.

ESCLUDI: concerti, sagre gastronomiche, festival musicali, mostre d'arte \
moderna, mercati di prodotti freschi, fiere commerciali di prodotti nuovi, \
eventi sportivi, convegni, spettacoli teatrali, eventi enogastronomici puri.

Per ogni evento scrivi UNA riga JSON (nessun testo fuori dal JSON):
{{"i":{N},"ok":true/false,"score":1-10,"type":"antiquariato|mercatino|\
svuotacantina|vinile|fumetti|collezionismo|svendita","note":"max 8 parole"}}

EVENTI (indice | nome | tipo attuale | città | descrizione breve):
{events_text}
"""


# ── Validazione campi obbligatori ─────────────────────────────────────────

def _has_required(ev: dict) -> bool:
    for f in REQUIRED_FIELDS:
        if not ev.get(f):
            return False
    # Valida formato data
    sd = ev.get('start_date', '')
    try:
        _date.fromisoformat(sd)
        return True
    except (ValueError, TypeError):
        return False


def _normalize_type(ev: dict) -> dict:
    """Assegna event_type di default se mancante o non valido."""
    t = (ev.get('event_type') or '').lower()
    if t not in VALID_TYPES:
        desc = (ev.get('description') or ev.get('name') or '').lower()
        if 'svuotacantina' in desc:             ev['event_type'] = 'svuotacantina'
        elif 'vinile' in desc or 'dischi' in desc: ev['event_type'] = 'vinile'
        elif 'fumetti' in desc:                  ev['event_type'] = 'fumetti'
        elif 'collezion' in desc:                ev['event_type'] = 'collezionismo'
        elif 'antiquariato' in desc:             ev['event_type'] = 'antiquariato'
        else:                                    ev['event_type'] = 'mercatino'
    return ev


# ── Batch scoring con Claude Haiku ────────────────────────────────────────

def _score_batch(batch: list[dict], api_key: str) -> list[dict]:
    """Valida e punteggia un batch di eventi. Ritorna solo quelli approvati."""
    try:
        from anthropic import Anthropic

        lines = []
        for idx, ev in enumerate(batch):
            name = (ev.get('name') or '')[:60].replace('|', ' ')
            etype = ev.get('event_type', 'sconosciuto')
            city  = (ev.get('city') or '')[:30].replace('|', ' ')
            desc  = (ev.get('description') or '')[:80].replace('|', ' ').replace('\n', ' ')
            lines.append(f"{idx}|{name}|{etype}|{city}|{desc}")

        msg = Anthropic(api_key=api_key).messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=1024,
            messages=[{'role': 'user', 'content': _PROMPT.format(
                n=len(batch),
                events_text='\n'.join(lines),
                N='N',
            )}],
        )

        raw = msg.content[0].text.strip()

        scored_map: dict[int, dict] = {}
        for line in raw.split('\n'):
            line = line.strip()
            if not line.startswith('{'):
                continue
            try:
                obj = json.loads(line)
                scored_map[int(obj['i'])] = obj
            except Exception:
                continue

        passed: list[dict] = []
        for idx, ev in enumerate(batch):
            res   = scored_map.get(idx, {})
            ok    = res.get('ok', True)
            score = int(res.get('score', 5))

            if not ok or score < MIN_SCORE:
                continue

            ev = ev.copy()

            # Correggi event_type se Claude lo ha cambiato
            new_type = res.get('type', '')
            if new_type and new_type in VALID_TYPES:
                ev['event_type'] = new_type

            # Inietta quality score nei tag
            tags = [t for t in (ev.get('tags') or []) if not t.startswith('quality:')]
            ev['tags'] = tags + [f'quality:{score}']

            passed.append(ev)

        return passed

    except Exception as e:
        print(f'[quality] batch error: {e}')
        return batch   # In caso di errore lascia passare tutto


# ── Entry point ───────────────────────────────────────────────────────────

def filter_and_score(events: list[dict]) -> list[dict]:
    """
    Filtra e punteggia una lista di eventi.
    1. Scarta eventi senza campi obbligatori
    2. Valida con Claude Haiku (se API key disponibile)
    3. Ritorna solo eventi vintage-relevant con score >= MIN_SCORE
    """
    # Step 1: campi obbligatori + normalizza tipo
    candidates = []
    for ev in events:
        if not _has_required(ev):
            continue
        candidates.append(_normalize_type(ev))

    if not candidates:
        return []

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        # Senza AI: passa tutto ciò che ha i campi obbligatori
        return candidates

    # Step 2: batch AI scoring
    results: list[dict] = []
    for i in range(0, len(candidates), BATCH_SIZE):
        batch   = candidates[i:i + BATCH_SIZE]
        passed  = _score_batch(batch, api_key)
        results.extend(passed)

    return results
