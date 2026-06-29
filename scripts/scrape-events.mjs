/**
 * Vintagery — Scraper eventi itineranti una-tantum
 *
 * Cerca online le prossime tappe italiane degli organizzatori itineranti
 * (Vinokilo, Fair Priced Vintage, Qlhype, Remira Market, VGMT, East Market speciali)
 * e le inserisce in market_events con is_recurring = false.
 *
 * Uso:
 *   node scripts/scrape-events.mjs
 *
 * Variabili richieste (env o .env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   ANTHROPIC_API_KEY
 *
 * Schedulato ogni 1° e 20° del mese via GitHub Actions.
 */

import { createClient }  from '@supabase/supabase-js'
import Anthropic          from '@anthropic-ai/sdk'
import { readFileSync }   from 'fs'
import { resolve }        from 'path'

// ── Env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  if (process.env.SUPABASE_URL) return process.env
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    return Object.fromEntries(
      raw.split('\n').filter(l => l.includes('=')).map(l => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      })
    )
  } catch { return {} }
}

const env       = loadEnv()
const supabase  = createClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_KEY'])
const anthropic = new Anthropic({ apiKey: env['ANTHROPIC_API_KEY'] })

const today      = new Date()
const todayStr   = today.toISOString().slice(0, 10)
const horizon    = new Date(today.getFullYear(), today.getMonth() + 2, 28)
const horizonStr = horizon.toISOString().slice(0, 10)

const ITALIAN_REGIONS = new Set([
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto',
])

// ── Organizzatori ────────────────────────────────────────────────────────────

const ORGANIZERS = [
  {
    name:       'Vinokilo',
    event_type: 'vinokilo',
    organizer:  'Vinokilo',
    website:    'https://vinokilo.events',
    prompt:     `Cerca le prossime tappe ITALIANE di Vinokilo (il mercatino kilo vintage con biglietto d'ingresso).
Sito ufficiale: https://vinokilo.events
Cerca anche "vinokilo italia 2026" e "vinokilo eventi".
`,
  },
  {
    name:       'Fair Priced Vintage',
    event_type: 'fair_price',
    organizer:  'Fair Priced Vintage',
    website:    'https://fairpricedvintage.com',
    prompt:     `Cerca le prossime tappe ITALIANE di Fair Priced Vintage (mercatino con prezzi fissi, ingresso a pagamento).
Sito ufficiale: https://fairpricedvintage.com
Cerca anche "fair priced vintage italia 2026" e "fair priced vintage prossime date".
`,
  },
  {
    name:       'Qlhype',
    event_type: 'private_sale',
    organizer:  'Qlhype',
    website:    'https://qlhype.com',
    prompt:     `Cerca le prossime tappe ITALIANE di Qlhype Private Sale (vendita privata di abbigliamento luxury e vintage, accesso su registrazione).
Sito ufficiale: https://qlhype.com
Cerca anche "qlhype eventi 2026" e "qlhype private sale prossime date italia".
`,
  },
  {
    name:       'Remira Market',
    event_type: 'vintage_market',
    organizer:  'Remira Market',
    website:    'https://remiramarket.com',
    prompt:     `Cerca le prossime tappe ITALIANE di Remira Market (mercatino vintage eco-friendly itinerante).
Sito ufficiale: https://remiramarket.com
Cerca anche "remira market prossime date 2026" e "remira market eventi italia".
`,
  },
  {
    name:       'VGMT',
    event_type: 'vintage_market',
    organizer:  'VGMT Vintage Market Roma',
    website:    'https://vintagemarketroma.it',
    prompt:     `Cerca le prossime edizioni speciali e pop-up del VGMT Vintage Market Roma (incluse edizioni "Fuori Mercato" e trasferte fuori Roma).
Sito ufficiale: https://vintagemarketroma.it
Cerca anche "VGMT fuori mercato 2026" e "VGMT pop-up eventi estate 2026".
`,
  },
  {
    name:       'East Market Milano — edizioni speciali',
    event_type: 'mercatino',
    organizer:  'East Market Milano',
    website:    'https://eastmarketmilano.com',
    prompt:     `Cerca le prossime edizioni SPECIALI e non-standard di East Market Milano (MINI EAST, edizioni in location diverse da quelle abituali).
NON cercare le edizioni mensili regolari.
Sito ufficiale: https://eastmarketmilano.com
Cerca anche "East Market Mini edizione speciale 2026" e "East Market Milano eventi estate 2026".
`,
  },
]

// ── Prompt base ──────────────────────────────────────────────────────────────

