import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIp } from '@/lib/rate-limit'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let email: string, region: string | undefined
  try {
    const body = await req.json()
    email  = (body.email  ?? '').trim().toLowerCase()
    region = (body.region ?? '').trim() || undefined
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Controlla se esiste già
  const { data: existing } = await supabase
    .from('region_subscriptions')
    .select('id, active')
    .eq('email', email)
    .eq('region', region ?? null)
    .maybeSingle()

  if (existing) {
    if (!existing.active) {
      // Riattiva iscrizione precedentemente cancellata
      await supabase
        .from('region_subscriptions')
        .update({ active: true })
        .eq('id', existing.id)
      return NextResponse.json({ ok: true, reactivated: true })
    }
    return NextResponse.json({ ok: true, exists: true })
  }

  const { error } = await supabase
    .from('region_subscriptions')
    .insert({ email, region: region ?? null })

  if (error) {
    console.error('[subscribe]', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
