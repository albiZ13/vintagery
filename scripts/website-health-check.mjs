#!/usr/bin/env node
/**
 * Website Health Check — verifica raggiungibilità e qualità URL dei mercati.
 *
 * Per ogni mercato con website:
 *  1. HTTP HEAD con 3 tentativi e backoff
 *  2. Rilevazione redirect (catene lunghe = segnale di dominio scaduto)
 *  3. Detects common dead-domain patterns (Wix, GoDaddy parked, etc.)
 *  4. Imposta is_verified=false per i siti con errore 4xx/5xx o timeout
 *  5. Logga per regione e produce un report Markdown completo
 *
 * Output: Markdown su stdout — catturato dal workflow GitHub Actions.
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  process.stderr.write('❌ Secrets mancanti: SUPABASE_URL e SUPABASE_SERVICE_KEY devono essere configurati in GitHub → Settings → Secrets → Actions.\n')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const TIMEOUT_MS   = 10_000
const CONCURRENCY  = 8
const MAX_RETRIES  = 3

const PARKED_PATTERNS = [
  'sedo.com', 'dan.com', 'afternic.com',
  'godaddy.com/domains', 'wixsite.com/mysite',
  'domain for sale', 'dominio in vendita',
  'buy this domain', 'this domain is for sale',
]

// ── HTTP check ────────────────────────────────────────────────────────────────

async function checkUrl(url) {
  let lastStatus = 0
  let redirectCount = 0
  let finalUrl = url

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

      const res = await fetch(url, {
        method: 'HEAD',
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Vintagery-HealthBot/1.0 (+https://vintagery.it)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      })
      clearTimeout(timer)

      lastStatus  = res.status
      finalUrl    = res.url
      redirectCount = finalUrl !== url ? 1 : 0  // fetch non espone il redirect count direttamente

      // Cerca pattern di dominio parcheggiato nel URL finale
      const parked = PARKED_PATTERNS.some(p => finalUrl.toLowerCase().includes(p))

      if (res.status === 405) {
        // HEAD non supportato — riprova con GET
        const resGet = await fetch(url, {
          method: 'GET',
          signal: ctrl.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'Vintagery-HealthBot/1.0' },
        })
        return { ok: resGet.status < 400, status: resGet.status, finalUrl, parked, method: 'GET' }
      }

      return { ok: res.status < 400 && !parked, status: res.status, finalUrl, parked, method: 'HEAD' }

    } catch (err) {
      lastStatus = 0
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1500 * attempt))
      }
    }
  }

  return { ok: false, status: lastStatus, finalUrl, parked: false, method: 'HEAD' }
}

// ── Batch con concorrenza limitata ────────────────────────────────────────────

async function runBatch(markets) {
  const results = []
  let done = 0

  for (let i = 0; i < markets.length; i += CONCURRENCY) {
    const batch = markets.slice(i, i + CONCURRENCY)
    const checks = await Promise.all(
      batch.map(async m => ({
        market: m,
        ...(await checkUrl(m.website)),
      }))
    )
    results.push(...checks)
    done += batch.length
    process.stderr.write(`  ${done}/${markets.length} verificati\n`)

    if (i + CONCURRENCY < markets.length) {
      await new Promise(r => setTimeout(r, 800))
    }
  }
  return results
}

// ── Carica mercati ────────────────────────────────────────────────────────────

const { data: markets } = await supabase
  .from('markets')
  .select('id, name, city, region, website, is_verified')
  .not('website', 'is', null)
  .order('region')

if (!markets?.length) {
  process.stdout.write('# 🌐 Health Check — nessun mercato con sito web\n')
  process.exit(0)
}

process.stderr.write(`\nHealth check su ${markets.length} URL...\n`)
const results = await runBatch(markets)

// ── Classifica risultati ──────────────────────────────────────────────────────

const ok      = results.filter(r => r.ok)
const broken  = results.filter(r => !r.ok && !r.parked)
const parked  = results.filter(r => r.parked)
const allBad  = [...broken, ...parked]

const uptimePct  = Math.round((ok.length / results.length) * 100)

// ── Aggiorna DB ───────────────────────────────────────────────────────────────

const toFlagIds = allBad
  .filter(r => r.market.is_verified)
  .map(r => r.market.id)

if (toFlagIds.length > 0) {
  await supabase
    .from('markets')
    .update({ is_verified: false })
    .in('id', toFlagIds)
  process.stderr.write(`⚠️  ${toFlagIds.length} mercati → is_verified=false\n`)
}

// ── Analisi per regione ───────────────────────────────────────────────────────

const byRegion = {}
for (const r of results) {
  const reg = r.market.region
  if (!byRegion[reg]) byRegion[reg] = { ok: 0, bad: 0, parked: 0 }
  if (r.parked)    byRegion[reg].parked++
  else if (r.ok)   byRegion[reg].ok++
  else             byRegion[reg].bad++
}

const regionRows = Object.entries(byRegion)
  .sort(([, a], [, b]) => (b.bad + b.parked) - (a.bad + a.parked))
  .map(([reg, v]) => {
    const tot = v.ok + v.bad + v.parked
    const pct = Math.round(v.ok / tot * 100)
    return `| ${reg} | ${tot} | ${v.ok} ✅ | ${v.bad} ❌ | ${v.parked} 🅿️ | ${pct}% |`
  }).join('\n')

// ── Tabelle mercati problematici ──────────────────────────────────────────────

const brokenRows = broken
  .sort((a, b) => a.market.region.localeCompare(b.market.region))
  .map(r => {
    const statusLabel = r.status === 0 ? '`timeout`' : `\`${r.status}\``
    const wasVerified = r.market.is_verified ? '🔴 era ✅' : '⚪'
    return `| [${r.market.name}](https://vintagery.it/mercatini/${r.market.id}) | ${r.market.city} | ${r.market.region} | ${statusLabel} | ${wasVerified} | ${r.market.website} |`
  }).join('\n')

const parkedRows = parked
  .map(r =>
    `| [${r.market.name}](https://vintagery.it/mercatini/${r.market.id}) | ${r.market.city} | ${r.market.region} | ${r.finalUrl.slice(0, 60)} |`
  ).join('\n')

// ── Render ────────────────────────────────────────────────────────────────────

const dateLabel = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const report = `# 🌐 Health Check Siti Web — ${dateLabel}

## Riepilogo

| | |
|---|---|
| URL verificati | **${results.length}** |
| Raggiungibili | **${ok.length}** ✅ |
| Non raggiungibili | **${broken.length}** ❌ |
| Dominio parcheggiato | **${parked.length}** 🅿️ |
| Uptime globale | **${uptimePct}%** |
| Mercati impostati is_verified=false | **${toFlagIds.length}** |

---

## 🗺️ Per regione

| Regione | Tot. | ✅ Ok | ❌ Rotto | 🅿️ Parcheggiato | Uptime |
|---|---|---|---|---|---|
${regionRows}

---

${broken.length > 0 ? `## ❌ Siti non raggiungibili (${broken.length})

| Mercato | Città | Regione | HTTP | Stato prev. | URL |
|---|---|---|---|---|---|
${brokenRows}

> Azione: verificare manualmente e aggiornare o rimuovere l'URL.

` : '## ✅ Nessun sito irraggiungibile\n\n'}${parked.length > 0 ? `## 🅿️ Domini parcheggiati / scaduti (${parked.length})

Questi siti restituiscono 200 ma il dominio è stato ceduto o parcheggiato.

| Mercato | Città | Regione | URL finale |
|---|---|---|---|
${parkedRows}

> Azione: rimuovere l'URL dal campo \`website\` e cercare il nuovo sito ufficiale.

` : ''}---
_Generato da GitHub Actions — ${dateLabel} — [vintagery.it](https://vintagery.it)_`

process.stdout.write(report)
