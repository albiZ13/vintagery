/**
 * GET /api/notify-events
 *
 * Cron job giornaliero: invia promemoria email agli utenti che hanno salvato
 * un mercatino con `next_date` a 3 giorni di distanza.
 *
 * Richiede:
 *   - Authorization: Bearer ${CRON_SECRET}
 *   - RESEND_API_KEY in .env.local
 *
 * Pianificazione consigliata su Vercel Cron:
 *   "0 8 * * *"  → ogni mattina alle 08:00 UTC
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { upcomingEventEmail } from '@/lib/email/templates'
import { rateLimit, getIp } from '@/lib/rate-limit'

const DAYS_AHEAD = 3

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  // Auth
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Rate limit: 2 call/ora per IP (evita doppi trigger)
  if (!rateLimit(getIp(req), 2, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[notify-events] RESEND_API_KEY non configurata — skip invio email')
    return NextResponse.json({ skipped: true, reason: 'no_api_key' })
  }

  const resend  = new Resend(process.env.RESEND_API_KEY)
  const supabase = getServiceClient()

  // Data target: oggi + 3 giorni
  const target = new Date()
  target.setDate(target.getDate() + DAYS_AHEAD)
  const targetStr = target.toISOString().split('T')[0] // 'YYYY-MM-DD'

  // Trova mercatini con next_date = target
  const { data: markets, error: mErr } = await supabase
    .from('markets')
    .select('id, name, city, region, next_date')
    .eq('next_date', targetStr)

  if (mErr) {
    console.error('[notify-events] markets fetch error:', mErr.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!markets || markets.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: 'no_markets_today' })
  }

  const marketIds = markets.map(m => m.id)

  // Trova utenti che hanno salvato uno di questi mercatini E hanno notifiche attive
  const { data: favorites, error: fErr } = await supabase
    .from('user_favorites')
    .select('user_id, target_id')
    .in('target_id', marketIds)
    .eq('target_type', 'market')

  if (fErr) {
    console.error('[notify-events] favorites fetch error:', fErr.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!favorites || favorites.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: 'no_favorites' })
  }

  const userIdSet = new Set<string>()
  favorites.forEach(f => userIdSet.add(f.user_id))
  const userIds = Array.from(userIdSet)

  // Carica profili con notifiche attive
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, first_name, username')
    .in('id', userIds)
    .eq('notify_upcoming_events', true)

  if (pErr) {
    console.error('[notify-events] profiles fetch error:', pErr.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Carica email dagli utenti auth (service role richiesto)
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  // Controlla quali notifiche sono già state inviate oggi
  const today = new Date().toISOString().split('T')[0]
  const { data: alreadySent } = await supabase
    .from('notification_log')
    .select('user_id, ref_id')
    .eq('type', 'upcoming_event')
    .gte('sent_at', `${today}T00:00:00Z`)

  const sentSet = new Set((alreadySent ?? []).map(s => `${s.user_id}:${s.ref_id}`))

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const profile of (profiles ?? [])) {
    const email = emailMap.get(profile.id)
    if (!email) continue

    const userFavs = favorites.filter(f => f.user_id === profile.id)

    for (const fav of userFavs) {
      const key = `${profile.id}:${fav.target_id}`
      if (sentSet.has(key)) { skipped++; continue }

      const market = markets.find(m => m.id === fav.target_id)
      if (!market) continue

      const { subject, html } = upcomingEventEmail({
        firstName:  profile.first_name ?? profile.username ?? 'Ciao',
        marketName: market.name,
        marketCity: market.city,
        marketId:   market.id,
        nextDate:   market.next_date,
        daysLeft:   DAYS_AHEAD,
      })

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? 'Vintagery <onboarding@resend.dev>',
          to:   email,
          subject,
          html,
        })

        // Registra nel log
        await supabase.from('notification_log').insert({
          user_id: profile.id,
          type:    'upcoming_event',
          ref_id:  fav.target_id,
        })

        sent++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${email}: ${msg}`)
      }
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    errors: errors.length > 0 ? errors.length : undefined,
    date:   targetStr,
  })
}
