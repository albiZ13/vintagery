import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeNextDate, localDateStr } from '@/lib/cadenza'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const today    = new Date()
  const todayStr = localDateStr(today)

  const { data: stale, error } = await supabase
    .from('market_events')
    .select('id, name, start_date, end_date, description')
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

    if (!nextDate) { skipped++; continue }

    // Mantieni la durata originale per eventi multi-giorno
    let newEndDate: string | null = null
    if (ev.end_date && ev.end_date !== ev.start_date) {
      const duration = Math.round(
        (new Date(ev.end_date).getTime() - new Date(ev.start_date).getTime()) / 86400000
      )
      const end = new Date(nextDate + 'T12:00:00')
      end.setDate(end.getDate() + duration)
      newEndDate = localDateStr(end)
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
