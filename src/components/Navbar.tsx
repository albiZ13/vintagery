'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, MapPin, Calendar, Store, LayoutDashboard, LogOut, Settings, ChevronDown, User, Download, ShieldCheck } from 'lucide-react'
import { cn, avatarColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const NAV = [
  { href: '/mercatini', label: 'Mercatini ed eventi', icon: Calendar },
  { href: '/negozi',    label: 'Negozi',               icon: Store   },
]


export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen]       = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [user, setUser]       = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<{ username?: string; first_name?: string; last_name?: string; role?: string } | null>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('username, first_name, last_name, role').eq('id', user.id).single()
        setProfile(data)
      }
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
      if (session?.user) {
        supabase.from('profiles').select('username, first_name, last_name, role').eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data))
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Chiudi dropdown su click esterno o ESC
  useEffect(() => {
    function onMouse(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setDropOpen(false); setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey) }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const displayName = profile?.first_name ?? user?.email?.split('@')[0] ?? '?'
  const initials    = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : displayName[0].toUpperCase()
  const color = avatarColor(profile?.username ?? user?.id ?? 'x')

  return (
    <nav className="sticky top-0 z-50 bg-parchment/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2 font-serif font-bold text-espresso text-xl tracking-tight">
          <MapPin size={18} className="text-sienna" /> Vintagery
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn('text-body-sm font-medium transition-colors flex items-center gap-1',
                (pathname === href || pathname.startsWith(href + '/'))
                  ? 'text-sienna' : 'text-coffee hover:text-sienna')}>
              {Icon && <Icon size={14} />}{label}
            </Link>
          ))}
          {user && profile?.username && (
            <Link
              href={`/profilo/${profile.username}`}
              className={cn('text-body-sm font-medium transition-colors flex items-center gap-1',
                pathname.startsWith('/profilo') ? 'text-sienna' : 'text-coffee hover:text-sienna')}
            >
              <User size={14} /> Il mio profilo
            </Link>
          )}
        </div>

        {/* Ricerca globale */}
        <GlobalSearch />

        {/* Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropRef}>
              <button
                ref={triggerRef}
                onClick={() => setDropOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={dropOpen}
                aria-label={`Menu utente — ${displayName}`}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-border hover:border-border-strong transition-colors"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: color }}>
                  {initials}
                </div>
                <span className="text-sm font-medium text-espresso">{displayName}</span>
                <ChevronDown size={13} className={cn('text-muted transition-transform', dropOpen && 'rotate-180')} />
              </button>

              {dropOpen && (
                <div role="menu" aria-label="Menu utente" className="absolute right-0 top-full mt-2 w-52 bg-white border border-border rounded-xl shadow-card-hover py-1.5 z-50">
                  <Link href="/impostazioni"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-coffee hover:bg-cream hover:text-espresso transition-colors"
                    onClick={() => setDropOpen(false)}>
                    <Settings size={14} /> Impostazioni
                  </Link>
                  <Link href="/dashboard"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-coffee hover:bg-cream hover:text-espresso transition-colors"
                    onClick={() => setDropOpen(false)}>
                    <LayoutDashboard size={14} /> Dashboard negozio
                  </Link>
                  <Link href="/installa"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-coffee hover:bg-cream hover:text-espresso transition-colors"
                    onClick={() => setDropOpen(false)}>
                    <Download size={14} /> Installa l&apos;app
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-coffee hover:bg-cream hover:text-espresso transition-colors"
                      onClick={() => setDropOpen(false)}>
                      <ShieldCheck size={14} /> Admin
                    </Link>
                  )}
                  <hr className="border-border my-1" />
                  <button onClick={() => { setDropOpen(false); handleSignOut() }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rust hover:bg-red-50 transition-colors w-full text-left">
                    <LogOut size={14} /> Esci
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login"  className="text-body-sm font-medium text-coffee hover:text-sienna transition-colors">Accedi</Link>
              <Link href="/auth/register" className="btn-primary text-sm px-4 py-2">Iscriviti</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2 text-coffee" onClick={() => setOpen(o => !o)} aria-label={open ? 'Chiudi menu' : 'Apri menu'} aria-expanded={open} aria-controls="mobile-menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-border bg-parchment px-4 py-4 flex flex-col gap-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="text-body-sm font-medium text-coffee flex items-center gap-2"
              onClick={() => setOpen(false)}>
              {Icon && <Icon size={14} />}{label}
            </Link>
          ))}
          {user && profile?.username && (
            <Link href={`/profilo/${profile.username}`}
              className="text-body-sm font-medium text-coffee flex items-center gap-2"
              onClick={() => setOpen(false)}>
              <User size={14} /> Il mio profilo
            </Link>
          )}
          <hr className="border-border" />
          {user ? (
            <>
              <Link href="/impostazioni" className="text-body-sm text-coffee flex items-center gap-2" onClick={() => setOpen(false)}>
                <Settings size={14} /> Impostazioni
              </Link>
              <Link href="/dashboard" className="text-body-sm text-coffee flex items-center gap-2" onClick={() => setOpen(false)}>
                <LayoutDashboard size={14} /> Dashboard negozio
              </Link>
              <Link href="/installa" className="text-body-sm text-coffee flex items-center gap-2" onClick={() => setOpen(false)}>
                <Download size={14} /> Installa l&apos;app
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin" className="text-body-sm text-coffee flex items-center gap-2" onClick={() => setOpen(false)}>
                  <ShieldCheck size={14} /> Admin
                </Link>
              )}
              <button onClick={() => { setOpen(false); handleSignOut() }}
                className="text-body-sm text-rust text-left flex items-center gap-2">
                <LogOut size={14} /> Esci
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login"    className="text-body-sm text-coffee" onClick={() => setOpen(false)}>Accedi</Link>
              <Link href="/auth/register" className="btn-primary text-sm text-center" onClick={() => setOpen(false)}>Iscriviti</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
