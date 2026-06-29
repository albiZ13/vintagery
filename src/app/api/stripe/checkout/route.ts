import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

export async function POST(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
  const body: { shop_id?: string; plan?: string; event?: Record<string, string> } = await req.json()
  const { shop_id, plan, event } = body
  if (!shop_id || !plan) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, email, owner_id, stripe_customer_id, region')
    .eq('id', shop_id)
    .single()

  if (!shop) return NextResponse.json({ error: 'shop not found' }, { status: 404 })
  if (shop.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let customerId = shop.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name:     shop.name,
      email:    shop.email ?? undefined,
      metadata: { shop_id: shop.id, owner_id: shop.owner_id },
    })
    customerId = customer.id
    await supabase.from('shops').update({ stripe_customer_id: customerId }).eq('id', shop.id)
  }

  // ── Evento sponsorizzato (one-time €19,90) ───────────────────────────
  if (plan === 'event_promo') {
    if (!event?.name || !event?.date || !event?.city) {
      return NextResponse.json({ error: 'nome, data e città obbligatori' }, { status: 400 })
    }
    const meta: Record<string, string> = {
      shop_id:       shop.id,
      plan:          'event_promo',
      ev_name:       event.name.slice(0, 490),
      ev_city:       (event.city        ?? '').slice(0, 200),
      ev_region:     (event.region      ?? shop.region ?? '').slice(0, 100),
      ev_address:    (event.address     ?? '').slice(0, 490),
      ev_date:       event.date,
      ev_start_time: event.start_time  ?? '',
      ev_end_time:   event.end_time    ?? '',
      ev_price_info: (event.price_info  ?? '').slice(0, 490),
      ev_description:(event.description ?? '').slice(0, 490),
      ev_type:       event.event_type  ?? 'evento',
    }
    const sess = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'payment',
      line_items: [{
        price_data: {
          currency:     'eur',
          product_data: {
            name:        `Evento sponsorizzato: ${event.name}`,
            description: 'Pubblicazione immediata su Vintagery',
          },
          unit_amount: 1990,
        },
        quantity: 1,
      }],
      success_url:           `${SITE}/dashboard?tab=evento&success=promo`,
      cancel_url:            `${SITE}/dashboard?tab=evento`,
      metadata:              meta,
      allow_promotion_codes: true,
    })
    return NextResponse.json({ url: sess.url })
  }

  // ── Abbonamento Pro ───────────────────────────────────────────────────
  const priceId = process.env.STRIPE_PRICE_PRO ?? ''
  if (!priceId) return NextResponse.json({ error: 'unknown plan' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    customer:              customerId,
    mode:                  'subscription',
    line_items:            [{ price: priceId, quantity: 1 }],
    success_url:           `${SITE}/dashboard?tab=piano&success=1`,
    cancel_url:            `${SITE}/dashboard?tab=piano`,
    metadata:              { shop_id: shop.id, plan },
    subscription_data:     { trial_period_days: 0 },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
