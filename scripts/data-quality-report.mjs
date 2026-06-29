#!/usr/bin/env node
/**
 * Data Quality Report — analisi approfondita dello stato dei mercati.
 *
 * Produce un report Markdown su stdout e salva uno snapshot in quality_snapshots.
 * Chiamato ogni lunedì da GitHub Actions + dopo ogni validazione mensile.
 *
 * Scoring model (tot 100 pt per mercato):
 *   image_url         25 pt
 *   description       20 pt
 *   address           15 pt
 *   schedule_notes    10 pt  (+ 5 se frequency è set)
 *   website/instagram 10 pt
 *   categories        10 pt
 *   start_time        3 pt
 *   price_info        2 pt
 *
 * Classificazione priorità:
 *   P0 — no image E no description (mercato invisibile)
 *   P1 — no image O no description
 *   P2 — dati supporto mancanti (no website, no times, no price)
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const today   = new Date()
const todayStr = today.toISOString().slice(0, 10)
const minus7d  = new Date(Date.now() -  7 * 86400_000).toISOString()
const minus30d = new Date(Date.now() - 30 * 86400_000).toISOString()

// ── Carica tutti i mercati ────────────────────────────────────────────────────

const { data: markets, error } = await supabase
  .from('markets')
  .select(`
    id, name, city, region, created_at,
    image_url, description, address, website, instagram,
    frequency, schedule_notes, categories,
    start_time, end_time, price_info,
    lat, lng, is_verified, next_date,
    last_validated_at
  `)
  .order('region')

if (error || !markets) {
  process.stderr.write(`Errore Supabase: ${error?.message}\n`)
  process.exit(1)
}

// ── Funzione score per singolo mercato ────────────────────────────────────────

function scoreMarket(m) {
  let s = 0
  if (m.image_url)                         s += 25
  if (m.description)                       s += 20
  if (m.address)                           s += 15
  if (m.schedule_notes)                    s += 10
  if (m.frequency)                         s +=  5
  if (m.website || m.instagram)            s += 10
  if (m.categories?.length)               s += 10
  if (m.start_time)                        s +=  3
  if (m.price_info)                        s +=  2
  return s
}

function classifyMarket(m) {
  const noImage = !m.image_url
  const noDesc  = !m.description
  if (noImage && noDesc)  return 'P0'
  if (noImage || noDesc)  return 'P1'
  const noSupport = !m.website && !m.instagram && !m.start_time && !m.price_info
  if (noSupport)          return 'P2'
  return 'OK'
}

// ── Calcola KPI ───────────────────────────────────────────────────────────────

const total = markets.length
const scored = markets.map(m => ({ ...m, score: scoreMarket(m), priority: classifyMarket(m) }))

const counts = {
  noImage:       markets.filter(m => !m.image_url).length,
  noDescription: markets.filter(m => !m.description).length,
  noAddress:     markets.filter(m => !m.address).length,
  noWebsite:     markets.filter(m => !m.website && !m.instagram).length,
  noSchedule:    markets.filter(m => !m.schedule_notes && !m.frequency).length,
  noCategories:  markets.filter(m => !m.categories?.length).length,
  noTimes:       markets.filter(m => !m.start_time).length,
  noPrice:       markets.filter(m => !m.price_info).length,
  noCoords:      markets.filter(m => !m.lat || !m.lng).length,
  unverified:    markets.filter(m => !m.is_verified).length,
  staleDates:    markets.filter(m => m.next_date && m.next_date < todayStr).length,
  newThisWeek:   markets.filter(m => m.created_at >= minus7d).length,
  p0:            scored.filter(m => m.priority === 'P0').length,
  p1:            scored.filter(m => m.priority === 'P1').length,
  p2:            scored.filter(m => m.priority === 'P2').length,
}

const globalScore = total > 0
  ? Math.round(scored.reduce((acc, m) => acc + m.score, 0) / total)
  : 0

// ── Score per regione ─────────────────────────────────────────────────────────

const byRegion = {}
for (const m of scored) {
  if (!byRegion[m.region]) byRegion[m.region] = { sum: 0, count: 0 }
  byRegion[m.region].sum   += m.score
  byRegion[m.region].count += 1
}
const regionStats = Object.entries(byRegion)
  .map(([r, v]) => ({ region: r, score: Math.round(v.sum / v.count), count: v.count }))
  .sort((a, b) => a.score - b.score)   // peggiori prima

const scoreByRegionForDb = Object.fromEntries(
  regionStats.map(r => [r.region, { score: r.score, count: r.count }])
)

// ── Carica snapshot precedente per delta ──────────────────────────────────────

const { data: prevSnap } = await supabase
  .from('quality_snapshots')
  .select('*')
  .lt('snapshot_date', todayStr)
  .order('snapshot_date', { ascending: false })
  .limit(1)
  .single()

const prev = prevSnap ?? null

function delta(current, previous, field) {
  if (!previous) return ''
  const d = current - previous[field]
  if (d === 0) return ' _(=)_'
  return d > 0 ? ` _(+${d})_` : ` _(${ d})_`
}

function scoreDelta(current, previous) {
  if (!previous) return ''
  const d = current - Number(previous.score_global)
  if (d === 0) return ''
  const sign = d > 0 ? '▲' : '▼'
  return ` ${sign}${Math.abs(d).toFixed(1)}`
}

// ── Salva snapshot ────────────────────────────────────────────────────────────

await supabase
  .from('quality_snapshots')
  .upsert({
    snapshot_date:   todayStr,
    total,
    new_this_week:   counts.newThisWeek,
    no_image:        counts.noImage,
    no_description:  counts.noDescription,
    no_address:      counts.noAddress,
    no_website:      counts.noWebsite,
    no_schedule:     counts.noSchedule,
    no_categories:   counts.noCategories,
    no_times:        counts.noTimes,
    no_price:        counts.noPrice,
    no_coords:       counts.noCoords,
    unverified:      counts.unverified,
    stale_dates:     counts.staleDates,
    score_global:    globalScore,
    score_by_region: scoreByRegionForDb,
    p0_count:        counts.p0,
    p1_count:        counts.p1,
    p2_count:        counts.p2,
  }, { onConflict: 'snapshot_date' })

// ── Mercati P0 + P1 da lavorare (ordinati per score ASC, esclude nuovi <7gg) ──

const actionQueue = scored
  .filter(m => m.priority !== 'OK' && m.created_at < minus7d)
  .sort((a, b) => a.score - b.score)
  .slice(0, 20)

const queueRows = actionQueue.map(m => {
  const missing = []
  if (!m.image_url)              missing.push('img')
  if (!m.description)            missing.push('desc')
  if (!m.website && !m.instagram) missing.push('web')
  if (!m.schedule_notes)         missing.push('sched')
  if (!m.start_time)             missing.push('orari')
  return `| **${m.priority}** | [${m.name}](https://vintagery.it/mercatini/${m.id}) | ${m.city} | ${m.region} | ${m.score}/100 | ${missing.join(', ')} |`
}).join('\n')

// ── Mercati con date scadute ──────────────────────────────────────────────────

const staleMarkets = scored
  .filter(m => m.next_date && m.next_date < todayStr)
  .sort((a, b) => a.next_date.localeCompare(b.next_date))
  .slice(0, 15)

const staleRows = staleMarkets.map(m =>
  `| [${m.name}](https://vintagery.it/mercatini/${m.id}) | ${m.city} | ${m.region} | ${m.next_date} | ${m.frequency ?? '—'} |`
).join('\n')

// ── Tabella regioni (peggiori → migliori) ─────────────────────────────────────

const regionRows = regionStats.map(r => {
  const prevScore = prev?.score_by_region?.[r.region]?.score
  const d = prevScore != null
    ? (r.score - prevScore > 0 ? ` ▲${r.score - prevScore}` : r.score - prevScore < 0 ? ` ▼${Math.abs(r.score - prevScore)}` : '')
    : ''
  const bar = '█'.repeat(Math.round(r.score / 10)) + '░'.repeat(10 - Math.round(r.score / 10))
  return `| ${r.region} | ${r.count} | **${r.score}/100**${d} | \`${bar}\` |`
}).join('\n')

// ── Nuovi questa settimana ────────────────────────────────────────────────────

const newMarkets = markets
  .filter(m => m.created_at >= minus7d)
  .sort((a, b) => b.created_at.localeCompare(a.created_at))

const newRows = newMarkets.map(m =>
  `| [${m.name}](https://vintagery.it/mercatini/${m.id}) | ${m.city} | ${m.region} | ${m.is_verified ? '✅' : '⏳'} | ${scoreMarket(m)}/100 |`
).join('\n')

// ── Non validati da >30 giorni ────────────────────────────────────────────────

const neverValidated = scored
  .filter(m => !m.last_validated_at && m.created_at < minus30d)
  .sort((a, b) => a.score - b.score)
  .slice(0, 10)

const neverRows = neverValidated.map(m =>
  `| [${m.name}](https://vintagery.it/mercatini/${m.id}) | ${m.city} | ${m.region} | ${m.score}/100 |`
).join('\n')

// ── Render report ─────────────────────────────────────────────────────────────

const dateLabel = today.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
const prevDateLabel = prev
  ? new Date(prev.snapshot_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
  : null

const report = `# 📊 Report Qualità Dati — ${dateLabel}

${prev ? `> Confronto con snapshot del **${prevDateLabel}** (${prev.total} mercati, score ${prev.score_global}/100)` : '> Primo snapshot — nessun dato precedente disponibile per il confronto.'}

---

## Score globale

| | |
|---|---|
| Mercati totali | **${total}**${delta(total, prev, 'total')} |
| Score medio completezza | **${globalScore}/100**${scoreDelta(globalScore, prev)} |
| Nuovi questa settimana | **${counts.newThisWeek}** |
| Non verificati | **${counts.unverified}**${delta(counts.unverified, prev, 'unverified')} |

---

## Priorità intervento

| Classe | Descrizione | Count | Delta |
|---|---|---|---|
| 🔴 **P0** | Nessuna immagine + nessuna descrizione | **${counts.p0}** | ${prev ? (counts.p0 - prev.p0_count > 0 ? `+${counts.p0 - prev.p0_count} ▲` : counts.p0 - prev.p0_count < 0 ? `${counts.p0 - prev.p0_count} ▼` : '=') : '—'} |
| 🟡 **P1** | Mancante immagine o descrizione | **${counts.p1}** | ${prev ? (counts.p1 - prev.p1_count > 0 ? `+${counts.p1 - prev.p1_count} ▲` : counts.p1 - prev.p1_count < 0 ? `${counts.p1 - prev.p1_count} ▼` : '=') : '—'} |
| 🔵 **P2** | Dati di supporto mancanti | **${counts.p2}** | ${prev ? (counts.p2 - prev.p2_count > 0 ? `+${counts.p2 - prev.p2_count} ▲` : counts.p2 - prev.p2_count < 0 ? `${counts.p2 - prev.p2_count} ▼` : '=') : '—'} |

---

## Lacune per campo

| Campo | Mancante | % | Delta |
|---|---|---|---|
| Immagine | ${counts.noImage} | ${pct(counts.noImage, total)} | ${prev ? fmtDelta(counts.noImage - prev.no_image) : '—'} |
| Descrizione | ${counts.noDescription} | ${pct(counts.noDescription, total)} | ${prev ? fmtDelta(counts.noDescription - prev.no_description) : '—'} |
| Indirizzo | ${counts.noAddress} | ${pct(counts.noAddress, total)} | ${prev ? fmtDelta(counts.noAddress - prev.no_address) : '—'} |
| Web / Instagram | ${counts.noWebsite} | ${pct(counts.noWebsite, total)} | ${prev ? fmtDelta(counts.noWebsite - prev.no_website) : '—'} |
| Orario/cadenza | ${counts.noSchedule} | ${pct(counts.noSchedule, total)} | ${prev ? fmtDelta(counts.noSchedule - prev.no_schedule) : '—'} |
| Categorie | ${counts.noCategories} | ${pct(counts.noCategories, total)} | ${prev ? fmtDelta(counts.noCategories - prev.no_categories) : '—'} |
| Orari apertura | ${counts.noTimes} | ${pct(counts.noTimes, total)} | ${prev ? fmtDelta(counts.noTimes - prev.no_times) : '—'} |
| Prezzo ingresso | ${counts.noPrice} | ${pct(counts.noPrice, total)} | ${prev ? fmtDelta(counts.noPrice - prev.no_price) : '—'} |
| Coordinate GPS | ${counts.noCoords} | ${pct(counts.noCoords, total)} | ${prev ? fmtDelta(counts.noCoords - prev.no_coords) : '—'} |
| Date scadute | ${counts.staleDates} | ${pct(counts.staleDates, total)} | ${prev ? fmtDelta(counts.staleDates - prev.stale_dates) : '—'} |

---

## 🗺️ Score per regione (peggiori → migliori)

| Regione | Mercati | Score | Barra |
|---|---|---|---|
${regionRows}

---

${actionQueue.length > 0 ? `## 🔧 Coda priorità (top ${actionQueue.length} mercati da completare)

Mercati con il punteggio più basso, in produzione da almeno 7 giorni.

| Prior. | Mercato | Città | Regione | Score | Mancante |
|---|---|---|---|---|---|
${queueRows}

` : '## ✅ Nessun mercato critico in coda\n\n'}${staleMarkets.length > 0 ? `## ⚠️ Date scadute (${staleMarkets.length})

Il refresh automatico non ha trovato la prossima data — verificare manualmente.

| Mercato | Città | Regione | Ultima data | Cadenza |
|---|---|---|---|---|
${staleRows}

` : ''}${neverValidated.length > 0 ? `## 🕐 Mai validati (presenti da >30 giorni, ${neverValidated.length})

| Mercato | Città | Regione | Score |
|---|---|---|---|
${neverRows}

` : ''}${newMarkets.length > 0 ? `## 🆕 Aggiunti questa settimana (${newMarkets.length})

| Mercato | Città | Regione | Verificato | Score |
|---|---|---|---|---|
${newRows}

` : ''}---
_Generato da GitHub Actions — ${dateLabel} — [vintagery.it](https://vintagery.it)_`

process.stdout.write(report)

// ── Helper ────────────────────────────────────────────────────────────────────

function pct(n, tot) {
  return tot > 0 ? `${Math.round(n / tot * 100)}%` : '—'
}

function fmtDelta(d) {
  if (d === 0)  return '='
  if (d > 0)    return `+${d} ▲`
  return `${d} ▼`
}
