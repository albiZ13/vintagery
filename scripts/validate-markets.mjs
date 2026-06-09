import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const today = new Date()
const monthLabel = today.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

const { data: markets, error } = await supabase
  .from('markets')
  .select('id,name,city,region,schedule_notes,frequency,website,next_date,is_verified,start_time,end_time,description')
  .order('name')

if (error) { console.error('Errore lettura DB:', error.message); process.exit(1) }

console.log(`📋 ${markets.length} mercati da verificare — ${monthLabel}`)

const updated = []
const flagged = []
let processed = 0
let errors = 0

for (const market of markets) {
  const prompt = `Sei un esperto di mercati vintage e antiquariato italiani.
Dati attuali nel database per questo mercato:
- Nome: ${market.name}
- Città: ${market.city}, ${market.region}
- Schedule notes: ${market.schedule_notes ?? 'non presente'}
- Frequenza: ${market.frequency ?? 'non presente'}
- Orario: ${market.start_time ?? '?'}–${market.end_time ?? '?'}
- Sito web: ${market.website ?? 'non presente'}

Data odierna: ${today.toISOString().slice(0, 10)}

Rispondi SOLO con un oggetto JSON valido (nessun testo prima o dopo):
{
  "still_active": true,
  "schedule_correct": true,
  "schedule_notes_corrected": null,
  "start_time_corrected": null,
  "end_time_corrected": null,
  "confidence": "low",
  "notes": null
}

Regole:
- Se non conosci con certezza questo mercato specifico → confidence "low", tutti i campi null
- schedule_notes_corrected solo se sei CERTO che le informazioni attuali sono errate
- Non inventare dati. Preferisci "low" confidence all'incertezza.
- still_active: false solo se sai con certezza che il mercato ha chiuso definitivamente`

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]+\}/)
    if (!jsonMatch) { errors++; continue }

    const result = JSON.parse(jsonMatch[0])

    const updates = { last_validated_at: new Date().toISOString() }

    if (result.confidence === 'high') {
      if (result.schedule_notes_corrected &&
          result.schedule_notes_corrected !== market.schedule_notes) {
        updates.schedule_notes = result.schedule_notes_corrected
      }
      if (result.start_time_corrected &&
          result.start_time_corrected !== market.start_time) {
        updates.start_time = result.start_time_corrected
      }
      if (result.end_time_corrected &&
          result.end_time_corrected !== market.end_time) {
        updates.end_time = result.end_time_corrected
      }

      if (result.still_active === false) {
        flagged.push({ name: market.name, city: market.city, reason: 'chiusura definitiva segnalata' })
      }
    }

    const { error: updateErr } = await supabase
      .from('markets').update(updates).eq('id', market.id)
    if (updateErr) console.warn(`  ⚠️ Update error ${market.name}:`, updateErr.message)

    const contentUpdates = Object.keys(updates).filter(k => k !== 'last_validated_at')
    if (contentUpdates.length > 0) {
      const contentChanges = Object.fromEntries(contentUpdates.map(k => [k, updates[k]]))
      updated.push({ name: market.name, updates: contentChanges })
    }

    processed++
    if (processed % 10 === 0) {
      console.log(`  → ${processed}/${markets.length} processati...`)
    }

    // pausa per non saturare il rate limit
    await new Promise(r => setTimeout(r, 500))

  } catch (err) {
    errors++
    console.warn(`  ⚠️ ${market.name}: ${err.message}`)
  }
}

console.log(`\n✅ Completato: ${processed}/${markets.length} processati | ${updated.length} aggiornati | ${errors} errori`)

if (flagged.length > 0) {
  console.log(`\n⚠️  Mercati da verificare manualmente (possibile chiusura):`)
  flagged.forEach(m => console.log(`  - ${m.name} (${m.city})`))
}

if (updated.length > 0) {
  console.log(`\n📝 Aggiornamenti applicati:`)
  updated.forEach(m => console.log(`  - ${m.name}: ${JSON.stringify(m.updates)}`))
}
