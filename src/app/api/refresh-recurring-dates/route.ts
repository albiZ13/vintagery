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

  // Legge dalla tabella markets i record con next_date scaduta
  const { data: stale, error } = await supabase
    .from('markets')
    .select('id, name, next_date, schedule_notes, frequency')
    .lt('next_date', todayStr)
    .not('schedule_notes', 'is', null)

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

  for (const market of stale) {
    // computeNextDate ora accetta direttamente schedule_notes
    const nextDate = computeNextDate(market.schedule_notes, today)

    if (!nextDate) { skipped++; continue }

    const { error: updateErr } = await supabase
      .from('markets')
      .update({ next_date: nextDate })
      .eq('id', market.id)

    if (updateErr) {
      errors.push(`${market.name}: ${updateErr.message}`)
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
