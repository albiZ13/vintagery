#!/usr/bin/env python3
"""
Vintagery — Comuni Markets Scraper (Gemini AI Edition)
Usa Gemini 2.0 Flash con Google Search grounding per trovare mercatini comune per comune.

Uso:
  python3 scripts/scrape-comuni.py                       # 107 capoluoghi
  python3 scripts/scrape-comuni.py --comuni              # ISTAT completo (~7900 comuni)
  python3 scripts/scrape-comuni.py --regione toscana
  python3 scripts/scrape-comuni.py --provincia PT
  python3 scripts/scrape-comuni.py --resume
  python3 scripts/scrape-comuni.py --limit 5            # test rapido
"""

import asyncio
import httpx
import json
import re
import unicodedata
import argparse
import sys
import os
from pathlib import Path
from datetime import date

BASE_DIR      = Path(__file__).parent.parent
DATA_DIR      = BASE_DIR / 'data'
OUTPUT_FILE   = DATA_DIR / 'comuni_markets.json'
PROGRESS_FILE = DATA_DIR / 'comuni_progress.json'
ENV_FILE      = BASE_DIR / '.env.local'

DATA_DIR.mkdir(exist_ok=True)

# ── Leggi env ──────────────────────────────────────────────────────────────────

def load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding='utf-8').split('\n'):
            if '=' in line and not line.startswith('#'):
                k, *v = line.split('=')
                env[k.strip()] = '='.join(v).strip().strip('"').strip("'")
    return env

env_vars = load_env()
GROQ_API_KEY = env_vars.get('GROQ_API_KEY', '') or os.environ.get('GROQ_API_KEY', '')

if not GROQ_API_KEY:
    print("✗ GROQ_API_KEY non trovata in .env.local")
    print("  Registrati su https://console.groq.com → API Keys → Create API key")
    print("  Poi aggiungi: GROQ_API_KEY=gsk_...")
    sys.exit(1)

GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
RATE_LIMIT_DELAY = 2.1  # 30 req/min free tier → 2s min + buffer

# ── Lista comuni ───────────────────────────────────────────────────────────────

ISTAT_URL = "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv"

