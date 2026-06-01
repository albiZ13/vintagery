/**
 * Esegue schema.sql + migration_v2.sql su Supabase via Management API
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Legge .env.local
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const SECRET_KEY  = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log(`Progetto: ${PROJECT_REF}`)
console.log(`Chiave:   ${SECRET_KEY.slice(0,20)}...\n`)

async function runSQL(label, sql) {
  console.log(`▶ ${label}`)
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const text = await res.text()
  if (!res.ok) {
    console.error(`  ✗ HTTP ${res.status}: ${text.slice(0, 300)}`)
    return false
  }
  console.log(`  ✓ OK`)
  return true
}

async function main() {
  const schemaSQL = readFileSync(resolve(__dir, '../supabase/schema.sql'), 'utf8')
  const migrSQL   = readFileSync(resolve(__dir, '../supabase/migration_v2.sql'), 'utf8')
  const seedSQL   = readFileSync(resolve(__dir, '../supabase/seed.sql'), 'utf8')

  await runSQL('schema.sql (struttura base)', schemaSQL)
  await runSQL('migration_v2.sql (post, follow, trust, P.IVA, ads)', migrSQL)
  await runSQL('seed.sql (mercatini e negozi di esempio)', seedSQL)

  console.log('\nDone.')
}

main().catch(console.error)
