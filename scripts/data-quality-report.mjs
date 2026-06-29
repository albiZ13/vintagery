#!/usr/bin/env node
/**
 * Data Quality Report — genera un report Markdown sullo stato dei mercati.
 * Output: stdout (Markdown) — viene catturato dal workflow GitHub Actions
 * e postato come GitHub Issue settimanale.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const today     = new Date().toISOString().slice(0, 10)
const minus7d   = new Date(Date.now() -  7 * 24 * 3600 * 1000).toISOString()
const minus30d  = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
const plus30d   = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)

const [
  { count: total },
  { count: noImage },
  { count: noDesc },
  { count: noAddress },
  { count: noSchedule },
  { count: noWebsite },
  { count: newThisWeek },
  { count: unverified },
  { data: staleMarkets },
  { data: allRegions },
  { data: recentlyAdded },
] = await Promise.all([
  supabase.from('markets').select('*', { count: 'exact', head: true }),
  supabase.from('markets').select('*', { count: 'exact', head: true }).is('image_url', null),
  supabase.from('markets').select('*', { count: 'exact', head: true }).is('description', null),
  supabase.from('markets').select('*', { count: 'exact', head: true }).is('address', null),
  supabase.from('markets').select('*', { count: 'exact', head: true }).is('schedule_notes', null).is('frequency', null),
  supabase.from('markets').select('*', { count: 'exact', head: true }).is('website', null),
  supabase.from('markets').select('*', { count: 'exact', head: true }).gte('created_at', minus7d),
  supabase.from('markets').select('*', { count: 'exact', head: true }).eq('is_verified', false),

  // Mercati con next_date scaduta (non aggiornata)
  supabase.from('markets')
    .select('id, name, city, region, next_date, frequency')
    .not('next_date', 'is', null)
    .lt('next_date', today)
    .order('next_date')
    .limit(15),

  // Conteggio per regione
  supabase.from('markets').select('region'),

  // Ultimi aggiunti questa settimana
  supabase.from('markets')
    .select('name, city, region, is_verified, created_at')
    .gte('created_at', minus7d)
    .order('created_at', { ascending: false })
    .limit(10),
])

// Raggruppa per regione
const byRegion = {}
for (const m of allRegions ?? []) {
  byRegion[m.region] = (byRegion[m.region] ?? 0) + 1
}
const regionRows = Object.entries(byRegion)
  .sort((a, b) => b[1] - a[1])
  .map(([r, n]) => `| ${r} | ${n} |`)
  .join('\n')

// Calcola score qualità (0–100)
const completeness = total > 0 ? Math.round(
  ((total - noImage) / total * 25) +
  ((total - noDesc)  / total * 25) +
  ((total - noAddress) / total * 25) +
  ((total - noWebsite) / total * 25)
) : 0

const staleRows = (staleMarkets ?? [])
  .map(m => `| [${m.name}](https://vintagery.it/mercatini/${m.id}) | ${m.city} | ${m.region} | ${m.next_date} | ${m.frequency ?? '—'} |`)
  .join('\n')

const recentRows = (recentlyAdded ?? [])
  .map(m => `| ${m.name} | ${m.city} | ${m.region} | ${m.is_verified ? '✅' : '⏳'} |`)
  .join('\n')

const week = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const report = `# 📊 Report Qualità Dati — ${week}

## KPI Generali

| Metrica | Valore |
|---|---|
| Mercati totali | **${total}** |
| Nuovi questa settimana | **${newThisWeek}** |
| Non verificati | **${unverified}** |
| Score completezza | **${completeness}/100** |

## Lacune Dati

| Campo mancante | Mercati | % sul totale |
|---|---|---|
| Immagine | ${noImage} | ${total > 0 ? Math.round(noImage/total*100) : 0}% |
| Descrizione | ${noDesc} | ${total > 0 ? Math.round(noDesc/total*100) : 0}% |
| Indirizzo | ${noAddress} | ${total > 0 ? Math.round(noAddress/total*100) : 0}% |
| Sito web | ${noWebsite} | ${total > 0 ? Math.round(noWebsite/total*100) : 0}% |
| Orario/cadenza | ${noSchedule} | ${total > 0 ? Math.round(noSchedule/total*100) : 0}% |

${staleMarkets && staleMarkets.length > 0 ? `## ⚠️ Mercati con Data Scaduta (${staleMarkets.length})

Questi mercati hanno \`next_date\` nel passato — il refresh automatico non ha trovato la prossima data.

| Mercato | Città | Regione | Ultima data | Cadenza |
|---|---|---|---|---|
${staleRows}

> Azione: verificare manualmente la pagina e aggiornare \`schedule_notes\` o \`next_date\`.
` : '## ✅ Nessun mercato con data scaduta\n'}

${recentlyAdded && recentlyAdded.length > 0 ? `## 🆕 Aggiunti questa settimana (${recentlyAdded.length})

| Mercato | Città | Regione | Verificato |
|---|---|---|---|
${recentRows}
` : ''}

## Distribuzione Regionale

| Regione | Mercati |
|---|---|
${regionRows}

---
*Generato automaticamente da GitHub Actions · [Vai a vintagery.it](https://vintagery.it)*`

process.stdout.write(report)
