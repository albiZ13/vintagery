import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/confirm',
  '/auth/reset-password',
  '/about',
  '/termini',
  '/privacy',
]

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path     = req.nextUrl.pathname
  const isPublic = PUBLIC.some(p => path === p || path.startsWith(p + '/'))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (user && (path === '/' || path === '/auth/login' || path === '/auth/register')) {
    return NextResponse.redirect(new URL('/mercatini', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|json)).*)'],
}
