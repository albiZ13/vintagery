import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { shopPostEmail } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { shopId, postId } = await req.json()
  if (!shopId || !postId) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'no_api_key' })
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Verifica che l'utente possieda il negozio
  const { data: shop } = await svc
    .from('shops')
    .select('id,name')
    .eq('id', shopId)
    .eq('owner_id', user.id)
    .single()

  if (!shop) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Recupera il post
  const { data: post } = await svc
    .from('shop_posts')
    .select('id,caption,image_url')
    .eq('id', postId)
    .eq('shop_id', shopId)
    .single()

  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 })

  // Followers con notify_shop_updates=true
  const { data: follows } = await svc
    .from('shop_follows')
    .select('user_id')
    .eq('shop_id', shopId)

  if (!follows || follows.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_followers' })
  }

  const followerIds = follows.map(f => f.user_id)

  const { data: profiles } = await svc
    .from('profiles')
    .select('id,first_name')
    .in('id', followerIds)
    .eq('notify_shop_updates', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_subscribed_followers' })
  }

  const { data: authData } = await svc.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map((authData?.users ?? []).map(u => [u.id, u.email]))

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0, failed = 0

  for (const profile of profiles) {
    const email = emailMap.get(profile.id)
    if (!email) continue

    const { subject, html } = shopPostEmail({
      firstName: profile.first_name ?? 'Ciao',
      shopName:  shop.name,
      shopId:    shop.id,
      caption:   post.caption,
      imageUrl:  post.image_url,
    })

    const { error } = await resend.emails.send({
      from: 'Vintagery <noreply@vintagery.it>',
      to:   email,
      subject,
      html,
    })
    if (error) failed++; else sent++
  }

  return NextResponse.json({ sent, failed })
}
