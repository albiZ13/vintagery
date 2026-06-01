'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Save, AtSign, User, Loader2, BadgeCheck, AlertCircle,
  ExternalLink, Bell, Trash2, Camera,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, avatarColor } from '@/lib/utils'

interface NotifPrefs {
  notify_upcoming_events: boolean
  notify_new_markets:     boolean
  notify_newsletter:      boolean
}

interface ToggleRowProps {
  label:       string
  description: string
  checked:     boolean
  onChange:    (v: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="flex-1">
        <label htmlFor={id} className="text-sm font-medium text-espresso cursor-pointer">{label}</label>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sienna focus:ring-offset-2 mt-0.5',
          checked ? 'bg-sienna' : 'bg-border'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
        <span className="sr-only">{checked ? 'Attivo' : 'Disattivo'}</span>
      </button>
    </div>
  )
}

export default function ImpostazioniPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [userId, setUserId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [username, setUsername]   = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [bio, setBio]             = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)

  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const [originalUsername, setOriginalUsername] = useState('')

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notify_upcoming_events: true,
    notify_new_markets:     false,
    notify_newsletter:      false,
  })
  const [savingNotif, setSavingNotif] = useState(false)
  const [savedNotif,  setSavedNotif]  = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) {
        setUsername(profile.username ?? '')
        setOriginalUsername(profile.username ?? '')
        setFirstName(profile.first_name ?? '')
        setLastName(profile.last_name ?? '')
        setBio(profile.bio ?? '')
        setAvatarUrl(profile.avatar_url ?? '')
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
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      setAvatarUrl(url)
    }
    setAvatarUploading(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (usernameStatus === 'taken') { setError('Username già in uso'); return }
    if (!username || username.length < 3) { setError('Username minimo 3 caratteri'); return }
    if (!firstName || !lastName) { setError('Nome e cognome obbligatori'); return }

    setSaving(true); setError(null)
    const { error: err } = await supabase.from('profiles').update({
      username,
      first_name: firstName,
      last_name:  lastName,
      full_name:  `${firstName} ${lastName}`,
      bio:        bio || null,
      avatar_url: avatarUrl || null,
    }).eq('id', userId)

    setSaving(false)
    if (err) { setError('Errore nel salvataggio. Riprova.'); return }
    setOriginalUsername(username)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function saveNotifPrefs() {
    if (!userId) return
    setSavingNotif(true)
    await supabase.from('profiles').update(notifPrefs).eq('id', userId)
    setSavingNotif(false)
    setSavedNotif(true)
    setTimeout(() => setSavedNotif(false), 3000)
  }

  function updateNotif(key: keyof NotifPrefs, value: boolean) {
    setNotifPrefs(p => ({ ...p, [key]: value }))
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'ELIMINA') return
    setDeleting(true)
    setDeleteError(null)
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

  if (loading) return <div className="max-w-xl mx-auto px-4 py-16 text-center text-muted">Caricamento...</div>

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-8">

      {/* ── Intestazione ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-espresso">Impostazioni</h1>
          <p className="text-muted text-sm mt-0.5">Profilo e preferenze di notifica</p>
        </div>
        {originalUsername && (
          <Link href={`/profilo/${originalUsername}`} className="flex items-center gap-1.5 text-sm text-sienna hover:underline">
            <ExternalLink size={14} /> Vedi profilo
          </Link>
        )}
      </div>

      {/* ── Profilo ──────────────────────────────────────── */}
      <section aria-labelledby="section-profile">
        <h2 id="section-profile" className="font-semibold text-base text-espresso mb-3 flex items-center gap-2">
          <User size={16} className="text-sienna" /> Profilo pubblico
        </h2>
        <form onSubmit={save} className="bg-white border border-border rounded-xl p-6 shadow-soft space-y-5">

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-caption font-semibold text-coffee mb-1.5">Username *</label>
            <div className="relative">
              <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="username"
                type="text" value={username}
                onChange={e => checkUsername(e.target.value)}
                className="input pl-8" placeholder="il_tuo_username" maxLength={20}
                autoComplete="username"
              />
              {usernameStatus === 'checking' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" aria-hidden />}
              {usernameStatus === 'ok'      && <BadgeCheck size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" aria-hidden />}
              {usernameStatus === 'taken'   && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" aria-hidden />}
            </div>
            <p className="text-[11px] text-muted mt-1" aria-live="polite">
              {usernameStatus === 'taken'
                ? <span className="text-red-500">Username già in uso</span>
                : 'Visibile nel tuo profilo pubblico come @username'}
            </p>
          </div>

          {/* Nome + Cognome */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first-name" className="block text-caption font-semibold text-coffee mb-1.5">Nome *</label>
              <input id="first-name" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="input" placeholder="Mario" autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-caption font-semibold text-coffee mb-1.5">Cognome *</label>
              <input id="last-name" type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="input" placeholder="Rossi" autoComplete="family-name" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-caption font-semibold text-coffee mb-1.5">Bio</label>
            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} className="input resize-none" rows={3}
              placeholder="Appassionato di vintage anni '70, colleziono vinili e giacche in pelle..." maxLength={160} />
            <p className="text-[11px] text-muted mt-1 text-right" aria-live="polite">{bio.length}/160</p>
          </div>

          {/* Avatar upload */}
          <div>
            <p className="block text-caption font-semibold text-coffee mb-2.5">
              Foto profilo <span className="text-muted font-normal">(opzionale)</span>
            </p>
            <div className="flex items-center gap-4">
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 cursor-pointer group"
                style={{ boxShadow: '0 0 0 2px var(--border)' }}
                onClick={() => avatarFileRef.current?.click()}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill className="object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-xl"
                    style={{ background: avatarColor(username || userId || 'x') }}
                  >
                    {firstName ? firstName[0].toUpperCase() : '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  {avatarUploading
                    ? <Loader2 size={16} className="text-white animate-spin" />
                    : <Camera size={16} className="text-white" />
                  }
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-[13px] font-semibold text-sienna hover:underline disabled:opacity-50 flex items-center gap-1.5"
                >
                  {avatarUploading ? <><Loader2 size={13} className="animate-spin" /> Caricamento...</> : 'Carica foto'}
                </button>
                <p className="text-[11px] text-muted mt-0.5">JPG, PNG o WebP · max 5 MB</p>
              </div>
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }}
            />
          </div>

          {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

          <button type="submit" disabled={saving || usernameStatus === 'taken'} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving
              ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Salvataggio...</>
              : saved
                ? <><BadgeCheck size={16} aria-hidden /> Salvato!</>
                : <><Save size={16} aria-hidden /> Salva modifiche</>
            }
          </button>
        </form>
      </section>

      {/* ── Notifiche email ──────────────────────────────── */}
      <section aria-labelledby="section-notif">
        <h2 id="section-notif" className="font-semibold text-base text-espresso mb-3 flex items-center gap-2">
          <Bell size={16} className="text-sienna" /> Notifiche email
        </h2>
        <div className="bg-white border border-border rounded-xl p-6 shadow-soft">
          <div role="group" aria-labelledby="section-notif">
            <ToggleRow
              label="Promemoria eventi salvati"
              description="Ricevi un'email 3 giorni prima di un mercatino che hai salvato."
              checked={notifPrefs.notify_upcoming_events}
              onChange={v => updateNotif('notify_upcoming_events', v)}
            />
            <ToggleRow
              label="Nuovi mercatini nella tua zona"
              description="Avviso quando viene aggiunto un mercatino nella tua regione."
              checked={notifPrefs.notify_new_markets}
              onChange={v => updateNotif('notify_new_markets', v)}
            />
            <ToggleRow
              label="Newsletter settimanale"
              description="Un digest dei migliori mercatini e negozi vintage della settimana."
              checked={notifPrefs.notify_newsletter}
              onChange={v => updateNotif('notify_newsletter', v)}
            />
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted">
              Le email vengono inviate all'indirizzo associato al tuo account.
            </p>
            <button
              onClick={saveNotifPrefs}
              disabled={savingNotif}
              className="btn-primary text-sm px-5 py-2 flex items-center gap-2 flex-shrink-0"
            >
              {savingNotif
                ? <><Loader2 size={14} className="animate-spin" aria-hidden /> Salvataggio...</>
                : savedNotif
                  ? <><BadgeCheck size={14} aria-hidden /> Salvato!</>
                  : <><Save size={14} aria-hidden /> Salva preferenze</>
              }
            </button>
          </div>
        </div>

        {/* Disiscriviti */}
        <p className="text-[11px] text-muted mt-3 text-center">
          Puoi disattivare tutte le notifiche in qualsiasi momento.{' '}
          {Object.values(notifPrefs).some(Boolean) && (
            <button
              onClick={() => {
                setNotifPrefs({ notify_upcoming_events: false, notify_new_markets: false, notify_newsletter: false })
              }}
              className="text-sienna hover:underline"
            >
              Disattiva tutte
            </button>
          )}
        </p>
      </section>

      {/* Link dashboard negozio */}
      <div className="text-center">
        <Link href="/dashboard" className="text-sm text-muted hover:text-sienna transition-colors">
          Gestisci il profilo negozio →
        </Link>
      </div>

      {/* ── Zona pericolosa ──────────────────────────────── */}
      <section aria-labelledby="section-danger">
        <h2 id="section-danger" className="font-semibold text-base text-espresso mb-3 flex items-center gap-2">
          <Trash2 size={16} className="text-rust" /> Zona pericolosa
        </h2>
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-soft space-y-4">
          <div>
            <p className="text-sm font-medium text-espresso mb-1">Elimina il tuo account</p>
            <p className="text-xs text-muted leading-relaxed">
              L'eliminazione è permanente e irreversibile. Tutti i tuoi dati, recensioni e contenuti
              verranno cancellati immediatamente. Non è possibile recuperarli.
            </p>
          </div>

          <div>
            <label htmlFor="delete-confirm" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Scrivi <span className="font-mono text-rust">ELIMINA</span> per confermare
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="input border-red-200 focus:border-red-400 focus:ring-red-200"
              placeholder="ELIMINA"
              autoComplete="off"
            />
          </div>

          {deleteError && (
            <p className="text-red-600 text-sm" role="alert">{deleteError}</p>
          )}

          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== 'ELIMINA' || deleting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting
              ? <><Loader2 size={15} className="animate-spin" /> Eliminazione in corso...</>
              : <><Trash2 size={15} /> Elimina definitivamente il mio account</>
            }
          </button>
        </div>
      </section>

    </div>
  )
}
