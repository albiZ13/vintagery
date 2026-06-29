import { NextRequest, NextResponse } from 'next/server'
import webPush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

function getWeekendRange(): { satStr: string; sunStr: string } {
  const today = new Date()
  const dow = today.getDay()
  const daysToSat = dow === 6 ? 0 : (6 - dow)
  const daysToSun = dow === 0 ? 0 : (7 - dow)
  const sat = new Date(today); sat.setDate(today.getDate() + daysToSat)
  const sun = new Date(today); sun.setDate(today.getDate() + daysToSun)
  return {
    satStr: sat.toISOString().slice(0, 10),
    sunStr: sun.toISOString().slice(0, 10),
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { satStr, sunStr } = getWeekendRange()
  const sat = new Date(satStr + 'T12:00:00')
  const sun = new Date(sunStr + 'T12:00:00')

  const { data: markets } = await supabase
    .from('markets')
    .select('name,city,region')
    .gte('next_date', satStr)
    .lte('next_date', sunStr)
    .order('is_featured', { ascending: false })
    .limit(3)

  const count = markets?.length ?? 0
  const dateLabel = `${sat.getDate()}–${sun.getDate()} ${MONTHS_IT[sat.getMonth()]}`

  const payload = JSON.stringify({
    title: `Weekend vintage: ${count} mercati${count !== 1 ? '' : 'no'}`,
    body: count > 0
      ? `${markets!.map(m => `${m.name} (${m.city})`).join(', ')} — ${dateLabel}`
      : `Nessun mercato nel tuo calendario. Esplora le regioni.`,
    url: '/mercatini',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  let sent = 0, failed = 0

  await Promise.allSettled(
    (subs ?? []).map(async sub => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch {
        failed++
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    })
  )

  return NextResponse.json({ sent, failed, markets: count })
}