function buildPrompt(org) {
  return `Sei un assistente che trova eventi vintage italiani.

Data odierna: ${todayStr}
Cerca eventi dal ${todayStr} al ${horizonStr} (circa 2 mesi).

${org.prompt}

Per ogni evento trovato in ITALIA restituisci un JSON array. Se non trovi nulla, restituisci [].
Solo eventi con date CERTE e FUTURE. Ignora eventi già passati.

Formato richiesto (array di oggetti):
[
  {
    "name": "Nome evento completo",
    "city": "Città",
    "region": "Regione italiana (es. Lombardia, Lazio)",
    "address": "Indirizzo completo o null",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD o null se evento singolo",
    "start_time": "HH:MM o null",
    "end_time": "HH:MM o null",
    "price_info": "es. 'Ingresso gratuito', '5€', 'Su registrazione' o null",
    "website": "URL evento o sito organizzatore",
    "description": "1-2 frasi descrittive, solo fatti certi",
    "confidence": "high o medium"
  }
]

Regole assolute:
- Solo eventi in Italia (no Svizzera, no estero)
- start_date deve essere >= ${todayStr}
- confidence "high" solo se data e città sono certe da fonte ufficiale
- description: max 2 frasi, niente numeri di telefono, niente URL
- Rispondi SOLO con il JSON array, nessun altro testo`
}

// ── Parsing risposta Claude ──────────────────────────────────────────────────

function extractJson(content) {
  if (!content) return []
  const blocks = content.filter(b => b.type === 'text').map(b => b.text).join('')
  const match  = blocks.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

// ── Dedup: controlla se l'evento esiste già ──────────────────────────────────

async function alreadyExists(name, startDate) {
  const { data } = await supabase
    .from('market_events')
    .select('id')
    .ilike('name', `%${name.slice(0, 20)}%`)
    .eq('start_date', startDate)
    .limit(1)
  return (data ?? []).length > 0
}

// ── Ricerca per un organizzatore ─────────────────────────────────────────────

async function scrapeOrganizer(org) {
  console.log(`\n── ${org.name} ─────────────────────────`)
  let events = []

  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
      messages:   [{ role: 'user', content: buildPrompt(org) }],
    })
    events = extractJson(res.content)
  } catch (err) {
    console.error(`  Errore API: ${err.message}`)
    return 0
  }

  if (!events.length) {
    console.log('  Nessun evento trovato')
    return 0
  }

  let inserted = 0
  for (const ev of events) {
    if (!ev.start_date || !ev.city) continue
    if (ev.start_date < todayStr)   continue
    if (ev.confidence === 'low')    continue

    // Scarta eventi fuori dall'Italia
    if (ev.region && !ITALIAN_REGIONS.has(ev.region)) {
      console.log(`  ✗ saltato (regione non italiana): ${ev.name} — ${ev.region}`)
      continue
    }

    const exists = await alreadyExists(ev.name, ev.start_date)
    if (exists) {
      console.log(`  ↩  già presente: ${ev.name} (${ev.start_date})`)
      continue
    }

    const record = {
      name:         ev.name,
      event_type:   org.event_type,
      city:         ev.city,
      region:       ev.region ?? null,
      address:      ev.address ?? null,
      start_date:   ev.start_date,
      end_date:     ev.end_date ?? null,
      start_time:   ev.start_time ?? null,
      end_time:     ev.end_time ?? null,
      price_info:   ev.price_info ?? null,
      organizer:    org.organizer,
      website:      ev.website ?? org.website,
      description:  ev.description ?? null,
      is_recurring: false,
      is_verified:  false,
      is_featured:  false,
      source:       'scraper-events',
      tags:         ['itinerante', org.name.toLowerCase().replace(/\s+/g, '-')],
    }

    const { error } = await supabase.from('market_events').insert(record)
    if (error) {
      console.error(`  ✗ ${ev.name}: ${error.message}`)
    } else {
      console.log(`  ✓ ${ev.name} — ${ev.city} — ${ev.start_date}`)
      inserted++
    }
  }

  return inserted
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Vintagery — Scraper eventi itineranti`)
  console.log(`Data: ${todayStr} | Orizzonte: ${horizonStr}`)
  console.log(`Organizzatori: ${ORGANIZERS.length}`)

  let total = 0
  for (const org of ORGANIZERS) {
    const n = await scrapeOrganizer(org)
    total  += n
    // Pausa tra richieste per non saturare il rate limit
    if (ORGANIZERS.indexOf(org) < ORGANIZERS.length - 1) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  console.log(`\n══════════════════════════════════════`)
  console.log(`Totale nuovi eventi inseriti: ${total}`)

  // Pulizia: rimuovi tutti gli eventi one-time con end_date (o start_date) passata da più di 7 giorni
  // Comprende anche quelli inseriti manualmente: non sono ciclici, devono "morire" nel loro mese
  const cutoff = new Date(today)
  cutoff.setDate(today.getDate() - 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { error: delErr, count: delCount } = await supabase
    .from('market_events')
    .delete({ count: 'exact' })
    .eq('is_recurring', false)
    .or(`end_date.lt.${cutoffStr},and(end_date.is.null,start_date.lt.${cutoffStr})`)

  if (!delErr && delCount) {
    console.log(`Rimossi ${delCount} eventi passati (ante ${cutoffStr})`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
