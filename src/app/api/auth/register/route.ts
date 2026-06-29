import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, username, region, role } = await request.json()

    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimo 8 caratteri' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username già in uso' }, { status: 409 })
    }

    const { data, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (createErr || !data.user) {
      const msg = createErr?.message ?? ''
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return NextResponse.json({ error: 'Email già registrata. Prova ad accedere.' }, { status: 409 })
      }
      return NextResponse.json({ error: msg || 'Errore di registrazione' }, { status: 400 })
    }

    await admin.from('profiles').update({
      username:        username.toLowerCase(),
      first_name:      firstName,
      last_name:       lastName,
      full_name:       `${firstName} ${lastName}`,
      role:            role === 'shop' ? 'shop_owner' : 'user',
      region:          region || null,
      onboarding_done: true,
      email_verified:  false,
    }).eq('id', data.user.id)

    if (role === 'shop') {
      await admin.from('shops').insert({
        owner_id: data.user.id,
        name:     `Negozio di ${firstName}`,
        address:  '',
        city:     '',
        region:   region || '',
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
