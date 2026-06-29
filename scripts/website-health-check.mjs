#!/usr/bin/env node
/**
 * Website Health Check — verifica che i siti web dei mercati siano raggiungibili.
 * Aggiorna is_verified=false per i mercati con sito irraggiungibile (3 tentativi).
 * Output: Markdown per GitHub Issue.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const TIMEOUT_MS  = 8000
const CONCURRENCY = 10

async function checkUrl(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      const res = await fetch(url, {
        method: 'HEAD',
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Vintagery-HealthCheck/1.0' },
      })
      clearTimeout(timer)
      if (res.status < 500) return { ok: true, status: res.status }
    } catch {
      if (attempt === 3) return { ok: false, status: 0 }
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
  return { ok: false, status: 0 }
}

async function runBatch(markets) {
  const results = []
  for (let i = 0; i < markets.length; i += CONCURRENCY) {
    const batch = markets.slice(i, i + CONCURRENCY)
    const checks = await Promise.all(
      batch.map(async m => ({ market: m, ...(await checkUrl(m.website)) }))
    )
    results.push(...checks)
    if (i + CONCURRENCY < markets.length) {
      process.stderr.write(`  ${i + CONCURRENCY}/${markets.length} verificati...\n`)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return results
}

const { data: markets } = await supabase
  .from('markets')
  .select('id, name, city, region, website, is_verified')
  .not('website', 'is', null)
  .order('region')

process.stderr.write(`Verifico ${markets.length} siti web...\n`)

const results = await runBatch(markets)

const broken  = results.filter(r => !r.ok)
const ok      = results.filter(r => r.ok)
const percent = Math.round((ok.length / results.length) * 100)

// Aggiorna is_verified=false per mercati con sito rotto (solo se era true)
const toFlagIds = broken
  .filter(r => r.market.is_verified)
  .map(r => r.market.id)

if (toFlagIds.length > 0) {
  await supabase
    .from('markets')
    .update({ is_verified: false })
    .in('id', toFlagIds)
  process.stderr.write(`⚠️  ${toFlagIds.length} mercati impostati is_verified=false\n`)
}

const brokenRows = broken
  .map(r => `| [${r.market.name}](https://vintagery.it/mercatini/${r.market.id}) | ${r.market.city} | ${r.market.region} | \`${r.status || 'timeout'}\` | ${r.market.website} |`)
  .join('\n')

const week = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const report = `# 🌐 Health Check Siti Web — ${week}

## Risultato

| Metrica | Valore |
|---|---|
| Siti verificati | **${results.length}** |
| Raggiungibili | **${ok.length}** ✅ |
| Non raggiungibili | **${broken.length}** ${broken.length > 0 ? '❌' : '✅'} |
| Uptime | **${percent}%** |

${broken.length > 0 ? `## ❌ Siti non raggiungibili (${broken.length})

Questi mercati sono stati impostati automaticamente a \`is_verified=false\`.

| Mercato | Città | Regione | HTTP | URL |
|---|---|---|---|---|
${brokenRows}

> Azione: verificare manualmente e aggiornare o rimuovere l'URL.
` : '## ✅ Tutti i siti sono raggiungibili\n'}

---
*Generato automaticamente da GitHub Actions · [Vai a vintagery.it](https://vintagery.it)*`

process.stdout.write(report)