CAPOLUOGHI = [
    ("Torino","TO","Piemonte"), ("Alessandria","AL","Piemonte"), ("Asti","AT","Piemonte"),
    ("Biella","BI","Piemonte"), ("Cuneo","CN","Piemonte"), ("Novara","NO","Piemonte"),
    ("Verbania","VB","Piemonte"), ("Vercelli","VC","Piemonte"),
    ("Aosta","AO","Valle d'Aosta"),
    ("Milano","MI","Lombardia"), ("Bergamo","BG","Lombardia"), ("Brescia","BS","Lombardia"),
    ("Como","CO","Lombardia"), ("Cremona","CR","Lombardia"), ("Lecco","LC","Lombardia"),
    ("Lodi","LO","Lombardia"), ("Mantova","MN","Lombardia"), ("Monza","MB","Lombardia"),
    ("Pavia","PV","Lombardia"), ("Sondrio","SO","Lombardia"), ("Varese","VA","Lombardia"),
    ("Bolzano","BZ","Trentino-Alto Adige"), ("Trento","TN","Trentino-Alto Adige"),
    ("Venezia","VE","Veneto"), ("Verona","VR","Veneto"), ("Vicenza","VI","Veneto"),
    ("Padova","PD","Veneto"), ("Treviso","TV","Veneto"), ("Belluno","BL","Veneto"),
    ("Rovigo","RO","Veneto"),
    ("Trieste","TS","Friuli-Venezia Giulia"), ("Udine","UD","Friuli-Venezia Giulia"),
    ("Pordenone","PN","Friuli-Venezia Giulia"), ("Gorizia","GO","Friuli-Venezia Giulia"),
    ("Genova","GE","Liguria"), ("Imperia","IM","Liguria"), ("La Spezia","SP","Liguria"),
    ("Savona","SV","Liguria"),
    ("Bologna","BO","Emilia-Romagna"), ("Ferrara","FE","Emilia-Romagna"),
    ("Forlì","FC","Emilia-Romagna"), ("Modena","MO","Emilia-Romagna"),
    ("Parma","PR","Emilia-Romagna"), ("Piacenza","PC","Emilia-Romagna"),
    ("Ravenna","RA","Emilia-Romagna"), ("Reggio Emilia","RE","Emilia-Romagna"),
    ("Rimini","RN","Emilia-Romagna"),
    ("Firenze","FI","Toscana"), ("Arezzo","AR","Toscana"), ("Grosseto","GR","Toscana"),
    ("Livorno","LI","Toscana"), ("Lucca","LU","Toscana"), ("Massa","MS","Toscana"),
    ("Pisa","PI","Toscana"), ("Pistoia","PT","Toscana"), ("Prato","PO","Toscana"),
    ("Siena","SI","Toscana"),
    ("Perugia","PG","Umbria"), ("Terni","TR","Umbria"),
    ("Ancona","AN","Marche"), ("Ascoli Piceno","AP","Marche"), ("Fermo","FM","Marche"),
    ("Macerata","MC","Marche"), ("Pesaro","PU","Marche"),
    ("Roma","RM","Lazio"), ("Frosinone","FR","Lazio"), ("Latina","LT","Lazio"),
    ("Rieti","RI","Lazio"), ("Viterbo","VT","Lazio"),
    ("L'Aquila","AQ","Abruzzo"), ("Chieti","CH","Abruzzo"), ("Pescara","PE","Abruzzo"),
    ("Teramo","TE","Abruzzo"),
    ("Campobasso","CB","Molise"), ("Isernia","IS","Molise"),
    ("Napoli","NA","Campania"), ("Avellino","AV","Campania"), ("Benevento","BN","Campania"),
    ("Caserta","CE","Campania"), ("Salerno","SA","Campania"),
    ("Bari","BA","Puglia"), ("Barletta","BT","Puglia"), ("Brindisi","BR","Puglia"),
    ("Foggia","FG","Puglia"), ("Lecce","LE","Puglia"), ("Taranto","TA","Puglia"),
    ("Potenza","PZ","Basilicata"), ("Matera","MT","Basilicata"),
    ("Catanzaro","CZ","Calabria"), ("Cosenza","CS","Calabria"), ("Crotone","KR","Calabria"),
    ("Reggio Calabria","RC","Calabria"), ("Vibo Valentia","VV","Calabria"),
    ("Palermo","PA","Sicilia"), ("Agrigento","AG","Sicilia"), ("Caltanissetta","CL","Sicilia"),
    ("Catania","CT","Sicilia"), ("Enna","EN","Sicilia"), ("Messina","ME","Sicilia"),
    ("Ragusa","RG","Sicilia"), ("Siracusa","SR","Sicilia"), ("Trapani","TP","Sicilia"),
    ("Cagliari","CA","Sardegna"), ("Nuoro","NU","Sardegna"), ("Oristano","OR","Sardegna"),
    ("Sassari","SS","Sardegna"), ("Sud Sardegna","SU","Sardegna"),
]

def parse_istat_csv(text):
    lines = [l for l in text.split('\n') if l.strip()]
    header_idx = None
    for i, line in enumerate(lines):
        if 'Denominazione' in line and ';' in line and len(line.split(';')) > 5:
            header_idx = i
            break
    if header_idx is None:
        return []
    headers = [h.strip().strip('"').lower() for h in lines[header_idx].split(';')]
    nome_idx = next(
        (i for i, h in enumerate(headers) if 'denominazione in italiano' in h),
        next((i for i, h in enumerate(headers) if 'denominazione' in h and 'comune' in h),
             next((i for i, h in enumerate(headers) if 'denominazione' in h), None))
    )
    prov_idx = next(
        (i for i, h in enumerate(headers) if 'sigla' in h and ('prov' in h or 'auto' in h)),
        None
    )
    reg_idx = next(
        (i for i, h in enumerate(headers) if 'regione' in h and 'denomin' in h),
        next((i for i, h in enumerate(headers) if 'regione' in h), None)
    )
    if nome_idx is None or prov_idx is None or reg_idx is None:
        print(f"  ISTAT: colonne non trovate. Headers [{len(headers)}]: {headers[:15]}")
        return []
    comuni = []
    for line in lines[header_idx + 1:]:
        parts = line.split(';')
        if len(parts) <= max(nome_idx, prov_idx, reg_idx):
            continue
        nome    = parts[nome_idx].strip().strip('"')
        prov    = parts[prov_idx].strip().strip('"')
        regione = parts[reg_idx].strip().strip('"')
        if nome and prov and regione and nome.lower() not in ('denominazione', 'nome'):
            comuni.append((nome, prov, regione))
    return comuni

