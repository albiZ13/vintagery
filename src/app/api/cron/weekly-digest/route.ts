import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { weeklyDigestEmail } from '@/lib/email/templates'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

function getWeekendRange(): { satStr: string; sunStr: string } {
  const today = new Date()
  const dow = today.getDay()
  const sat = new Date(today); sat.setDate(today.getDate() + (dow === 6 ? 0 : 6 - dow))
  const sun = new Date(today); sun.setDate(today.getDate() + (dow === 0 ? 0 : 7 - dow))
  return {
    satStr: sat.toISOString().slice(0, 10),
    sunStr: sun.toISOString().slice(0, 10),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchMarketsForArea(
  supabase: any,
  satStr: string,
  sunStr: string,
  opts: { city?: string | null; region?: string | null },
) {
  let q = supabase
    .from('markets')
    .select('id,name,city,next_date,image_url')
    .gte('next_date', satStr)
    .lte('next_date', sunStr)
    .order('is_featured', { ascending: false })
    .limit(5)
  if (opts.city)   q = q.ilike('city', opts.city.replace(/-/g, ' '))
  else if (opts.region) q = q.eq('region', opts.region)
  const { data } = await q
  return data ?? []
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'no_api_key' })
  }

  const resend   = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { satStr, sunStr } = getWeekendRange()
  let sent = 0, failed = 0

  // ── 1. Utenti autenticati con notify_newsletter ─────────────────────────────
  const { data: authSubscribers } = await supabase
    .from('profiles')
    .select('id, first_name, region, notify_newsletter')
    .eq('notify_newsletter', true)

  if (authSubscribers && authSubscribers.length > 0) {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]))

    const { data: topShops } = await supabase
      .from('shops')
      .select('id,name,city,avg_rating')
      .eq('is_verified', true)
      .order('avg_rating', { ascending: false })
      .limit(3)

    for (const sub of authSubscribers) {
      const email = emailMap.get(sub.id)
      if (!email) continue

      const markets = await fetchMarketsForArea(supabase, satStr, sunStr, { region: sub.region ?? null })

      const { subject, html } = weeklyDigestEmail({
        firstName: sub.first_name ?? null,
        region:    sub.region ?? null,
        city:      null,
        markets,
        shops:     topShops ?? [],
        unsubUrl:  `${BASE_URL}/impostazioni`,
      })

      const { error } = await resend.emails.send({
        from: 'Vintagery <noreply@vintagery.it>',
        to: email,
        subject,
        html,
      })
      if (error) failed++; else sent++
    }
  }

  // ── 2. Iscritti anonimi (region_subscriptions) ──────────────────────────────
  const { data: anonSubs } = await supabase
    .from('region_subscriptions')
    .select('email, region, city, unsubscribe_token')
    .eq('active', true)

  if (anonSubs && anonSubs.length > 0) {
    for (const sub of anonSubs) {
      const markets = await fetchMarketsForArea(supabase, satStr, sunStr, {
        city:   sub.city   ?? null,
        region: sub.region ?? null,
      })

      const unsubUrl = `${BASE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`
      const { subject, html } = weeklyDigestEmail({
        firstName: null,
        region:    sub.region ?? null,
        city:      sub.city   ?? null,
        markets,
        shops:     [],
        unsubUrl,
      })

      const { error } = await resend.emails.send({
        from: 'Vintagery <noreply@vintagery.it>',
        to:   sub.email,
        subject,
        html,
      })
      if (error) failed++; else sent++
    }
  }

  return NextResponse.json({ sent, failed })
}
