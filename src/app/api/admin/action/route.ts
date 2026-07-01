import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function assertAdmin() {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const { data: p } = await auth.from('profiles').select('role').eq('id', user.id).single()
  return p?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = service()
  const body = await req.json()
  const { type } = body

  // ── Shop ──────────────────────────────────────────────────────────────────

  if (type === 'shop_plan') {
    const { id, plan } = body
    if (!id || !plan) return NextResponse.json({ error: 'missing params' }, { status: 400 })
    await supabase.from('shops').update({ plan }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'delete_shop') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    await supabase.from('shops').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // ── Market ────────────────────────────────────────────────────────────────

  if (type === 'delete_market') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    await supabase.from('markets').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'market_get') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    const { data } = await supabase.from('markets').select('*').eq('id', id).single()
    return NextResponse.json({ data })
  }

  if (type === 'market_upsert') {
    const { id, type: _, ...fields } = body as Record<string, unknown>
    if (id) {
      const { error } = await supabase.from('markets').update(fields).eq('id', id as string)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id })
    } else {
      const { data, error } = await supabase.from('markets').insert(fields).select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: data?.id })
    }
  }

  // ── market_events ─────────────────────────────────────────────────────────

  if (type === 'delete_event') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    await supabase.from('market_events').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // ── Review ────────────────────────────────────────────────────────────────

  if (type === 'delete_review') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    await supabase.from('reviews').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  if (type === 'user_role') {
    const { id, role } = body
    if (!id || !role) return NextResponse.json({ error: 'missing params' }, { status: 400 })
    // service role bypasses the no_admin_self_promotion trigger
    await supabase.from('profiles').update({ role }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'ban_user') {
    const { id, ban } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    await supabase.from('profiles').update({ role: ban ? 'banned' : 'user' }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  if (type === 'notify_user') {
    const { user_id, title, body: notifBody, href } = body
    if (!user_id || !title) return NextResponse.json({ error: 'missing params' }, { status: 400 })
    await supabase.from('notifications').insert({
      user_id,
      type: 'admin',
      title,
      body: notifBody || null,
      href: href || null,
    })
    return NextResponse.json({ ok: true })
  }

  if (type === 'notify_broadcast') {
    const { title, body: notifBody, href } = body
    if (!title) return NextResponse.json({ error: 'missing title' }, { status: 400 })
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .not('role', 'eq', 'banned')

    if (!users?.length) return NextResponse.json({ ok: true, sent: 0 })

    const rows = users.map(u => ({
      user_id: u.id,
      type:    'admin',
      title,
      body:    notifBody || null,
      href:    href || null,
    }))

    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from('notifications').insert(rows.slice(i, i + 100))
    }

    return NextResponse.json({ ok: true, sent: users.length })
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
