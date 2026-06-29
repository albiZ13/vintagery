import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { newMarketEmail } from '@/lib/email/templates'

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

  // Mercati creati nelle ultime 24 ore
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: newMarkets } = await supabase
    .from('markets')
    .select('id,name,city,region')
    .gte('created_at', since)
    .eq('is_verified', true)

  if (!newMarkets || newMarkets.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_new_markets' })
  }

  // Raggruppa per regione
  const byRegion = new Map<string, typeof newMarkets>()
  for (const m of newMarkets) {
    if (!m.region) continue
    if (!byRegion.has(m.region)) byRegion.set(m.region, [])
    byRegion.get(m.region)!.push(m)
  }

  // Utenti con notify_new_markets=true
  const { data: subscribers } = await supabase
    .from('profiles')
    .select('id,first_name,region')
    .eq('notify_new_markets', true)
    .not('region', 'is', null)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_subscribers' })
  }

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map((authData?.users ?? []).map(u => [u.id, u.email]))

  let sent = 0, failed = 0

  for (const sub of subscribers) {
    const email = emailMap.get(sub.id)
    if (!email || !sub.region) continue

    const markets = byRegion.get(sub.region)
    if (!markets || markets.length === 0) continue

    // Invia una email per ogni nuovo mercatino nella regione dell'utente
    for (const market of markets) {
      const { subject, html } = newMarketEmail({
        firstName:    sub.first_name ?? 'Ciao',
        marketName:   market.name,
        marketCity:   market.city,
        marketRegion: market.region,
        marketId:     market.id,
      })

      const { error } = await resend.emails.send({
        from: `Vintagery <noreply@vintagery.it>`,
        to:   email,
        subject,
        html,
      })
      if (error) failed++; else sent++
    }
  }

  return NextResponse.json({ sent, failed, newMarkets: newMarkets.length })
}
