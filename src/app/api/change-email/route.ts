import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const { email } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
  }
  if (email === user.email) {
    return NextResponse.json({ error: 'È già la tua email attuale' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check if email is already in use
  const { data: existing } = await admin.auth.admin.listUsers()
  if (existing?.users.some(u => u.email === email && u.id !== user.id)) {
    return NextResponse.json({ error: 'Email già in uso da un altro account' }, { status: 409 })
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, { email })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
