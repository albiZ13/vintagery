import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  async function updateShopPlan(customerId: string, plan: string, expiresAt?: Date | null) {
    await supabase.from('shops').update({
      plan,
      plan_expires_at: expiresAt?.toISOString() ?? null,
    }).eq('stripe_customer_id', customerId)
  }

  async function notifyOwner(customerId: string, type: string, title: string, body: string, href: string) {
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('stripe_customer_id', customerId)
      .single()
    if (shop?.owner_id) {
      await supabase.from('notifications').insert({ user_id: shop.owner_id, type, title, body, href })
    }
  }

  async function notifyOwnerByShopId(shopId: string, type: string, title: string, body: string, href: string) {
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single()
    if (shop?.owner_id) {
      await supabase.from('notifications').insert({ user_id: shop.owner_id, type, title, body, href })
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const sess = event.data.object as Stripe.Checkout.Session
      if (sess.metadata?.plan !== 'event_promo') break
      if (sess.payment_status !== 'paid') break

      const m = sess.metadata
      const shopId = m.shop_id

      // Get shop region as fallback
      const { data: shopData } = await supabase
        .from('shops')
        .select('name, region')
        .eq('id', shopId)
        .single()

      const region = m.ev_region || shopData?.region || ''

      // Insert sponsored event into market_events
      const { data: insertedEvent } = await supabase.from('market_events').insert({
        name:              m.ev_name,
        description:       m.ev_description || null,
        event_type:        m.ev_type || 'evento',
        city:              m.ev_city,
        region,
        address:           m.ev_address || null,
        start_date:        m.ev_date,
        start_time:        m.ev_start_time || null,
        end_time:          m.ev_end_time   || null,
        price_info:        m.ev_price_info || null,
        organizer:         shopData?.name  || null,
        source:            'sponsored',
        is_verified:       true,
        is_featured:       true,
        is_sponsored:      true,
        sponsored_until:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stripe_payment_id: sess.payment_intent as string | null,
        shop_id:           shopId,
      }).select('id').single()

      await notifyOwnerByShopId(shopId, 'event_published',
        'Evento pubblicato!',
        `Il tuo evento "${m.ev_name}" è ora live su Vintagery.`,
        insertedEvent?.id ? `/mercatini/eventi/${insertedEvent.id}` : '/mercatini',
      )
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const active = sub.status === 'active' || sub.status === 'trialing'
      const expiresAt = active ? new Date((sub as any).current_period_end * 1000) : null
      await updateShopPlan(sub.customer as string, active ? 'premium' : 'free', expiresAt)
      if (event.type === 'customer.subscription.created' && active) {
        await notifyOwner(sub.customer as string, 'plan_activated',
          'Piano Pro attivato!',
          'Il tuo negozio è ora in Piano Pro. Tutti i vantaggi premium sono attivi.',
          '/dashboard?tab=piano')
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateShopPlan(sub.customer as string, 'free', null)
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      await notifyOwner(inv.customer as string, 'payment_failed',
        'Pagamento fallito',
        'Il tuo abbonamento Pro non è stato rinnovato. Aggiorna il metodo di pagamento.',
        '/dashboard?tab=piano')
      break
    }
  }

  return NextResponse.json({ received: true })
}
