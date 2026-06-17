/**
 * Vintagery — Import comuni markets
 *
 * Legge data/comuni_markets.json (output scraper Gemini) e inserisce in Supabase:
 *   - tipo "ricorrente" → market_events (is_recurring: true)
 *   - tipo "una_tantum" → market_events (is_recurring: false)
 *
 * Dedup AI: per ogni città con potenziali duplicati, chiede a Gemini di
 * confrontare i nuovi record con quelli esistenti nel DB.
 *
 * Uso:
 *   node scripts/import-comuni-markets.mjs
 *   node scripts/import-comuni-markets.mjs --dry-run
 *   node scripts/import-comuni-markets.mjs --regione toscana
 *   node scripts/import-comuni-markets.mjs --skip-ai-dedup
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')

// ── Config ─────────────────────────────────────────────────────────────────────

const envPath = resolve(ROOT, '.env.local')
const envFile = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, 'utf8')
        .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')] })
    )
  : {}
const env = new Proxy(envFile, { get: (t, k) => t[k] ?? process.env[k] ?? '' })

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'],
)

const GROQ_API_KEY = env['GROQ_API_KEY'] || ''
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.3-70b-versatile'

// ── Args ───────────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2)
const DRY_RUN     = args.includes('--dry-run')
const SKIP_AI     = args.includes('--skip-ai-dedup') || !GROQ_API_KEY
const REG_FILTER  = args.includes('--regione') ? args[args.indexOf('--regione') + 1]?.toLowerCase() : null

// ── Load JSON ──────────────────────────────────────────────────────────────────

const OUTPUT_FILE = resolve(ROOT, 'data', 'comuni_markets.json')

if (!existsSync(OUTPUT_FILE)) {
  console.error(`\n✗ File non trovato: ${OUTPUT_FILE}`)
  console.error('  Esegui prima: python3 scripts/scrape-comuni.py\n')
  process.exit(1)
}

let markets = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'))
console.log(`\n▶ Mercatini nel file: ${markets.length}`)

if (REG_FILTER) {
  markets = markets.filter(m => m.region?.toLowerCase().includes(REG_FILTER))
  console.log(`  Filtro regione "${REG_FILTER}": ${markets.length} mercatini`)
}
if (DRY_RUN)   console.log('  ⚠ DRY RUN — nessuna scrittura su DB')
if (SKIP_AI)   console.log('  ⚠ AI dedup disabilitato' + (!GROQ_API_KEY ? ' (GROQ_API_KEY mancante)' : ''))

// ── Normalizzazione nomi per dedup ─────────────────────────────────────────────

const STOP_IT = new Set([
  'mercatino','mercato','fiera','antiquariato','vintage','usato',
  'di','del','della','dei','degli','delle','dell','il','la','le',
  'lo','gli','i','un','una','e','a','in','con','per','da'
])

function nameKey(name, city = '') {
  const cityNorm = city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_IT.has(t) && t !== cityNorm)
    .sort()
    .join(' ')
}

// ── Fetch esistenti da DB ──────────────────────────────────────────────────────

console.log('\n▶ Carico esistenti da Supabase…')

const [{ data: existingEvents }, { data: existingMarkets }] = await Promise.all([
  supabase.from('market_events').select('name, city, is_recurring'),
  supabase.from('markets').select('name, city'),
])

const existingNormSet = new Set([
  ...(existingEvents  ?? []).map(m => `${nameKey(m.name, m.city)}|${m.city.toLowerCase().trim()}`),
  ...(existingMarkets ?? []).map(m => `${nameKey(m.name, m.city)}|${m.city.toLowerCase().trim()}`),
])

const existingByCity = {}
for (const m of [...(existingEvents ?? []), ...(existingMarkets ?? [])]) {
  const c = m.city.toLowerCase().trim()
  if (!existingByCity[c]) existingByCity[c] = []
  existingByCity[c].push({ name: m.name, is_recurring: m.is_recurring ?? true })
}

console.log(`  ${existingNormSet.size} esistenti nel DB (market_events + markets)`)

// ── Filtra duplicati esatti ────────────────────────────────────────────────────

// Filtra anche eventi una-tantum con data già passata
const today = new Date().toISOString().split('T')[0]

const toCheck = markets.filter(m => {
  if (!m.name || !m.city) return false
  // Salta una-tantum con data nel passato
  if (m.tipo === 'una_tantum' && m.start_date && m.start_date < today) return false
  const key = `${nameKey(m.name, m.city)}|${m.city.toLowerCase().trim()}`
  return !existingNormSet.has(key)
})

const exactDups = markets.length - toCheck.length
console.log(`  ${exactDups} duplicati esatti rimossi, ${toCheck.length} candidati rimasti`)

// ── AI Dedup (Gemini) ──────────────────────────────────────────────────────────

async function groqDedupCity(cityName, existingRecords, newMarkets) {
  const existingList = existingRecords
    .map((r, i) => `  ${i+1}. "${r.name}" (${r.is_recurring !== false ? 'ricorrente' : 'una-tantum'})`)
    .join('\n')
  const newList = newMarkets
    .map((m, i) => `  ${i}: "${m.name}" (${m.tipo === 'ricorrente' ? 'ricorrente' : 'una-tantum'})`)
    .join('\n')

  const prompt = `Confronta questi mercatini già presenti nel database per ${cityName}:
${existingList}

Con questi nuovi mercatini trovati per la stessa città:
${newList}

Per ogni NUOVO mercatino (per indice 0,1,2,...) stabilisci se è già presente nel database considerando:
- Stesso mercato con nome scritto diversamente (es. "Gran Balon" = "Mercato Gran Balon") → duplicato
- Stesso tipo di evento nello stesso posto con cadenza simile → duplicato
- Mercato genuinamente diverso (diverso luogo, diversa cadenza, diverso tipo) → non duplicato

Rispondi SOLO con array JSON: [{"idx": 0, "is_dup": false}, {"idx": 1, "is_dup": true}]`

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 512,
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

let toInsert = toCheck

if (!SKIP_AI && toCheck.length > 0) {
  console.log('\n▶ AI dedup (Groq) per città con potenziali sovrapposizioni…')

  // Raggruppa nuovi per città dove esistono già record
  const byCity = {}
  for (const m of toCheck) {
    const c = m.city.toLowerCase().trim()
    if (existingByCity[c]?.length > 0) {
      if (!byCity[c]) byCity[c] = []
      byCity[c].push(m)
    }
  }

  const dupIndices = new Set()
  const cities     = Object.keys(byCity)
  console.log(`  ${cities.length} città con record esistenti da verificare`)

  for (let i = 0; i < cities.length; i++) {
    const cityKey   = cities[i]
    const existing  = existingByCity[cityKey]
    const newGroup  = byCity[cityKey]
    const cityLabel = newGroup[0].city

    process.stdout.write(`  [${i+1}/${cities.length}] ${cityLabel} (${existing.length} esistenti, ${newGroup.length} nuovi)`)

    const result = await groqDedupCity(cityLabel, existing, newGroup)
    if (result) {
      const dups = result.filter(r => r.is_dup).length
      process.stdout.write(`  → ${dups} duplicati\n`)
      for (const r of result) {
        if (r.is_dup) dupIndices.add(newGroup[r.idx])
      }
    } else {
      process.stdout.write('  → (skip)\n')
    }

    // Rate limit: 1 chiamata ogni 4s
    if (i < cities.length - 1) await new Promise(r => setTimeout(r, 4200))
  }

  toInsert = toCheck.filter(m => !dupIndices.has(m))
  console.log(`  AI dedup: ${dupIndices.size} duplicati rimossi, ${toInsert.length} da inserire`)
} else {
  console.log(`\n  ${toInsert.length} mercatini da inserire`)
}

if (toInsert.length === 0) {
  console.log('\n✓ Nessun nuovo mercatino da inserire.\n')
  process.exit(0)
}

// ── Trasforma per market_events ───────────────────────────────────────────────

const VALID_EVENT_TYPES = new Set(['vintage','antiquariato','mercatino','collezionismo'])
const VALID_CATEGORIES  = new Set([
  'antiquariato','collezionismo','vintage',"oggetti d'epoca",'usato',
  'abbigliamento vintage','modernariato','libri e stampe','artigianato',
  'mobili','dischi e vinili','brocantage','numismatica e filatelia',
  'elettronica vintage','giocattoli e retrò','argenti e posateria','bigiotteria'
])

const REGION_MAP = {
  'piemonte':'Piemonte',"valle d'aosta":"Valle d'Aosta",'lombardia':'Lombardia',
  'trentino-alto adige':'Trentino-Alto Adige','veneto':'Veneto',
  'friuli-venezia giulia':'Friuli-Venezia Giulia','liguria':'Liguria',
  'emilia-romagna':'Emilia-Romagna','toscana':'Toscana','umbria':'Umbria',
  'marche':'Marche','lazio':'Lazio','abruzzo':'Abruzzo','molise':'Molise',
  'campania':'Campania','puglia':'Puglia','basilicata':'Basilicata',
  'calabria':'Calabria','sicilia':'Sicilia','sardegna':'Sardegna',
}

function normalizeRegion(r) {
  return REGION_MAP[r?.toLowerCase()] ?? r
}

const rows = toInsert.map(m => {
  const cats = (m.categories ?? []).filter(c => VALID_CATEGORIES.has(c.toLowerCase()))
  const et   = VALID_EVENT_TYPES.has(m.event_type) ? m.event_type : 'mercatino'

  return {
    name:         m.name.trim().substring(0, 200),
    description:  m.description?.trim().substring(0, 2000) ?? null,
    event_type:   et,
    city:         m.city?.trim() ?? '',
    region:       normalizeRegion(m.region) ?? '',
    address:      m.address?.trim() ?? null,
    start_date:   m.start_date ?? null,
    start_time:   m.start_time ?? null,
    end_time:     m.end_time ?? null,
    price_info:   m.price_info ?? 'Ingresso gratuito',
    categories:   cats.length > 0 ? cats : ['antiquariato'],
    tips:         m.tips?.trim().substring(0, 1000) ?? null,
    website:      m.website ?? null,
    instagram:    m.instagram ?? null,
    is_verified:  false,
    is_featured:  false,
    is_recurring: m.tipo !== 'una_tantum',
    source:       m.source ?? 'gemini-ai',
  }
})

// ── Preview ────────────────────────────────────────────────────────────────────

const ricorrenti = rows.filter(r => r.is_recurring)
const unaTantum  = rows.filter(r => !r.is_recurring)

console.log(`\n▶ Anteprima (${rows.length} totali: ${ricorrenti.length} ricorrenti, ${unaTantum.length} una-tantum):`)
for (const m of rows.slice(0, 10)) {
  const tipo = m.is_recurring ? '↻' : '1×'
  console.log(`  ${tipo} ${m.name} — ${m.city}, ${m.region}  [${m.event_type}]`)
}
if (rows.length > 10) console.log(`  … e altri ${rows.length - 10}`)

// ── Insert ─────────────────────────────────────────────────────────────────────

if (DRY_RUN) {
  console.log(`\n✓ DRY RUN — avrebbe inserito ${rows.length} record in market_events.\n`)
  process.exit(0)
}

console.log(`\n▶ Inserisco ${rows.length} record in market_events…`)

let inserted = 0, errors = 0

for (let i = 0; i < rows.length; i += 50) {
  const batch = rows.slice(i, i + 50)
  const { error } = await supabase.from('market_events').insert(batch)
  if (error) {
    console.error(`\n  ✗ Batch ${i}–${i + batch.length}: ${error.message}`)
    errors++
  } else {
    inserted += batch.length
    process.stdout.write(`\r  ${inserted}/${rows.length} inseriti…`)
  }
}

console.log(`\n\n✓ Import completato: ${inserted} inseriti in market_events, ${errors} batch con errori`)
if (inserted > 0) {
  console.log(`  Vai su https://vintagery.it/admin per revisionare i nuovi mercatini`)
}
console.log()
