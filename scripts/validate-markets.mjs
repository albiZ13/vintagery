/**
 * Validatore mensile dei mercati Vintagery.
 * Gira ogni 1° del mese via GitHub Actions.
 *
 * Cosa fa, in ordine:
 *  1. Pulisce automaticamente (senza Claude) telefoni e "verificare su X"
 *  2. Arricchisce con Claude Haiku i mercati con dati mancanti
 *  3. Aggiorna last_validated_at su ogni record (nuovi mercati aggiunti = last_validated_at null → processati per primi)
 *  4. Stampa un riepilogo con eventuali mercati da verificare manualmente
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── Connessioni ───────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const today    = new Date()
const todayStr = today.toISOString().slice(0, 10)
const month    = today.getMonth() + 1
const monthLabel = today.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

// ── Pulizia testo (senza AI) ──────────────────────────────────────────────────

function cleanText(text) {
  if (!text) return text

  let t = text

  // Numeri di telefono
  t = t.replace(/\s*[.,;]?\s*[Tt]el\.?\s*[\d\s./-]{6,25}\.?/g, '')
  t = t.replace(/\s*(Info|Contatti|Telefono):?\s*[\d\s./-]{6,25}(\s*\/\s*[\d\s./-]+)*/gi, '')

  // "— verificare sempre su URL"
  t = t.replace(/\s*[—–-]\s*[Vv]erifica\w*\s+(?:sempre\s+)?su\s+\S+[^.]*/g, '')
  // "(verificare con X)"
  t = t.replace(/\s*\([Vv]erifica\w+\s+con\s+[^)]+\)/g, '')
  // "Verificare sui canali..."
  t = t.replace(/\.?\s*[Vv]erifica\w*\s+sui\s+canali[^.]*\./g, '')
  // "Verificare/Controllare sul sito/Comune/social"
  t = t.replace(/\.?\s*[Vv]erifica\w*\s+(?:sul\s+sito|sul\s+[Cc]omune|sempre\s+su)[^.]*\./g, '')
  t = t.replace(/[Cc]ontrolla\w*\s+(?:i\s+profili|sui\s+social|sul\s+sito)[^.]*\./g, '')
  // "verificare localmente."
  t = t.replace(/\s*[—–-]?\s*[Vv]erifica\w*\s+localmente\.?/g, '')
  // "Seguire la pagina X per le date aggiornate."
  t = t.replace(/Segui\w*\s+(?:la\s+pagina|le\s+pagine)[^.]*per\s+le\s+date[^.]*/g, '')
  // "confermato X in mese anno" (info stantia)
  t = t.replace(/;\s*confermato\s+[^.]+in\s+\w+\s+\d{4}\.?/g, '')

  // Cleanup artefatti residui
  t = t.replace(/\s{2,}/g, ' ').replace(/\s*\.\s*\./g, '.').trim()

  return t || null
}

// ── Logica enrichment ─────────────────────────────────────────────────────────

function needsEnrichment(m) {
  return !m.start_time || !m.end_time || !m.price_info ||
         !m.description || !m.categories?.length
}

function buildEnrichmentPrompt(m) {
  return `Sei un esperto di mercati vintage e antiquariato italiani.

Dati attuali nel database:
- Nome: ${m.name}
- Città: ${m.city}, ${m.region}
- Schedule: ${m.schedule_notes ?? 'N/D'}
- Frequenza: ${m.frequency ?? 'N/D'}
- Orario: ${m.start_time ?? 'mancante'}–${m.end_time ?? 'mancante'}
- Prezzo: ${m.price_info ?? 'mancante'}
- Descrizione: ${m.description?.slice(0, 300) ?? 'mancante'}
- Categorie: ${(m.categories ?? []).join(', ') || 'mancante'}
- Sito: ${m.website ?? 'N/D'}

Data odierna: ${todayStr}

Rispondi SOLO con JSON valido. Compila SOLO i campi che CONOSCI CON CERTEZZA per questo mercato specifico:
{
  "still_active": true,
  "start_time": null,
  "end_time": null,
  "price_info": null,
  "description": null,
  "categories": null,
  "confidence": "low",
  "notes": null
}

Regole assolute:
- Se non conosci questo mercato con certezza → tutti i campi null, confidence "low"
- Niente numeri di telefono, niente URL, niente "verificare su"
- price_info: usa "Ingresso gratuito" se è gratuito, altrimenti il prezzo specifico
- description: max 3 frasi, solo fatti, niente istruzioni di verifica
- categories: array minuscolo (es. ["antiquariato", "abbigliamento vintage", "vinili"])
- start_time / end_time: formato "HH:MM"
- confidence "high" solo se sei CERTO delle informazioni`
}