async def load_comuni(regione_filter, prov_filter, use_istat):
    comuni = []
    if use_istat:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(ISTAT_URL, timeout=20, follow_redirects=True)
                if r.status_code == 200:
                    try:
                        text = r.content.decode('latin-1')
                    except Exception:
                        text = r.text
                    comuni = parse_istat_csv(text)
                    if comuni:
                        print(f"  ISTAT: {len(comuni)} comuni caricati")
                    else:
                        print("  ISTAT: parsing fallito, uso capoluoghi")
                        comuni = list(CAPOLUOGHI)
        except Exception as e:
            print(f"  ISTAT non raggiungibile ({e}), uso capoluoghi")
            comuni = list(CAPOLUOGHI)
    else:
        comuni = list(CAPOLUOGHI)
        print(f"  {len(comuni)} capoluoghi di provincia")
    if regione_filter:
        comuni = [(c, p, r) for c, p, r in comuni if r.lower() == regione_filter.lower()]
    if prov_filter:
        comuni = [(c, p, r) for c, p, r in comuni if p.upper() == prov_filter.upper()]
    return comuni

# ── Prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Sei un archivista esperto di mercati, fiere e manifestazioni vintage, antiquariato e collezionismo in Italia.
Conosci in modo capillare tutti i tipi di eventi dei comuni italiani:
- Fiere dell'antiquariato e del collezionismo (mensili, settimanali, annuali consolidate)
- Mercatini del riuso e del vintage, mercati delle pulci, bazar dei rigattieri
- Mercati tematici: dischi e vinili, fumetti, libri usati, francobolli, monete, giocattoli vintage, militaria
- Vendite organizzate da Pro Loco, parrocchie, associazioni culturali, AVIS, Croce Rossa
- Fiere paesane e sagre con sezione antiquariato/usato/vintage
- Mercati stagionali, mercati notturni estivi, svendite di palazzo e villa storica

Sai distinguere con precisione tra:
RICORRENTE: mercato o fiera con cadenza FISSA e CONTINUATIVA (settimanale, mensile, annuale da almeno 2 anni).
  Esempi: Gran Balon Torino (ogni 2ª domenica dal 1857), Fiera Antiquaria Arezzo (ogni 1ª domenica dal 1968),
  Mercato delle Pulci Piazza dei Ciompi Firenze (ogni ultimo domenica del mese), Porta Portese Roma (ogni domenica).
UNA_TANTUM: evento singolo, non periodico o di recente istituzione non consolidata.
  Esempi: svendita svuota-cantine AVIS giugno 2026, mercatino natalizio 2026, prima edizione fiera vintage.

Restituisci SOLO informazioni accurate e verificabili — mai inventare eventi. Se non sei certo che un evento esista realmente, non includerlo."""

def build_prompt(comune, prov, regione):
    today = date.today().isoformat()
    return f"""Effettua una ricerca APPROFONDITA ed ESAUSTIVA di tutti i mercatini, fiere e manifestazioni vintage/antiquariato/usato/collezionismo nel comune di {comune} (provincia di {prov}), {regione}.

FASE 1 — Raccogli tutti gli eventi di queste categorie:
1. Fiere e mercati dell'antiquariato periodici (mensili, bisettimanali, settimanali)
2. Mercati delle pulci, dei rigattieri e del brocantage
3. Mercatini vintage: abbigliamento, oggetti design anni '50-'90, modernariato
4. Mercati collezionistici tematici: dischi/vinili, fumetti, libri, francobolli, monete, giocattoli
5. Bazar e mercati dell'usato organizzati da Pro Loco, parrocchie, associazioni di volontariato
6. Fiere paesane, sagre e festival con sezione antiquariato/usato/vintage
7. Mercati stagionali (estivi o invernali), mercati notturni
8. Svendite di palazzo, vendite benefiche, svuota-cantine

FASE 2 — Per ciascun evento classifica con precisione:
- "ricorrente" SE: cadenza fissa (settimanale/mensile/annuale), esiste da almeno 2 anni, si ripeterà anche il prossimo anno
- "una_tantum" SE: evento singolo, data unica, prima edizione non consolidata, o incerto sulla periodicità

FASE 3 — Restituisci SOLO array JSON valido, zero testo prima o dopo:
[
  {{
    "tipo": "ricorrente",
    "name": "nome ufficiale ESATTO (es. Gran Balon, Porta Portese, Fiera Antiquaria di Arezzo)",
    "event_type": "antiquariato",
    "city": "{comune}",
    "region": "{regione}",
    "address": "Piazza o Via precisa dove si tiene (null se sconosciuto)",
    "schedule_notes": "Prima domenica del mese",
    "start_date": "YYYY-MM-DD",
    "start_time": "09:00",
    "end_time": "19:00",
    "price_info": "Ingresso gratuito",
    "categories": ["antiquariato", "vintage"],
    "tips": "Consiglio pratico specifico: orario ideale per arrivare, parcheggio, cosa cercare, cosa non perdere",
    "description": "2-3 frasi precise su storia, atmosfera, tipologia di merce, numero espositori, perché vale la visita.\\nCadenza: Prima domenica del mese",
    "website": "URL ufficiale solo se lo conosci con certezza, altrimenti null",
    "instagram": "handle senza @ solo se certo, altrimenti null"
  }}
]

