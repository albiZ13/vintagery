'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Save, AtSign, User, Loader2, BadgeCheck, AlertCircle,
  Bell, Trash2, Camera, MapPin, Lock, Shield, Smartphone,
  Download, Mail, Key, ExternalLink, ChevronRight,
  Globe, LayoutDashboard, ImagePlus, MessageSquare,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, avatarColor } from '@/lib/utils'
import { ITALIAN_REGIONS } from '@/types'
import { prepareImage } from '@/lib/image-utils'

type Tab = 'profilo' | 'account' | 'notifiche' | 'comunicazioni' | 'privacy' | 'app' | 'pericolo'

interface NotifPrefs {
  notify_upcoming_events: boolean
  notify_new_markets:     boolean
  notify_newsletter:      boolean
  notify_shop_updates:    boolean
}

interface CommsPrefs {
  newsletter_subscribed: boolean
  newsletter_region:     string
  comms_offers:          boolean
  comms_tips:            boolean
}

interface PrivacyPrefs {
  show_saved:          boolean
  allow_shop_dm:       boolean
  show_interests:      boolean
  profile_searchable:  boolean
}

const TABS: { id: Tab; label: string; icon: any; danger?: boolean }[] = [
  { id: 'profilo',        label: 'Profilo pubblico',   icon: User          },
  { id: 'account',        label: 'Account e accesso',  icon: Key           },
  { id: 'notifiche',      label: 'Notifiche',           icon: Bell          },
  { id: 'comunicazioni',  label: 'Comunicazioni',       icon: MessageSquare },
  { id: 'privacy',        label: 'Privacy',             icon: Shield        },
  { id: 'app',            label: 'App',                 icon: Smartphone    },
  { id: 'pericolo',       label: 'Zona pericolosa',     icon: Trash2, danger: true },
]

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1">
        <label htmlFor={id} className="text-sm font-medium text-espresso cursor-pointer">{label}</label>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 mt-0.5',
          checked ? 'bg-gold' : 'bg-border'
        )}
      >
        <span aria-hidden className={cn(
          'block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1',
          checked ? 'translate-x-4' : 'translate-x-0'
        )} />
        <span className="sr-only">{checked ? 'Attivo' : 'Disattivo'}</span>
      </button>
    </div>
  )
}

function SectionCard({ title, description, children, danger }: {
  title: string; description?: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-soft',
      danger ? 'border-red-200' : 'border-border'
    )}>
      <div className={cn('px-6 py-4 border-b', danger ? 'border-red-100' : 'border-border')}>
        <h3 className={cn('font-semibold text-[15px]', danger ? 'text-red-700' : 'text-espresso')}>{title}</h3>
        {description && <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-[11px] font-bold text-coffee uppercase tracking-[0.08em] mb-1.5">
      {children}
      {optional && <span className="ml-1.5 text-muted font-normal normal-case">— opzionale</span>}
    </label>
  )
}

function SaveBtn({ saving, saved, label = 'Salva modifiche' }: {
  saving: boolean; saved: boolean; label?: string
}) {
  return (
    <button type="submit" disabled={saving}
      className="btn-primary flex items-center gap-2 px-6 py-2.5">
      {saving
        ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
        : saved
          ? <><BadgeCheck size={15} /> Salvato</>
          : <><Save size={15} /> {label}</>
      }
    </button>
  )
}