// ── Lettura DB ────────────────────────────────────────────────────────────────

const { data: markets, error: fetchErr } = await supabase
  .from('markets')
  .select(`
    id, name, city, region,
    schedule_notes, frequency, active_months,
    next_date, start_time, end_time, price_info,
    description, categories, tips,
    website, is_verified, last_validated_at
  `)
  // nuovi mercati (last_validated_at null) vengono processati per primi
  .order('last_validated_at', { ascending: true, nullsFirst: true })

if (fetchErr) { console.error('Errore lettura DB:', fetchErr.message); process.exit(1) }

console.log(`\n📋 ${markets.length} mercati da processare — ${monthLabel}\n`)

// ── Statistiche ───────────────────────────────────────────────────────────────

const stats = { total: markets.length, cleaned: 0, enriched: 0, unchanged: 0, errors: 0 }
const flagged   = []
const enrichLog = []

// ── Loop principale ───────────────────────────────────────────────────────────

let processed = 0

for (const market of markets) {
  const updates = { last_validated_at: new Date().toISOString() }
  let changed = false

  // ── 1. Pulizia automatica ───────────────────────────────────────────────

  const cleaned = {
    schedule_notes: cleanText(market.schedule_notes),
    tips:           cleanText(market.tips),
    description:    cleanText(market.description),
  }

  for (const [field, value] of Object.entries(cleaned)) {
    if (value !== market[field]) {
      updates[field] = value
      changed = true
    }
  }

  // ── 2. Enrichment via Claude (solo se mancano dati chiave) ──────────────

  if (needsEnrichment(market)) {
    try {
      const res = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: buildEnrichmentPrompt(market) }],
      })

      const text = res.content[0]?.text?.trim() ?? ''
      const match = text.match(/\{[\s\S]+\}/)
      if (match) {
        const r = JSON.parse(match[0])

        if (r.confidence === 'high') {
          if (r.start_time  && !market.start_time)   { updates.start_time  = r.start_time;  changed = true }
          if (r.end_time    && !market.end_time)     { updates.end_time    = r.end_time;    changed = true }
          if (r.price_info  && !market.price_info)   { updates.price_info  = r.price_info;  changed = true }
          if (r.description && !market.description)  { updates.description = r.description; changed = true }
          if (r.categories?.length && !market.categories?.length) {
            updates.categories = r.categories
            changed = true
          }

          if (changed) {
            const fields = Object.keys(updates).filter(k => k !== 'last_validated_at')
            enrichLog.push(`  + ${market.name} (${market.city}): ${fields.join(', ')}`)
            stats.enriched++
          }

          if (r.still_active === false) {
            flagged.push({ name: market.name, city: market.city, reason: 'possibile chiusura' })
          }
        }
      }

      await new Promise(r => setTimeout(r, 400))

    } catch (err) {
      stats.errors++
      console.warn(`  ⚠️  Claude [${market.name}]: ${err.message}`)
    }
  }

  // ── 3. Flag mercati con dati critici mancanti ───────────────────────────

  if (!market.next_date) {
    flagged.push({ name: market.name, city: market.city, reason: 'next_date mancante' })
  }

  // Mercato fuori stagione: segnala se active_months non include il mese corrente
  if (market.active_months?.length && !market.active_months.includes(month)) {
    flagged.push({
      name: market.name,
      city: market.city,
      reason: `fuori stagione (attivo: ${market.active_months.join(',')})`
    })
  }

  // ── 4. Scrivi aggiornamenti nel DB ──────────────────────────────────────

  const { error: upErr } = await supabase
    .from('markets').update(updates).eq('id', market.id)

  if (upErr) {
    stats.errors++
    console.warn(`  ⚠️  DB [${market.name}]: ${upErr.message}`)
  } else {
    if (changed) stats.cleaned++
    else stats.unchanged++
  }

  processed++
  if (processed % 15 === 0) {
    process.stdout.write(`  → ${processed}/${markets.length} processati...\n`)
  }
}

// ── Riepilogo ─────────────────────────────────────────────────────────────────

console.log(`
✅  Validazione ${monthLabel} completata
    Processati  : ${stats.total}
    Aggiornati  : ${stats.cleaned}
    Arricchiti  : ${stats.enriched}
    Invariati   : ${stats.unchanged}
    Errori      : ${stats.errors}
`)

if (enrichLog.length > 0) {
  console.log('📝  Campi arricchiti:')
  enrichLog.forEach(l => console.log(l))
  console.log()
}

if (flagged.length > 0) {
  console.log('⚠️   Da verificare manualmente:')
  flagged.forEach(m => console.log(`  - ${m.name} (${m.city}): ${m.reason}`))
  console.log()
}