Valori event_type: vintage | antiquariato | mercatino | collezionismo
Valori categories (minuscolo, max 4): antiquariato | collezionismo | vintage | oggetti d'epoca | usato | abbigliamento vintage | modernariato | libri e stampe | artigianato | mobili | dischi e vinili | brocantage | numismatica e filatelia | elettronica vintage | giocattoli e retrò | argenti e posateria | bigiotteria

Regole assolute:
- "ricorrente": description DEVE finire con "\\nCadenza: [schedule_notes]"
- start_date: prossima occorrenza futura rispetto a oggi ({today}), formato YYYY-MM-DD
- "una_tantum": ometti schedule_notes, includi start_date se la conosci
- NON includere: supermercati, mercati alimentari, negozi fissi, centri commerciali, mercati ortofrutticoli
- NON inventare: escludi tutto ciò di cui non sei certo — meglio meno risultati accurati che molti inventati
- Se non esiste nulla di rilevante a {comune}: rispondi []"""

# ── Chiamata Gemini ────────────────────────────────────────────────────────────

def extract_json_array(text):
    m = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', text)
    if m:
        return m.group(1)
    m = re.search(r'(\[[\s\S]*\])', text)
    if m:
        return m.group(1)
    return None

VALID_CATEGORIES = {
    'antiquariato','collezionismo','vintage',"oggetti d'epoca",'usato',
    'abbigliamento vintage','modernariato','libri e stampe','artigianato',
    'mobili','dischi e vinili','brocantage','numismatica e filatelia',
    'elettronica vintage','giocattoli e retrò','argenti e posateria','bigiotteria'
}
VALID_EVENT_TYPES = {'vintage','antiquariato','mercatino','collezionismo'}

def normalize_record(m, comune, regione):
    cats = [c.lower() for c in (m.get('categories') or []) if c.lower() in VALID_CATEGORIES]
    if not cats:
        cats = ['antiquariato']

    event_type = (m.get('event_type') or 'mercatino').lower()
    if event_type not in VALID_EVENT_TYPES:
        event_type = 'mercatino'

    desc = (m.get('description') or '').strip()
    schedule_notes = (m.get('schedule_notes') or '').strip()
    if m.get('tipo') == 'ricorrente' and schedule_notes:
        cadenza_line = f'Cadenza: {schedule_notes}'
        if cadenza_line not in desc:
            desc = desc.rstrip() + f'\n{cadenza_line}'

    return {
        'tipo':           m.get('tipo', 'ricorrente'),
        'name':           str(m.get('name', '')).strip()[:200],
        'event_type':     event_type,
        'city':           (m.get('city') or comune).strip(),
        'region':         (m.get('region') or regione).strip(),
        'address':        m.get('address') or None,
        'schedule_notes': schedule_notes or None,
        'start_date':     m.get('start_date') or None,
        'start_time':     m.get('start_time') or None,
        'end_time':       m.get('end_time') or None,
        'price_info':     m.get('price_info') or 'Ingresso gratuito',
        'categories':     cats,
        'tips':           (m.get('tips') or '').strip()[:1000] or None,
        'description':    desc[:2000] or None,
        'website':        m.get('website') or None,
        'instagram':      m.get('instagram') or None,
        'is_verified':    False,
        'is_featured':    False,
        'source':         'gemini-ai',
    }

async def query_groq(client, comune, prov, regione, retries=2):
    prompt  = build_prompt(comune, prov, regione)
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens":  4096,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }
    for attempt in range(retries + 1):
        try:
            r = await client.post(GROQ_URL, json=payload, headers=headers, timeout=45)
            if r.status_code == 429:
                print(f"\n  ⏳ Rate limit, attendo 62s…", end='', flush=True)
                await asyncio.sleep(62)
                continue
            if r.status_code != 200:
                return []
            data = r.json()
            text = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            json_str = extract_json_array(text)
            if not json_str:
                # response_format json_object wraps in {}, cerca array dentro
                try:
                    obj = json.loads(text)
                    raw = next((v for v in obj.values() if isinstance(v, list)), None)
                    if raw is None:
                        return []
                except Exception:
                    return []
            else:
                raw = json.loads(json_str)
            if not isinstance(raw, list):
                return []
            return [
                normalize_record(m, comune, regione)
                for m in raw
                if m.get('name') and len(str(m.get('name', '')).strip()) >= 4
            ]
        except json.JSONDecodeError:
            return []
        except Exception:
            if attempt < retries:
                await asyncio.sleep(5)
                continue
            return []
    return []

# ── Dedup locale ───────────────────────────────────────────────────────────────

STOP_WORDS = {
    'mercatino','mercato','fiera','antiquariato','vintage','usato',
    'di','del','della','dei','degli','delle','dell','il','la','le',
    'lo','gli','i','un','una','e','a','in','con','per','da'
}

def name_key(name, city=''):
    s = unicodedata.normalize('NFD', name.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    city_n = unicodedata.normalize('NFD', city.lower())
    city_n = ''.join(c for c in city_n if unicodedata.category(c) != 'Mn')
    s = re.sub(r"['\"]", '', s)
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    tokens = [t for t in s.split() if t not in STOP_WORDS and t != city_n and len(t) > 2]
    return ' '.join(sorted(tokens))

def deduplicate(markets):
    seen = set()
    out  = []
    for m in markets:
        key = (name_key(m.get('name',''), m.get('city','')), m.get('city','').lower().strip())
        if key[0] and key not in seen:
            seen.add(key)
            out.append(m)
    return out

# ── Main ───────────────────────────────────────────────────────────────────────

async def main(args):
    print(f"\n{'─'*60}")
    print("  Vintagery — Comuni Markets Scraper (Gemini AI)")
    print(f"{'─'*60}")

    print("\n▶ Carico lista comuni…")
    comuni = await load_comuni(args.regione, args.provincia, args.comuni)
    if args.limit:
        comuni = comuni[:args.limit]

    total = len(comuni)
    if total == 0:
        print("  Nessun comune trovato.")
        sys.exit(0)

    mins = (total * RATE_LIMIT_DELAY) / 60
    print(f"  {total} comuni — stima ~{mins:.0f} min")

    done_set    = set()
    all_results = []

    if args.resume and PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            progress = json.load(f)
        done_set    = set(tuple(x) for x in progress.get('done', []))
        all_results = progress.get('results', [])
        comuni      = [(c, p, r) for c, p, r in comuni if (c, p, r) not in done_set]
        print(f"  Resume: {len(done_set)} già processati, {len(comuni)} rimanenti")

    done      = list(done_set)
    remaining = len(comuni)

    async with httpx.AsyncClient() as client:
        for i, (comune, prov, regione) in enumerate(comuni, 1):
            pct = (i / remaining) * 100
            print(f"  [{i:4d}/{remaining}] {pct:5.1f}% — {comune} ({prov})", end='', flush=True)

            results = await query_groq(client, comune, prov, regione)
            n       = len(results)
            r_n     = sum(1 for r in results if r.get('tipo') == 'ricorrente')
            u_n     = n - r_n
            label   = f"{r_n}r+{u_n}u" if n else "0"
            print(f"  → {label}")

            all_results.extend(results)
            done.append((comune, prov, regione))

            if i % 10 == 0:
                with open(PROGRESS_FILE, 'w') as f:
                    json.dump({'done': done, 'results': all_results}, f, ensure_ascii=False)

            if i < remaining:
                await asyncio.sleep(RATE_LIMIT_DELAY)

    final      = deduplicate(all_results)
    ricorrenti = [m for m in final if m.get('tipo') == 'ricorrente']
    una_tantum = [m for m in final if m.get('tipo') == 'una_tantum']

    print(f"\n✓ Trovati: {len(final)} ({len(ricorrenti)} ricorrenti, {len(una_tantum)} una-tantum)")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    print(f"✓ Salvato in: {OUTPUT_FILE}")

    if PROGRESS_FILE.exists():
        PROGRESS_FILE.unlink()

    by_region = {}
    for m in final:
        r = m.get('region', 'N/A')
        by_region[r] = by_region.get(r, 0) + 1
    if by_region:
        print(f"\nPer regione:")
        for region, cnt in sorted(by_region.items(), key=lambda x: -x[1]):
            print(f"  {region:<30} {cnt:3d}")

    print(f"\n▶ Prossimo step:")
    print(f"  node scripts/import-comuni-markets.mjs\n")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--regione',  help='Filtra per regione (es: toscana)')
    parser.add_argument('--provincia', help='Filtra per sigla provincia (es: PT)')
    parser.add_argument('--comuni',   action='store_true', help='Usa ISTAT completo (~7900 comuni)')
    parser.add_argument('--resume',   action='store_true', help='Riprendi da checkpoint')
    parser.add_argument('--limit',    type=int, help='Limita a N comuni (test)')
    args = parser.parse_args()
    asyncio.run(main(args))
