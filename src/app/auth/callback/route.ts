import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'
  const safeTo = next.startsWith('/') ? next : '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`)
  }

  const cookieStore = cookies()
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push({ name, value, options })
          )
        },
      },
    }
  )

  function redirect(url: string) {
    const res = NextResponse.redirect(url)
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    const msg = error?.message ?? ''
    if (msg.includes('already registered') || msg.includes('identity') || msg.includes('linked')) {
      return redirect(`${origin}/auth/login?error=email_taken`)
    }
    return redirect(`${origin}/auth/login?error=oauth`)
  }

  if (searchParams.get('verify') === '1') {
    await supabase.from('profiles').update({ email_verified: true }).eq('id', data.session.user.id)
    return redirect(`${origin}/home?verified=1`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', data.session.user.id)
    .single()

  const destination = profile?.username ? safeTo : '/onboarding'
  return redirect(`${origin}${destination}`)
}
