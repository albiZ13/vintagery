import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import webPush from 'web-push'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

async function sendPushToUser(supabase: ReturnType<typeof service>, userId: string, title: string, body: string, url: string) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (!subs?.length) return
  const payload = JSON.stringify({ title, body, url, icon: '/icon-192.png' })
  await Promise.allSettled(
    subs.map(s =>
      webPush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ).catch(() => {})
    )
  )
}

// POST /api/messages — invia un messaggio
export async function POST(req: NextRequest) {
  // Verifica autenticazione
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { conversation_id, body, sender_type } = await req.json()
  if (!conversation_id || !body?.trim() || !sender_type) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const supabase = service()

  // Verifica che l'utente faccia parte della conversazione
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, shop_id, user_id, unread_shop, unread_user, shops(owner_id, name)')
    .eq('id', conversation_id)
    .single()

  if (!conv) return NextResponse.json({ error: 'conversation not found' }, { status: 404 })

  const shop = conv.shops as unknown as { owner_id: string; name: string } | null

  // Verifica autorizzazione: solo user_id o owner del negozio possono scrivere
  const isUser  = conv.user_id  === user.id
  const isShop  = shop?.owner_id === user.id
  if (!isUser && !isShop) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // sender_type deve corrispondere al ruolo reale
  const actualType = isShop && !isUser ? 'shop' : 'user'

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({ conversation_id, sender_id: user.id, sender_type: actualType, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggiorna last_message + incrementa unread del destinatario
  await supabase.from('conversations').update({
    last_message: body.trim().slice(0, 120),
    last_at:      new Date().toISOString(),
    unread_shop:  actualType === 'user'  ? (conv.unread_shop ?? 0) + 1 : conv.unread_shop ?? 0,
    unread_user:  actualType === 'shop' ? (conv.unread_user ?? 0) + 1 : conv.unread_user ?? 0,
  }).eq('id', conversation_id)

  // Notifica destinatario — in-app + push
  const notif_user_id = actualType === 'user' ? shop?.owner_id : conv.user_id
  if (notif_user_id) {
    const notifTitle = actualType === 'user'
      ? 'Nuovo messaggio da un utente'
      : `Risposta da ${shop?.name ?? 'un negozio'}`
    const notifBody = body.trim().slice(0, 80)
    const notifHref = `/messaggi/${conversation_id}`

    await Promise.allSettled([
      supabase.from('notifications').insert({
        user_id: notif_user_id,
        type:    'new_message',
        title:   notifTitle,
        body:    notifBody,
        href:    notifHref,
      }),
      sendPushToUser(supabase, notif_user_id, notifTitle, notifBody, notifHref),
    ])
  }

  return NextResponse.json(msg)
}

// GET /api/messages?conversation_id=xxx — recupera messaggi
export async function GET(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const conv_id = req.nextUrl.searchParams.get('conversation_id')
  if (!conv_id) return NextResponse.json({ error: 'missing conversation_id' }, { status: 400 })

  const supabase = service()

  // Verifica che l'utente faccia parte della conversazione
  const { data: conv } = await supabase
    .from('conversations')
    .select('user_id, shops(owner_id)')
    .eq('id', conv_id)
    .single()

  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const shopOwner = (conv.shops as unknown as { owner_id: string } | null)?.owner_id
  if (conv.user_id !== user.id && shopOwner !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conv_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
