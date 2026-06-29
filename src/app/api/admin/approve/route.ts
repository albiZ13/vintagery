import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import {
  shopApprovedEmail, shopRejectedEmail,
  proposalApprovedEmail, proposalRejectedEmail,
} from '@/lib/email/templates'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/admin/approve
// { type: 'shop' | 'proposal', id: string, action: 'approve' | 'reject', reason?: string }
export async function POST(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { type, id, action, reason } = await req.json()
  if (!type || !id || !action) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const supabase = service()
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  if (type === 'shop') {
    const isApproved = action === 'approve'

    // Imposta trial 90 giorni alla verifica
    const trialEndsAt = isApproved
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : null

    await supabase.from('shops').update({
      is_verified:   isApproved,
      trial_ends_at: trialEndsAt,
    }).eq('id', id)

    const { data: shop } = await supabase
      .from('shops')
      .select('name, owner_id')
      .eq('id', id)
      .single()

    if (shop && resend) {
      const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(shop.owner_id)
      const email = ownerUser?.email

      if (email) {
        const tpl = isApproved
          ? shopApprovedEmail({ shopName: shop.name, shopId: id })
          : shopRejectedEmail({ shopName: shop.name, reason })

        await resend.emails.send({
          from:    'Vintagery <noreply@vintagery.it>',
          to:      email,
          subject: tpl.subject,
          html:    tpl.html,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  }

  if (type === 'proposal') {
    const isApproved = action === 'approve'

    await supabase
      .from('market_proposals')
      .update({ status: isApproved ? 'approved' : 'rejected' })
      .eq('id', id)

    const { data: proposal } = await supabase
      .from('market_proposals')
      .select('name, city, region, address, date, start_time, end_time, description, price_info, organizer_name, shop_id, email, event_type')
      .eq('id', id)
      .single()

    if (!proposal) return NextResponse.json({ ok: true })

    // Inserisce l'evento su market_events quando approvato
    if (isApproved) {
      const { data: insertedEvent } = await supabase.from('market_events').insert({
        name:        proposal.name,
        description: (proposal as any).description || null,
        event_type:  (proposal as any).event_type || 'evento',
        city:        proposal.city,
        region:      proposal.region || null,
        address:     (proposal as any).address || null,
        start_date:  (proposal as any).date,
        start_time:  (proposal as any).start_time || null,
        end_time:    (proposal as any).end_time || null,
        price_info:  (proposal as any).price_info || null,
        organizer:   (proposal as any).organizer_name || null,
        shop_id:     (proposal as any).shop_id || null,
        source:      'proposal',
        is_verified: true,
      }).select('id').single()

      // Notifica in-app al negozio
      if ((proposal as any).shop_id) {
        const { data: shopRow } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', (proposal as any).shop_id)
          .single()
        if (shopRow?.owner_id) {
          await supabase.from('notifications').insert({
            user_id: shopRow.owner_id,
            type:    'event_published',
            title:   'Evento approvato!',
            body:    `Il tuo evento "${proposal.name}" è ora live su Vintagery.`,
            href:    insertedEvent?.id ? `/mercatini/eventi/${insertedEvent.id}` : '/mercatini',
          })
        }
      }
    }

    // Risolvi email: dal form pubblico o dall'owner del negozio
    let toEmail: string | null = proposal.email ?? null
    if (!toEmail && (proposal as any).shop_id) {
      const { data: shopRow } = await supabase
        .from('shops')
        .select('owner_id')
        .eq('id', (proposal as any).shop_id)
        .single()
      if (shopRow?.owner_id) {
        const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(shopRow.owner_id)
        toEmail = ownerUser?.email ?? null
      }
    }

    if (toEmail && resend) {
      const tpl = isApproved
        ? proposalApprovedEmail({ proposalName: proposal.name, city: proposal.city })
        : proposalRejectedEmail({ proposalName: proposal.name, reason })

      await resend.emails.send({
        from:    'Vintagery <noreply@vintagery.it>',
        to:      toEmail,
        subject: tpl.subject,
        html:    tpl.html,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