export default function ImpostazioniPage() {
  const supabase = createClient()
  const router   = useRouter()

  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'profilo')

  const [userId, setUserId]       = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [authProvider, setAuthProvider] = useState('email')
  const [identities, setIdentities] = useState<{ provider: string; identity_id: string }[]>([])
  const [linkingGoogle, setLinkingGoogle]   = useState(false)
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [role, setRole]           = useState('user')

  // Profilo
  const [username, setUsername]   = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [bio, setBio]             = useState('')
  const [region, setRegion]       = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [coverUrl, setCoverUrl]   = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading,  setCoverUploading]  = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const coverFileRef  = useRef<HTMLInputElement>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const [originalUsername, setOriginalUsername] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile,  setSavedProfile]  = useState(false)
  const [profileError,  setProfileError]  = useState<string | null>(null)

  // Account / email
  const [newEmail,    setNewEmail]    = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savedEmail,  setSavedEmail]  = useState(false)
  const [emailError,  setEmailError]  = useState<string | null>(null)

  // Account / password
  const [savingPw, setSavingPw] = useState(false)
  const [savedPw,  setSavedPw]  = useState(false)
  const [pwError,  setPwError]  = useState<string | null>(null)

  // Notifiche
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notify_upcoming_events: true,
    notify_new_markets:     false,
    notify_newsletter:      false,
    notify_shop_updates:    false,
  })
  const [savingNotif, setSavingNotif] = useState(false)
  const [savedNotif,  setSavedNotif]  = useState(false)

  // Comunicazioni
  const [commsPrefs, setCommsPrefs] = useState<CommsPrefs>({
    newsletter_subscribed: false,
    newsletter_region:     '',
    comms_offers:          false,
    comms_tips:            true,
  })
  const [savingComms, setSavingComms] = useState(false)
  const [savedComms,  setSavedComms]  = useState(false)

  // Privacy
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefs>({
    show_saved:         false,
    allow_shop_dm:      true,
    show_interests:     true,
    profile_searchable: true,
  })
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [savedPrivacy,  setSavedPrivacy]  = useState(false)

  // Elimina account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      setAuthProvider(user.app_metadata?.provider ?? 'email')
      setIdentities((user.identities ?? []) as { provider: string; identity_id: string }[])

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (profile) {
        setUsername(profile.username ?? '')
        setOriginalUsername(profile.username ?? '')
        setFirstName(profile.first_name ?? '')
        setLastName(profile.last_name ?? '')
        setBio(profile.bio ?? '')
        setRegion(profile.region ?? '')
        setAvatarUrl(profile.avatar_url ?? '')
        setCoverUrl(profile.cover_url ?? '')
        setRole(profile.role ?? 'user')
        setNotifPrefs({
          notify_upcoming_events: profile.notify_upcoming_events ?? true,
          notify_new_markets:     profile.notify_new_markets     ?? false,
          notify_newsletter:      profile.notify_newsletter      ?? false,
          notify_shop_updates:    profile.notify_shop_updates    ?? false,
        })
        setCommsPrefs({
          newsletter_subscribed: profile.newsletter_subscribed ?? false,
          newsletter_region:     profile.newsletter_region     ?? '',
          comms_offers:          profile.comms_offers          ?? false,
          comms_tips:            profile.comms_tips            ?? true,
        })
        setPrivacyPrefs({
          show_saved:         profile.show_saved          ?? false,
          allow_shop_dm:      profile.allow_shop_dm       ?? true,
          show_interests:     profile.show_interests      ?? true,
          profile_searchable: profile.profile_searchable  ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const checkUsername = useCallback(async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    if (clean === originalUsername) { setUsernameStatus('ok'); return }
    if (clean.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    const { data } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle()
    setUsernameStatus(data ? 'taken' : 'ok')
  }, [originalUsername])

  async function handleAvatarUpload(file: File) {
    if (!userId) return
    setAvatarUploading(true)
    setProfileError(null)
    try {
      const ready = await prepareImage(file)
      const ext   = ready.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path  = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, ready, { upsert: true, contentType: ready.type })
      if (upErr) { setProfileError(`Errore upload: ${upErr.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      setAvatarUrl(url)
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Errore upload foto.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleCoverUpload(file: File) {
    if (!userId) return
    setCoverUploading(true)
    setProfileError(null)
    try {
      const ready = await prepareImage(file)
      const ext   = ready.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path  = `${userId}/cover.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, ready, { upsert: true, contentType: ready.type })
      if (upErr) { setProfileError(`Errore upload copertina: ${upErr.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ cover_url: url }).eq('id', userId)
      setCoverUrl(url)
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Errore upload copertina.')
    } finally {
      setCoverUploading(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (usernameStatus === 'taken') { setProfileError('Username già in uso'); return }
    if (!username || username.length < 3) { setProfileError('Username minimo 3 caratteri'); return }
    if (!firstName || !lastName) { setProfileError('Nome e cognome obbligatori'); return }
    setSavingProfile(true); setProfileError(null)
    const { error: err } = await supabase.from('profiles').update({
      username, first_name: firstName, last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      bio: bio || null, region: region || null,
      avatar_url: avatarUrl || null,
      cover_url:  coverUrl  || null,
    }).eq('id', userId)
    setSavingProfile(false)
    if (err) { setProfileError('Errore nel salvataggio.'); return }
    setOriginalUsername(username)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 3000)
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Inserisci un indirizzo email valido.'); return
    }
    setSavingEmail(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setSavingEmail(false)
    if (error) { setEmailError(error.message); return }
    setNewEmail('')
    setSavedEmail(true)
    setTimeout(() => setSavedEmail(false), 6000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setSavingPw(true)
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/impostazioni%3Ftab%3Daccount`,
    })
    setSavingPw(false)
    if (error) { setPwError(error.message); return }
    setSavedPw(true)
    setTimeout(() => setSavedPw(false), 8000)
  }

  async function saveCommsPrefs() {
    if (!userId) return
    setSavingComms(true)
    await supabase.from('profiles').update(commsPrefs).eq('id', userId)
    setSavingComms(false)
    setSavedComms(true)
    setTimeout(() => setSavedComms(false), 3000)
  }

  async function savePrivacyPrefs() {
    if (!userId) return
    setSavingPrivacy(true)
    await supabase.from('profiles').update(privacyPrefs).eq('id', userId)
    setSavingPrivacy(false)
    setSavedPrivacy(true)
    setTimeout(() => setSavedPrivacy(false), 3000)
  }

  async function linkGoogle() {
    setLinkingGoogle(true)
    setLinkError(null)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/impostazioni?tab=account')}`
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } })
    if (error) { setLinkError(error.message); setLinkingGoogle(false) }
  }

  async function unlinkGoogle() {
    const identity = identities.find(i => i.provider === 'google')
    if (!identity) return
    if (identities.length < 2) {
      setLinkError('Non puoi scollegare l\'unico metodo di accesso. Aggiungi prima una password.')
      return
    }
    setUnlinkingGoogle(true)
    setLinkError(null)
    const { error } = await supabase.auth.unlinkIdentity(identity as any)
    setUnlinkingGoogle(false)
    if (error) { setLinkError(error.message); return }
    setIdentities(prev => prev.filter(i => i.provider !== 'google'))
    if (authProvider === 'google') setAuthProvider('email')
  }

  async function saveNotifPrefs() {
    if (!userId) return
    setSavingNotif(true)
    await supabase.from('profiles').update(notifPrefs).eq('id', userId)
    setSavingNotif(false)
    setSavedNotif(true)
    setTimeout(() => setSavedNotif(false), 3000)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'ELIMINA') return
    setDeleting(true); setDeleteError(null)
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Errore sconosciuto')
      }
      await supabase.auth.signOut()
      router.push('/?deleted=1')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Errore durante la cancellazione.')
      setDeleting(false)
    }
  }

  const displayName = firstName || userEmail.split('@')[0] || '?'
  const initials    = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName[0].toUpperCase()
  const color = avatarColor(username || userId || 'x')

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment">

      {/* ── Profile header bar ───────────────────────────── */}
      <div className="bg-espresso">
        <div className="max-w-5xl mx-auto px-4 py-7 flex items-center gap-5">
          <div
            className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
            style={{ boxShadow: '0 0 0 2px rgba(196,160,48,0.45)' }}
            onClick={() => avatarFileRef.current?.click()}
            title="Cambia foto"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-xl"
                style={{ background: color }}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              {avatarUploading ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
            </div>
          </div>
          <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="font-serif text-lg font-bold text-parchment truncate">
                {firstName && lastName ? `${firstName} ${lastName}` : displayName}
              </h1>
              {role === 'admin' && (
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] bg-sienna/20 text-sienna border border-sienna/30 rounded-full px-2 py-0.5">Admin</span>
              )}
              {role === 'shop_owner' && (
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] bg-gold/15 text-gold border border-gold/25 rounded-full px-2 py-0.5">Negozio</span>
              )}
            </div>
            <p className="text-parchment/45 text-[12px]">
              {username ? `@${username} · ` : ''}{userEmail}
            </p>
          </div>

          {originalUsername && (
            <Link href={`/profilo/${originalUsername}`}
              className="hidden md:flex items-center gap-1.5 text-[12px] text-parchment/40 hover:text-parchment/70 transition-colors flex-shrink-0">
              <ExternalLink size={12} /> Vedi profilo
            </Link>
          )}
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">

        {/* Sidebar */}
        <aside className="w-full md:w-52 flex-shrink-0 md:sticky md:top-20">

          {/* Mobile: pills */}
          <div className="md:hidden flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors border',
                    tab === t.id
                      ? t.danger ? 'bg-red-600 text-white border-red-600' : 'bg-espresso text-parchment border-espresso'
                      : 'bg-white text-coffee border-border hover:border-border-strong'
                  )}>
                  <Icon size={12} />{t.label.split(' ')[0]}
                </button>
              )
            })}
          </div>

          {/* Desktop: nav list */}
          <nav className="hidden md:block bg-white border border-border rounded-2xl overflow-hidden shadow-soft">
            {TABS.map((t, i) => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors text-left',
                    i > 0 && 'border-t border-border',
                    active
                      ? t.danger ? 'bg-red-50 text-red-700' : 'bg-cream text-espresso'
                      : t.danger ? 'text-red-500 hover:bg-red-50/60' : 'text-coffee hover:bg-cream hover:text-espresso',
                  )}>
                  <Icon size={14} className={cn(
                    active
                      ? t.danger ? 'text-red-600' : 'text-gold'
                      : t.danger ? 'text-red-400' : 'text-muted'
                  )} />
                  <span className="flex-1">{t.label}</span>
                  {active && <ChevronRight size={12} className={t.danger ? 'text-red-400' : 'text-muted'} />}
                </button>
              )
            })}
          </nav>

          {(role === 'shop_owner' || role === 'admin') && (
            <Link href="/dashboard"
              className="hidden md:flex items-center gap-2 mt-3 px-4 py-2.5 bg-white border border-border rounded-xl text-[12px] text-coffee hover:text-espresso hover:border-border-strong transition-colors shadow-soft">
              <LayoutDashboard size={13} className="text-muted" />
              Dashboard negozio
            </Link>
          )}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* ── PROFILO ──────────────────────────────────── */}
          {tab === 'profilo' && (
            <form onSubmit={saveProfile} className="space-y-5">

              <SectionCard title="Username" description="Identifica il tuo profilo pubblico su Vintagery.">
                <div className="relative">
                  <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input type="text" value={username}
                    onChange={e => checkUsername(e.target.value)}
                    className="input pl-8" placeholder="il_tuo_username" maxLength={20}
                    autoComplete="username" />
                  {usernameStatus === 'checking' && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
                  {usernameStatus === 'ok'       && <BadgeCheck size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" />}
                  {usernameStatus === 'taken'    && <AlertCircle size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
                </div>
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-red-500 mt-1.5">Username già in uso</p>
                )}
              </SectionCard>

              <SectionCard title="Informazioni personali" description="Nome e cognome visibili nel tuo profilo pubblico.">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Nome *</FieldLabel>
                      <input type="text" required value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="input" placeholder="Mario" autoComplete="given-name" />
                    </div>
                    <div>
                      <FieldLabel>Cognome *</FieldLabel>
                      <input type="text" required value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="input" placeholder="Rossi" autoComplete="family-name" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel optional>Bio</FieldLabel>
                    <textarea value={bio} onChange={e => setBio(e.target.value)}
                      className="input resize-none" rows={3}
                      placeholder="Appassionato di vintage anni '70, colleziono vinili e giacche in pelle…"
                      maxLength={160} />
                    <p className="text-[11px] text-muted mt-1 text-right">{bio.length}/160</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="La tua regione" description="Usata per mostrare i mercatini più vicini nella home.">
                <select value={region} onChange={e => setRegion(e.target.value)} className="input">
                  <option value="">Seleziona regione</option>
                  {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </SectionCard>

              <SectionCard title="Foto e copertina" description="JPG, PNG, WebP o HEIC · max 10 MB.">
                {/* Cover */}
                <div
                  className="relative h-28 rounded-xl overflow-hidden cursor-pointer group mb-4 -mx-0"
                  style={!coverUrl ? { background: `linear-gradient(135deg, ${color}55 0%, ${color}22 100%)` } : undefined}
                  onClick={() => coverFileRef.current?.click()}
                >
                  {coverUrl && <Image src={coverUrl} alt="Copertina" fill className="object-cover" />}
                  <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/25 transition-colors flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-espresso/60 text-parchment text-[11px] font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {coverUploading
                        ? <><Loader2 size={12} className="animate-spin" /> Caricamento...</>
                        : <><ImagePlus size={12} />{coverUrl ? 'Cambia copertina' : 'Aggiungi copertina'}</>
                      }
                    </div>
                  </div>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <div
                      className="relative w-14 h-14 rounded-full ring-2 ring-border overflow-hidden cursor-pointer"
                      onClick={() => avatarFileRef.current?.click()}
                    >
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-lg"
                          style={{ background: color }}>{initials}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-espresso text-parchment rounded-full flex items-center justify-center hover:bg-sienna transition-colors disabled:opacity-50"
                    >
                      {avatarUploading ? <Loader2 size={10} className="animate-spin" /> : <Camera size={11} />}
                    </button>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-espresso">Foto profilo</p>
                    <button type="button" onClick={() => avatarFileRef.current?.click()}
                      className="text-[11px] text-sienna hover:underline">
                      {avatarUrl ? 'Cambia foto' : 'Carica foto'}
                    </button>
                    {avatarUrl && (
                      <button type="button" onClick={() => setAvatarUrl('')}
                        className="ml-3 text-[11px] text-muted hover:text-rust">
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                <input ref={coverFileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = '' }} />
              </SectionCard>

              {profileError && (
                <p className="text-red-600 text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle size={14} />{profileError}
                </p>
              )}
              <div className="flex justify-end">
                <SaveBtn saving={savingProfile} saved={savedProfile} />
              </div>
            </form>
          )}

          {/* ── ACCOUNT ──────────────────────────────────── */}
          {tab === 'account' && (
            <div className="space-y-5">
              <SectionCard title="Indirizzo email" description="L'email con cui accedi a Vintagery.">
                <form onSubmit={saveEmail} className="space-y-3">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-cream rounded-lg border border-border text-sm text-espresso">
                    <Mail size={14} className="text-muted flex-shrink-0" />
                    <span className="flex-1">{userEmail}</span>
                  </div>
                  <div>
                    <FieldLabel optional>Nuova email</FieldLabel>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => { setNewEmail(e.target.value); setEmailError(null); setSavedEmail(false) }}
                      className="input"
                      placeholder="nuova@email.it"
                      autoComplete="email"
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-600 text-xs flex items-center gap-1.5" role="alert">
                      <AlertCircle size={12} />{emailError}
                    </p>
                  )}
                  {savedEmail && (
                    <div className="flex items-start gap-2 text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                      <BadgeCheck size={14} className="mt-0.5 flex-shrink-0" />
                      <span>Abbiamo inviato un link di conferma a <strong>{newEmail || userEmail}</strong>. Clicca il link per completare il cambio.</span>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="submit" disabled={savingEmail || !newEmail}
                      className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-40">
                      {savingEmail
                        ? <><Loader2 size={14} className="animate-spin" /> Invio...</>
                        : <><Mail size={14} /> Invia link di conferma</>}
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="Account collegati" description="Puoi usare Google per accedere più velocemente.">
                {linkError && (
                  <p className="text-red-600 text-xs flex items-center gap-1.5 mb-3" role="alert">
                    <AlertCircle size={12} />{linkError}
                  </p>
                )}
                {(() => {
                  const googleLinked = identities.some(i => i.provider === 'google')
                  return (
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center flex-shrink-0">
                          <GoogleIcon />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-espresso">Google</p>
                          <p className="text-[11px] text-muted">
                            {googleLinked ? 'Account collegato' : 'Non collegato'}
                          </p>
                        </div>
                      </div>
                      {googleLinked ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                            Attivo
                          </span>
                          {identities.length > 1 && (
                            <button
                              type="button"
                              onClick={unlinkGoogle}
                              disabled={unlinkingGoogle}
                              className="text-[11px] text-muted hover:text-rust transition-colors disabled:opacity-50"
                            >
                              {unlinkingGoogle ? <Loader2 size={11} className="animate-spin inline" /> : 'Scollega'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={linkGoogle}
                          disabled={linkingGoogle}
                          className="flex items-center gap-1.5 text-[12px] font-semibold text-espresso border border-border bg-white hover:border-espresso/30 hover:bg-cream px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {linkingGoogle ? <Loader2 size={12} className="animate-spin" /> : null}
                          Collega
                        </button>
                      )}
                    </div>
                  )
                })()}
              </SectionCard>

              {authProvider !== 'google' && (
                <SectionCard title="Password" description="Ti mandiamo un link via email per impostare una nuova password in sicurezza.">
                  <form onSubmit={savePassword} className="space-y-3">
                    {savedPw ? (
                      <div className="flex items-start gap-2 text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <BadgeCheck size={14} className="mt-0.5 flex-shrink-0" />
                        <span>Email inviata a <strong>{userEmail}</strong>. Clicca il link per scegliere una nuova password.</span>
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted">
                        Riceverai un'email su <strong className="text-espresso">{userEmail}</strong> con il link per reimpostare la password.
                      </p>
                    )}
                    {pwError && (
                      <p className="text-red-600 text-xs flex items-center gap-1.5" role="alert">
                        <AlertCircle size={12} />{pwError}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button type="submit" disabled={savingPw || savedPw}
                        className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-40">
                        {savingPw
                          ? <><Loader2 size={14} className="animate-spin" /> Invio...</>
                          : savedPw
                            ? <><BadgeCheck size={14} /> Email inviata</>
                            : <><Mail size={14} /> Invia email di reset</>}
                      </button>
                    </div>
                  </form>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── NOTIFICHE ────────────────────────────────── */}
          {tab === 'notifiche' && (
            <div className="space-y-5">
              <SectionCard title="Avvisi email" description="Notifiche operative legate alla tua attività su Vintagery.">
                <ToggleRow
                  label="Promemoria eventi salvati"
                  description="Ricevi un'email 3 giorni prima di un mercatino che hai salvato."
                  checked={notifPrefs.notify_upcoming_events}
                  onChange={v => setNotifPrefs(p => ({ ...p, notify_upcoming_events: v }))}
                />
                <ToggleRow
                  label="Nuovi mercatini nella tua zona"
                  description="Avviso quando viene aggiunto un mercatino nella tua regione."
                  checked={notifPrefs.notify_new_markets}
                  onChange={v => setNotifPrefs(p => ({ ...p, notify_new_markets: v }))}
                />
                <ToggleRow
                  label="Aggiornamenti negozi seguiti"
                  description="Nuovi post e offerte dai negozi che segui."
                  checked={notifPrefs.notify_shop_updates}
                  onChange={v => setNotifPrefs(p => ({ ...p, notify_shop_updates: v }))}
                />
                <p className="text-[11px] text-muted pt-3 border-t border-border mt-1">
                  Inviate a <strong>{userEmail}</strong>.
                </p>
              </SectionCard>

              <div className="flex items-center justify-between">
                {Object.values(notifPrefs).some(Boolean) ? (
                  <button type="button"
                    onClick={() => setNotifPrefs({ notify_upcoming_events: false, notify_new_markets: false, notify_newsletter: false, notify_shop_updates: false })}
                    className="text-[12px] text-muted hover:text-rust transition-colors">
                    Disattiva tutte
                  </button>
                ) : <span />}
                <button type="button" onClick={saveNotifPrefs} disabled={savingNotif}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5">
                  {savingNotif ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : savedNotif ? <><BadgeCheck size={15} /> Salvato</>
                    : <><Save size={15} /> Salva</>}
                </button>
              </div>
            </div>
          )}

          {/* ── COMUNICAZIONI ────────────────────────────── */}
          {tab === 'comunicazioni' && (
            <div className="space-y-5">
              <SectionCard title="Newsletter" description="Aggiornamenti periodici sui mercatini italiani selezionati dalla redazione Vintagery.">
                <ToggleRow
                  label="Iscrivimi alla newsletter"
                  description="Digest settimanale con i migliori mercatini, eventi in arrivo e novità."
                  checked={commsPrefs.newsletter_subscribed}
                  onChange={v => setCommsPrefs(p => ({ ...p, newsletter_subscribed: v }))}
                />
                {commsPrefs.newsletter_subscribed && (
                  <div className="pt-3 mt-1 border-t border-border">
                    <label className="block text-[11px] font-bold text-coffee uppercase tracking-[0.08em] mb-1.5">
                      Regione preferita per la newsletter
                    </label>
                    <select
                      value={commsPrefs.newsletter_region}
                      onChange={e => setCommsPrefs(p => ({ ...p, newsletter_region: e.target.value }))}
                      className="input"
                    >
                      <option value="">Tutta Italia</option>
                      {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <p className="text-[11px] text-muted mt-1">
                      Lascia vuoto per ricevere mercatini da tutta Italia.
                    </p>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Comunicazioni promozionali" description="Messaggi opzionali da Vintagery su offerte e contenuti.">
                <ToggleRow
                  label="Offerte e promozioni"
                  description="Sconti speciali, eventi partner e opportunità selezionate."
                  checked={commsPrefs.comms_offers}
                  onChange={v => setCommsPrefs(p => ({ ...p, comms_offers: v }))}
                />
                <ToggleRow
                  label="Consigli e guide"
                  description="Articoli, guide ai mercatini e contenuti editoriali."
                  checked={commsPrefs.comms_tips}
                  onChange={v => setCommsPrefs(p => ({ ...p, comms_tips: v }))}
                />
              </SectionCard>

              <div className="flex justify-end">
                <button type="button" onClick={saveCommsPrefs} disabled={savingComms}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5">
                  {savingComms ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : savedComms ? <><BadgeCheck size={15} /> Salvato</>
                    : <><Save size={15} /> Salva preferenze</>}
                </button>
              </div>

              <p className="text-[11px] text-muted text-center">
                Puoi disiscriverti in qualsiasi momento.{' '}
                <Link href="/privacy" className="text-sienna hover:underline">Privacy policy</Link>.
              </p>
            </div>
          )}

          {/* ── PRIVACY ──────────────────────────────────── */}
          {tab === 'privacy' && (
            <div className="space-y-5">
              <SectionCard title="Visibilità profilo" description="Controlla chi può trovare e vedere il tuo profilo.">
                <ToggleRow
                  label="Profilo cercabile"
                  description="Il tuo @username appare nei risultati di ricerca e nella directory utenti."
                  checked={privacyPrefs.profile_searchable}
                  onChange={v => setPrivacyPrefs(p => ({ ...p, profile_searchable: v }))}
                />
                <ToggleRow
                  label="Mostra interessi nel profilo"
                  description="Le categorie che hai selezionato (vinili, antiquariato…) sono visibili sul tuo profilo."
                  checked={privacyPrefs.show_interests}
                  onChange={v => setPrivacyPrefs(p => ({ ...p, show_interests: v }))}
                />
                <ToggleRow
                  label="Mostra mercatini salvati"
                  description="Gli altri utenti possono vedere quali mercatini hai aggiunto ai preferiti."
                  checked={privacyPrefs.show_saved}
                  onChange={v => setPrivacyPrefs(p => ({ ...p, show_saved: v }))}
                />
                {originalUsername && (
                  <div className="pt-3 mt-1 border-t border-border">
                    <Link href={`/profilo/${originalUsername}`}
                      className="inline-flex items-center gap-1.5 text-[12px] text-sienna hover:underline">
                      <ExternalLink size={12} /> Vedi come appare il tuo profilo
                    </Link>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Messaggi e contatti" description="Gestisci chi può contattarti su Vintagery.">
                <ToggleRow
                  label="Permetti messaggi dai negozi"
                  description="I negozi verificati possono inviarti messaggi diretti (DM) tramite Vintagery."
                  checked={privacyPrefs.allow_shop_dm}
                  onChange={v => setPrivacyPrefs(p => ({ ...p, allow_shop_dm: v }))}
                />
              </SectionCard>

              <div className="flex justify-end">
                <button type="button" onClick={savePrivacyPrefs} disabled={savingPrivacy}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5">
                  {savingPrivacy ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : savedPrivacy ? <><BadgeCheck size={15} /> Salvato</>
                    : <><Save size={15} /> Salva preferenze</>}
                </button>
              </div>

              <SectionCard title="I tuoi dati" description="Cosa raccogliamo e come lo usiamo.">
                <ul className="space-y-3">
                  {[
                    { icon: User,   text: 'Nome, username e bio sono pubblici sul tuo profilo.' },
                    { icon: MapPin, text: 'La tua regione personalizza la home, non è mostrata ad altri.' },
                    { icon: Mail,   text: 'La tua email non è mai visibile ad altri utenti.' },
                    { icon: Globe,  text: 'I mercatini salvati sono privati a meno che tu non li renda visibili.' },
                  ].map(({ icon: Icon, text }, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-coffee">
                      <Icon size={13} className="text-gold mt-0.5 flex-shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <Link href="/privacy" className="text-[12px] text-sienna hover:underline flex items-center gap-1">
                    <ExternalLink size={11} /> Privacy policy completa
                  </Link>
                  <a
                    href={`mailto:info@vintagery.it?subject=Richiesta%20dati%20account&body=Account%3A%20${encodeURIComponent(userEmail)}`}
                    className="text-[12px] text-muted hover:text-espresso flex items-center gap-1"
                  >
                    <Mail size={11} /> Esporta dati (GDPR)
                  </a>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── APP ──────────────────────────────────────── */}
          {tab === 'app' && (
            <div className="space-y-5">
              <SectionCard title="Installa Vintagery" description="Aggiungi l'app alla schermata home per un'esperienza nativa, senza app store.">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-espresso flex items-center justify-center flex-shrink-0 shadow-md">
                    <MapPin size={22} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-[13px] text-espresso font-medium mb-1">Web app progressiva (PWA)</p>
                    <p className="text-xs text-muted leading-relaxed mb-3">
                      Funziona offline, si aggiorna automaticamente,
                      notifiche push. Nessuno store richiesto.
                    </p>
                    <Link href="/installa"
                      className="inline-flex items-center gap-2 bg-espresso hover:bg-coffee text-parchment text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors">
                      <Download size={14} /> Installa l&apos;app
                    </Link>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Informazioni" description="Dettagli tecnici sull'applicazione.">
                <dl className="space-y-2.5 text-[13px]">
                  {[
                    ['Versione', '1.0.0'],
                    ['Piattaforma', 'Next.js 14'],
                    ['Backend', 'Supabase'],
                    ['Deploy', 'Vercel'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium text-espresso">{v}</dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>

              <SectionCard title="Segnala un problema" description="Qualcosa non funziona? Scrivici, rispondiamo entro 48 ore.">
                <a
                  href={`mailto:info@vintagery.it?subject=Bug%20report%20Vintagery&body=Ciao%2C%20ho%20trovato%20un%20problema.%0A%0AAccount%3A%20${encodeURIComponent(userEmail)}%0A%0ADescrizione%3A%20`}
                  className="btn-outline flex items-center gap-2 w-fit text-sm px-5 py-2"
                >
                  <Mail size={14} /> Invia segnalazione
                </a>
              </SectionCard>
            </div>
          )}

          {/* ── ZONA PERICOLOSA ──────────────────────────── */}
          {tab === 'pericolo' && (
            <div className="space-y-5">
              <SectionCard title="Disconnetti da tutti i dispositivi" description="Termina tutte le sessioni attive." danger>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut({ scope: 'global' })
                    router.push('/auth/login')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <Lock size={14} /> Disconnetti ovunque
                </button>
              </SectionCard>

              <SectionCard title="Elimina account" description="Irreversibile. Tutti i tuoi dati vengono cancellati immediatamente." danger>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-[12px] text-red-700 leading-relaxed">
                      <strong>Attenzione:</strong> questa operazione è permanente.
                      Account, mercatini salvati e tutte le attività verranno eliminati e non potranno essere recuperati.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="delete-confirm"
                      className="block text-[11px] font-bold text-coffee uppercase tracking-[0.08em] mb-1.5">
                      Scrivi <span className="font-mono text-red-600">ELIMINA</span> per confermare
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      className="input border-red-200 focus:border-red-400 focus:ring-red-200 max-w-xs"
                      placeholder="ELIMINA"
                      autoComplete="off"
                    />
                  </div>
                  {deleteError && <p className="text-red-600 text-sm" role="alert">{deleteError}</p>}
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== 'ELIMINA' || deleting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting
                      ? <><Loader2 size={14} className="animate-spin" /> Eliminazione...</>
                      : <><Trash2 size={14} /> Elimina definitivamente il mio account</>
                    }
                  </button>
                </div>
              </SectionCard>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
