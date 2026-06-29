import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

export async function POST(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
  const { shop_id } = await req.json()
  if (!shop_id) return NextResponse.json({ error: 'missing shop_id' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: shop } = await supabase
    .from('shops')
    .select('owner_id, stripe_customer_id')
    .eq('id', shop_id)
    .single()

  if (!shop) return NextResponse.json({ error: 'shop not found' }, { status: 404 })
  if (shop.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!shop.stripe_customer_id) return NextResponse.json({ error: 'no customer' }, { status: 404 })

  const session = await stripe.billingPortal.sessions.create({
    customer:   shop.stripe_customer_id,
    return_url: `${SITE}/dashboard?tab=piano`,
  })

  return NextResponse.json({ url: session.url })
}
