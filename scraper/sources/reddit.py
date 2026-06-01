from __future__ import annotations
"""
Scraper per subreddit italiani — svuotacantina, mercatini vintage, svendite private.
Usa le API JSON pubbliche di Reddit (no auth necessaria per post pubblici).

Subreddit target: italy, milano, roma, firenze, torino, napoli, bologna, venezia,
                  palermo, bari, genova, vintage, vinili
"""
import re
import json
import time
from datetime import date, datetime, timezone
from typing import Generator

import httpx

from ..regions import city_to_region

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; VintagerieScraper/1.0; +https://vintagerie.it)',
    'Accept': 'application/json',
}

SUBREDDITS = [
    'Italia',       # più attivo del vecchio r/italy
    'italy',
    'milano',
    'roma',
    'firenze',
    'torino',
    'napoli',
    'bologna',
    'venezia',
    'palermo',
    'bari',
    'genova',
    'ItalyHardware',  # spesso ha sezione mercatino
    'vinile',
    'fumetti',
]

SEARCH_QUERIES = [
    'svuotacantina',
    'mercatino vintage',
    'svendita',
    'mercatino antiquariato',
    'vinili vendita',
    'fumetti mercatino',
    'mercato usato',
    'vintage abbigliamento vendita',
    'collezionismo mercatino',
]

KEYWORD_TO_TYPE = {
    'svuotacantina': 'svuotacantina',
    'svendita':      'svendita',
    'vintage':       'mercatino',
    'mercatino':     'mercatino',
    'antiquariato':  'antiquariato',
    'vinili':        'vinili',
    'vinile':        'vinili',
    'fumetti':       'fumetti',
    'collezion':     'collezionismo',
    'memorabilia':   'memorabilia',
}

EVENT_KEYWORDS = {
    'svuotacantina', 'svendita', 'vintage', 'mercatino', 'antiquariato',
    'vinili', 'vinile', 'fumetti', 'collezionismo', 'memorabilia',
    'brocante', 'usato', 'second hand', 'retro',
}

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

CITY_PATTERNS = [
    r'\b(Milano|Roma|Napoli|Torino|Bologna|Firenze|Venezia|Palermo|Catania|'
    r'Genova|Bari|Verona|Padova|Brescia|Bergamo|Trieste|Taranto|Modena|'
    r'Reggio Emilia|Reggio Calabria|Parma|Perugia|Livorno|Cagliari|'
    r'Salerno|Lecce|Foggia|Rimini|Ravenna|Ferrara|Bolzano|Trento|'
    r'Arezzo|Siena|Pisa|Lucca|Pistoia|Prato|Ancona|Pescara|Matera|'
    r'Cosenza|Catanzaro|Messina|Siracusa|Sassari|Nuoro)\b',
]


def _is_relevant(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in EVENT_KEYWORDS)


def _guess_type(text: str) -> str:
    t = text.lower()
    for kw, etype in KEYWORD_TO_TYPE.items():
        if kw in t:
            return etype
    return 'mercatino'


def _extract_city(text: str) -> str | None:
    for pattern in CITY_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _parse_date(text: str, target_year: int, target_month: int) -> str | None:
    """Extract first plausible date from Reddit post text."""
    t = text.lower()

    # dd/mm/yyyy or dd-mm-yyyy
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', t)
    if m:
        d, mo, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f'{yr:04d}-{mo:02d}-{d:02d}'

    # dd/mm (no year — assume target year)
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})(?!\d)', t)
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if 1 <= d <= 31 and 1 <= mo <= 12 and mo == target_month:
            return f'{target_year:04d}-{mo:02d}-{d:02d}'

    # "31 maggio" / "sabato 14 giugno"
    m = re.search(r'(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)?\s*'
                  r'(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?', t)
    if m:
        day = int(m.group(1))
        mo_word = m.group(2)[:3]
        mo = MONTHS_IT.get(mo_word)
        yr = int(m.group(3)) if m.group(3) else target_year
        if mo and 1 <= day <= 31 and mo == target_month:
            return f'{yr:04d}-{mo:02d}-{day:02d}'

    return None


