import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Parser cadenza ────────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, number> = {
  'domenica': 0, 'lunedi': 1, 'martedi': 2, 'mercoledi': 3,
  'giovedi': 4, 'venerdi': 5, 'sabato': 6,
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function parseWeekday(s: string): number | null {
  const n = normalize(s)
  for (const [key, val] of Object.entries(WEEKDAY_MAP)) {
    if (n.includes(key)) return val
  }
  return null
}

function nextWeekdayFrom(from: Date, weekday: number): Date {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const diff = ((weekday - d.getDay()) + 7) % 7
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
  return d
}

// Usa componenti locali per evitare drift UTC
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  if (n === -1) {
    // last occurrence
    const candidates: Date[] = []
    const d = new Date(year, month, 1)
    while (d.getMonth() === month) {
      if (d.getDay() === weekday) candidates.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return candidates[candidates.length - 1] ?? new Date(year, month, 28)
  }
  let count = 0
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (d.getDay() === weekday) {
      count++
      if (count === n) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
  return new Date(year, month, 1)
}

function advanceMonth(year: number, month: number): { year: number; month: number } {
  return month === 11
    ? { year: year + 1, month: 0 }
    : { year, month: month + 1 }
}

export function computeNextDate(description: string | null, today: Date): string | null {
  if (!description) return null

  const cadenzaMatch = description.match(/Cadenza:\s*(.+?)(?:\n|$)/i)
  if (!cadenzaMatch) return null

  const raw = cadenzaMatch[1].trim()
  const c   = normalize(raw)

  // "tutti i giorni" → domani
  if (c.includes('tutti i giorni')) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return localDateStr(d)
  }

  // Ordinals map: prefix → n
  const ORDINALS: [string, number][] = [
    ['prim', 1], ['second', 2], ['terz', 3], ['quart', 4], ['quint', 5],
    ['ultim', -1],
  ]

  // "ultimo/ultima sabato/domenica del mese" OR "quarta domenica del mese"
  if (c.includes('del mese') || c.includes('del mes')) {
    for (const [prefix, n] of ORDINALS) {
      if (c.includes(prefix)) {
        const wd = parseWeekday(c)
        if (wd !== null) {
          const todayStr = localDateStr(today)
          let result = nthWeekdayOfMonth(today.getFullYear(), today.getMonth(), wd, n)
          if (localDateStr(result) <= todayStr) {
            const next = advanceMonth(today.getFullYear(), today.getMonth())
            result = nthWeekdayOfMonth(next.year, next.month, wd, n)
          }
          return localDateStr(result)
        }
      }
    }
  }

  // "ogni sabato" / "ogni domenica" / "ogni sabato e domenica"
  if (c.startsWith('ogni ') || c.includes('ogni ')) {
    const wd = parseWeekday(c)
    if (wd !== null) {
      return localDateStr(nextWeekdayFrom(today, wd))
    }
  }

  // "primo sabato e domenica del mese" (es. Fiera Antiquaria Arezzo)
  // handled above by ORDINALS + del mese

  return null
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Trova tutti i mercati ricorrenti con start_date passata
  const { data: stale, error } = await supabase
    .from('market_events')
    .select('id, name, city, start_date, end_date, description')
    .eq('is_recurring', true)
    .lt('start_date', todayStr)

  if (error) {
    console.error('[refresh-dates]', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ updated: 0, message: 'nessuna data scaduta' })
  }

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const ev of stale) {
    const nextDate = computeNextDate(ev.description, today)

    if (!nextDate) {
      skipped++
      continue
    }

    // Calcola end_date: se il mercato aveva una durata (end_date - start_date), mantienila
    let newEndDate: string | null = null
    if (ev.end_date && ev.end_date !== ev.start_date) {
      const duration = Math.round(
        (new Date(ev.end_date).getTime() - new Date(ev.start_date).getTime()) / 86400000
      )
      const end = new Date(nextDate)
      end.setDate(end.getDate() + duration)
      newEndDate = end.toISOString().slice(0, 10)
    }

    const { error: updateErr } = await supabase
      .from('market_events')
      .update({
        start_date: nextDate,
        ...(newEndDate !== null ? { end_date: newEndDate } : {}),
      })
      .eq('id', ev.id)

    if (updateErr) {
      errors.push(`${ev.name}: ${updateErr.message}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    total:   stale.length,
    updated,
    skipped,
    errors:  errors.length > 0 ? errors : undefined,
    date:    todayStr,
  })
}
