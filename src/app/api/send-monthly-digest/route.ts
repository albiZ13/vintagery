import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { monthlyDigestEmail } from '@/lib/email/templates'

type DigestEvent = {
  id: string
  name: string
  city: string
  start_date: string
  event_type: string
  price_info: string | null
  is_recurring: boolean
}

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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'no_api_key' })
  }

  const resend  = new Resend(process.env.RESEND_API_KEY)
  const supabase = getServiceClient()

  // Mese corrente
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const endOfMonth   = new Date(year, month, 0).toISOString().split('T')[0]

  // Iscritti attivi non ancora contattati questo mese
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`
  const { data: subs, error: subErr } = await supabase
    .from('region_subscriptions')
    .select('id, email, region, unsubscribe_token')
    .eq('active', true)
    .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${monthStart}`)

  if (subErr) {
    console.error('[digest] subs fetch error:', subErr.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'no_subscribers' })
  }

  // Raccogli le regioni uniche da interrogare
  const regionSet = new Set<string>()
  for (const s of subs) regionSet.add(s.region ?? '')
  const regions = Array.from(regionSet)

  // Fetch eventi per ogni regione (in parallelo)
  const eventsByRegion = new Map<string, DigestEvent[]>()
  await Promise.all(regions.map(async region => {
    let q = supabase
      .from('market_events')
      .select('id,name,city,start_date,event_type,price_info,is_recurring')
      .gte('start_date', startOfMonth)
      .lte('start_date', endOfMonth)
      .order('start_date', { ascending: true })
      .limit(20)
    if (region) q = q.eq('region', region)
    const { data } = await q
    eventsByRegion.set(region, (data ?? []) as DigestEvent[])
  }))

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const sub of subs) {
    const events = eventsByRegion.get(sub.region ?? '') ?? []
    if (events.length === 0) { skipped++; continue }

    const { subject, html } = monthlyDigestEmail({
      email:            sub.email,
      region:           sub.region ?? null,
      month,
      year,
      events,
      unsubscribeToken: sub.unsubscribe_token,
    })

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'Vintagery <onboarding@resend.dev>',
        to:   sub.email,
        subject,
        html,
      })

      await supabase
        .from('region_subscriptions')
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq('id', sub.id)

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${sub.email}: ${msg}`)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    month: `${year}-${String(month).padStart(2, '0')}`,
  })
}