def _post_to_event(post: dict, target_year: int, target_month: int) -> dict | None:
    title = post.get('title', '')
    body  = post.get('selftext', '')
    text  = f'{title} {body}'
    url   = 'https://reddit.com' + post.get('permalink', '')
    subreddit = post.get('subreddit', '')

    if not _is_relevant(text):
        return None

    # Skip posts with no date information
    start_date = _parse_date(text, target_year, target_month)
    if not start_date:
        return None

    # Validate date is in the target month
    try:
        d = date.fromisoformat(start_date)
        if d.month != target_month or d.year != target_year:
            return None
    except ValueError:
        return None

    city = _extract_city(text)
    if not city:
        # Try to infer from subreddit name
        city_from_sub = {
            'milano': 'Milano', 'roma': 'Roma', 'firenze': 'Firenze',
            'torino': 'Torino', 'napoli': 'Napoli', 'bologna': 'Bologna',
            'venezia': 'Venezia', 'palermo': 'Palermo', 'bari': 'Bari',
            'genova': 'Genova',
        }.get(subreddit.lower())
        if city_from_sub:
            city = city_from_sub
        else:
            return None  # skip if no city found

    # Build clean description from body (first 300 chars)
    desc = re.sub(r'\s+', ' ', body.strip())[:300] if body.strip() else None

    # Extract price info
    price_m = re.search(r'(?:ingresso|entrata|biglietto)[:\s]*([^\.\n]{3,40})', text, re.IGNORECASE)
    price_info = price_m.group(1).strip() if price_m else None
    if re.search(r'\bgratuito\b|\bgratis\b|\bfree\b|\blibero\b', text, re.IGNORECASE):
        price_info = 'Ingresso gratuito'

    # Extract address
    addr_m = re.search(r'(?:via|piazza|corso|viale|largo)\s+[A-Za-zÀ-ú\s]{3,40}(?:,\s*\d+)?', text, re.IGNORECASE)
    address = addr_m.group(0).strip() if addr_m else None

    return {
        'name':         title[:150],
        'description':  desc,
        'event_type':   _guess_type(text),
        'city':         city,
        'region':       city_to_region(city),
        'address':      address,
        'start_date':   start_date,
        'end_date':     None,
        'start_time':   None,
        'end_time':     None,
        'website':      url,
        'instagram':    None,
        'price_info':   price_info,
        'organizer':    f'u/{post.get("author", "reddit")}',
        'source_url':   url,
        'is_verified':  False,
        'is_featured':  False,
        'is_recurring': False,
        'categories':   [],
        'tags':         ['reddit', f'r/{subreddit}'],
    }


def _fetch_reddit_json(url: str) -> list[dict]:
    """Fetch Reddit public JSON API (no auth). Returns list of post data dicts."""
    try:
        resp = httpx.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        if resp.status_code != 200:
            return []
        data = resp.json()
        children = data.get('data', {}).get('children', [])
        return [c.get('data', {}) for c in children]
    except Exception as e:
        print(f'[reddit] fetch {url}: {e}')
        return []


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    seen: set[str] = set()

    # 1. Global Reddit search — Italian keywords, last year of posts
    for query in SEARCH_QUERIES:
        q = query.replace(' ', '+')
        url = (
            f'https://www.reddit.com/search.json'
            f'?q={q}+Italia&sort=new&t=year&limit=25'
        )
        posts = _fetch_reddit_json(url)
        for post in posts:
            ev = _post_to_event(post, target_year, target_month)
            if not ev:
                continue
            key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
            if key in seen:
                continue
            seen.add(key)
            yield ev
        time.sleep(1)  # Reddit rate limit: ~1 req/sec

    # 2. Subreddit-specific search (city + topic subs)
    for sub in SUBREDDITS:
        for query in ['svuotacantina', 'mercatino vintage', 'svendita', 'mercato usato']:
            q = query.replace(' ', '+')
            url = (
                f'https://www.reddit.com/r/{sub}/search.json'
                f'?q={q}&sort=new&restrict_sr=1&t=year&limit=25'
            )
            posts = _fetch_reddit_json(url)
            for post in posts:
                ev = _post_to_event(post, target_year, target_month)
                if not ev:
                    continue
                key = f'{ev["name"]}:{ev["start_date"]}:{ev["city"]}'
                if key in seen:
                    continue
                seen.add(key)
                yield ev
            time.sleep(1)
