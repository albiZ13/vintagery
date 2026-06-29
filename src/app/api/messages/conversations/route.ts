import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST — crea o restituisce conversazione tra utente autenticato e shop
export async function POST(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { shop_id } = await req.json()
  if (!shop_id) return NextResponse.json({ error: 'missing shop_id' }, { status: 400 })

  const supabase = service()

  // Verifica che il negozio esista e non appartenga allo stesso utente
  const { data: shop } = await supabase
    .from('shops')
    .select('id, owner_id')
    .eq('id', shop_id)
    .single()

  if (!shop) return NextResponse.json({ error: 'shop not found' }, { status: 404 })
  if (shop.owner_id === user.id) {
    return NextResponse.json({ error: 'cannot message your own shop' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .eq('shop_id', shop_id)
    .single()

  if (existing) return NextResponse.json(existing)

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, shop_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — segna come letto
export async function PATCH(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { conversation_id, reader_type } = await req.json()
  if (!conversation_id) return NextResponse.json({ error: 'missing conversation_id' }, { status: 400 })

  const supabase = service()

  // Verifica ownership prima di azzerare
  const { data: conv } = await supabase
    .from('conversations')
    .select('user_id, shops(owner_id)')
    .eq('id', conversation_id)
    .single()

  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const shopOwner = (conv.shops as unknown as { owner_id: string } | null)?.owner_id
  if (conv.user_id !== user.id && shopOwner !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const col = reader_type === 'user' ? 'unread_user' : 'unread_shop'
  await supabase.from('conversations').update({ [col]: 0 }).eq('id', conversation_id)

  return NextResponse.json({ ok: true })
}
