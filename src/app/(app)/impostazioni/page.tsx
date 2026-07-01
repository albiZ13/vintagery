'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Save, AtSign, User, Loader2, BadgeCheck, AlertCircle,
  Bell, Trash2, Camera, MapPin, Lock, Shield, Smartphone,
  Eye, EyeOff, Download, Mail, Key, ExternalLink, ChevronRight,
  Globe, LayoutDashboard,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, avatarColor } from '@/lib/utils'
import { ITALIAN_REGIONS } from '@/types'

type Tab = 'profilo' | 'account' | 'notifiche' | 'privacy' | 'app' | 'pericolo'

interface NotifPrefs {
  notify_upcoming_events: boolean
  notify_new_markets:     boolean
  notify_newsletter:      boolean
}

const TABS: { id: Tab; label: string; icon: any; danger?: boolean }[] = [
  { id: 'profilo',    label: 'Profilo pubblico',   icon: User       },
  { id: 'account',   label: 'Account e accesso',   icon: Key        },
  { id: 'notifiche', label: 'Notifiche',            icon: Bell       },
  { id: 'privacy',   label: 'Privacy',              icon: Shield     },
  { id: 'app',       label: 'App',                  icon: Smartphone },
  { id: 'pericolo',  label: 'Zona pericolosa',      icon: Trash2, danger: true },
]

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

  const [tab, setTab] = useState<Tab>('profilo')

  const [userId, setUserId]       = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [authProvider, setAuthProvider] = useState('email')
  const [loading, setLoading]     = useState(true)
  const [role, setRole]           = useState('user')

  // Profilo
  const [username, setUsername]   = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [bio, setBio]             = useState('')
  const [region, setRegion]       = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const [originalUsername, setOriginalUsername] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile,  setSavedProfile]  = useState(false)
  const [profileError,  setProfileError]  = useState<string | null>(null)

  // Account / password
  const [pwNew,     setPwNew]     = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPwNew, setShowPwNew] = useState(false)
  const [savingPw,  setSavingPw]  = useState(false)
  const [savedPw,   setSavedPw]   = useState(false)
  const [pwError,   setPwError]   = useState<string | null>(null)

  // Notifiche
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notify_upcoming_events: true,
    notify_new_markets:     false,
    notify_newsletter:      false,
  })
  const [savingNotif, setSavingNotif] = useState(false)
  const [savedNotif,  setSavedNotif]  = useState(false)

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
        setRole(profile.role ?? 'user')
        setNotifPrefs({
          notify_upcoming_events: profile.notify_upcoming_events ?? true,
          notify_new_markets:     profile.notify_new_markets     ?? false,
          notify_newsletter:      profile.notify_newsletter      ?? false,
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
    if (!userId || !file.type.startsWith('image/')) return
    setAvatarUploading(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      setAvatarUrl(url)
    }
    setAvatarUploading(false)
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
      bio: bio || null, region: region || null, avatar_url: avatarUrl || null,
    }).eq('id', userId)
    setSavingProfile(false)
    if (err) { setProfileError('Errore nel salvataggio.'); return }
    setOriginalUsername(username)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 3000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (!pwNew || pwNew.length < 8) { setPwError('La nuova password deve avere almeno 8 caratteri.'); return }
    if (pwNew !== pwConfirm) { setPwError('Le password non coincidono.'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setSavingPw(false)
    if (error) { setPwError(error.message); return }
    setPwNew(''); setPwConfirm('')
    setSavedPw(true)
    setTimeout(() => setSavedPw(false), 3000)
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

              <SectionCard title="Foto profilo" description="JPG, PNG o WebP · max 5 MB.">
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
                    style={{ boxShadow: '0 0 0 2px var(--border)' }}
                    onClick={() => avatarFileRef.current?.click()}
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-lg"
                        style={{ background: color }}>{initials}</div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      {avatarUploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
                    </div>
                  </div>
                  <div>
                    <button type="button" onClick={() => avatarFileRef.current?.click()}
                      disabled={avatarUploading}
                      className="text-[13px] font-semibold text-sienna hover:underline disabled:opacity-50 flex items-center gap-1.5">
                      {avatarUploading ? <><Loader2 size={12} className="animate-spin" /> Caricamento…</> : 'Carica foto'}
                    </button>
                    {avatarUrl && !avatarUploading && (
                      <button type="button" onClick={() => setAvatarUrl('')}
                        className="text-[11px] text-muted hover:text-rust mt-0.5 block">
                        Rimuovi foto
                      </button>
                    )}
                  </div>
                </div>
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
              <SectionCard title="Indirizzo email" description="L'email associata al tuo account Vintagery.">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 bg-cream rounded-lg border border-border text-sm text-espresso">
                    <Mail size={14} className="text-muted flex-shrink-0" />
                    {userEmail}
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-2.5">
                  Per cambiare email scrivi a{' '}
                  <a href="mailto:info@vintagery.it" className="text-sienna hover:underline">info@vintagery.it</a>.
                </p>
              </SectionCard>

              <SectionCard title="Metodo di accesso" description="Come accedi al tuo account.">
                <div className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium',
                  authProvider === 'google'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-cream border-border text-espresso'
                )}>
                  {authProvider === 'google' ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 11h8.533c.044.385.067.779.067 1.184C20.6 17.68 17.04 21 12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9c2.395 0 4.565.94 6.19 2.46L16.2 7.44A6.194 6.194 0 0 0 12 5.8c-3.42 0-6.2 2.78-6.2 6.2 0 3.42 2.78 6.2 6.2 6.2 3.12 0 5.42-2.17 5.9-5.2H12V11z"/>
                      </svg>
                      Accesso con Google
                    </>
                  ) : (
                    <><Key size={13} /> Email e password</>
                  )}
                </div>
              </SectionCard>

              {authProvider !== 'google' && (
                <SectionCard title="Cambia password" description="Scegli una password sicura di almeno 8 caratteri.">
                  <form onSubmit={savePassword} className="space-y-4">
                    <div>
                      <FieldLabel>Nuova password</FieldLabel>
                      <div className="relative">
                        <input
                          type={showPwNew ? 'text' : 'password'}
                          value={pwNew}
                          onChange={e => setPwNew(e.target.value)}
                          className="input pr-10"
                          placeholder="Almeno 8 caratteri"
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowPwNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-coffee">
                          {showPwNew ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {pwNew.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {[4, 6, 8, 12].map(n => (
                            <div key={n} className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              pwNew.length >= n ? 'bg-gold' : 'bg-border'
                            )} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <FieldLabel>Conferma nuova password</FieldLabel>
                      <div className="relative">
                        <input
                          type={showPwNew ? 'text' : 'password'}
                          value={pwConfirm}
                          onChange={e => setPwConfirm(e.target.value)}
                          className="input pr-10"
                          placeholder="Ripeti la password"
                          autoComplete="new-password"
                        />
                        {pwConfirm.length > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            {pwNew === pwConfirm
                              ? <BadgeCheck size={15} className="text-green-600" />
                              : <AlertCircle size={15} className="text-red-500" />
                            }
                          </span>
                        )}
                      </div>
                    </div>
                    {pwError && (
                      <p className="text-red-600 text-sm flex items-center gap-1.5" role="alert">
                        <AlertCircle size={13} />{pwError}
                      </p>
                    )}
                    <div className="flex justify-end pt-1">
                      <SaveBtn saving={savingPw} saved={savedPw} label="Aggiorna password" />
                    </div>
                  </form>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── NOTIFICHE ────────────────────────────────── */}
          {tab === 'notifiche' && (
            <div className="space-y-5">
              <SectionCard title="Notifiche email" description="Scegli quali email vuoi ricevere da Vintagery.">
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
                  label="Newsletter settimanale"
                  description="Un digest dei migliori mercatini e negozi vintage della settimana."
                  checked={notifPrefs.notify_newsletter}
                  onChange={v => setNotifPrefs(p => ({ ...p, notify_newsletter: v }))}
                />
                <p className="text-[11px] text-muted pt-3 border-t border-border mt-1">
                  Le email vengono inviate a <strong>{userEmail}</strong>.
                </p>
              </SectionCard>

              <div className="flex items-center justify-between">
                {Object.values(notifPrefs).some(Boolean) ? (
                  <button
                    type="button"
                    onClick={() => setNotifPrefs({ notify_upcoming_events: false, notify_new_markets: false, notify_newsletter: false })}
                    className="text-[12px] text-muted hover:text-rust transition-colors"
                  >
                    Disattiva tutte le notifiche
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={saveNotifPrefs}
                  disabled={savingNotif}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5"
                >
                  {savingNotif
                    ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : savedNotif
                      ? <><BadgeCheck size={15} /> Salvato</>
                      : <><Save size={15} /> Salva preferenze</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── PRIVACY ──────────────────────────────────── */}
          {tab === 'privacy' && (
            <div className="space-y-5">
              <SectionCard title="Visibilità profilo" description="Il tuo profilo @username è visibile a tutti gli utenti di Vintagery.">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-espresso">Il profilo è pubblico</p>
                    <p className="text-xs text-muted mt-0.5">@{username || 'username'} è trovabile nella directory.</p>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    Pubblico
                  </span>
                </div>
                {originalUsername && (
                  <Link href={`/profilo/${originalUsername}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-sienna hover:underline">
                    <ExternalLink size={12} /> Vedi come appare il tuo profilo
                  </Link>
                )}
              </SectionCard>

              <SectionCard title="Dati raccolti" description="Cosa memorizziamo e come lo usiamo.">
                <ul className="space-y-3">
                  {[
                    { icon: User,   text: 'Nome, username e bio sono pubblici sul tuo profilo.' },
                    { icon: MapPin, text: 'La tua regione personalizza la home, non è mostrata ad altri.' },
                    { icon: Mail,   text: 'La tua email non è mai visibile ad altri utenti.' },
                    { icon: Globe,  text: 'I mercatini salvati sono privati e visibili solo a te.' },
                  ].map(({ icon: Icon, text }, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-coffee">
                      <Icon size={13} className="text-gold mt-0.5 flex-shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-border">
                  <Link href="/privacy" className="text-[12px] text-sienna hover:underline flex items-center gap-1">
                    <ExternalLink size={11} /> Leggi la privacy policy completa
                  </Link>
                </div>
              </SectionCard>

              <SectionCard title="Esporta i tuoi dati" description="Puoi richiedere una copia di tutti i dati legati al tuo account (GDPR Art. 20).">
                <a
                  href={`mailto:info@vintagery.it?subject=Richiesta%20dati%20account&body=Ciao%2C%20vorrei%20una%20copia%20dei%20miei%20dati.%0A%0AAccount%3A%20${encodeURIComponent(userEmail)}`}
                  className="btn-outline flex items-center gap-2 w-fit text-sm px-5 py-2"
                >
                  <Mail size={14} /> Richiedi i tuoi dati
                </a>
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
