'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Camera, ImagePlus, Loader2, BadgeCheck, AlertCircle, AtSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn, avatarColor } from '@/lib/utils'
import { prepareImage } from '@/lib/image-utils'

function getInitials(first?: string | null, last?: string | null, username?: string | null) {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0].toUpperCase()
  if (username) return username[0].toUpperCase()
  return '?'
}

export default function ModificaProfiloPage() {
  const router   = useRouter()
  const sbRef    = useRef(createClient())
  const supabase = sbRef.current
  const fileRef      = useRef<HTMLInputElement>(null)
  const coverRef     = useRef<HTMLInputElement>(null)

  const [userId,        setUserId]        = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null)
  const [coverUrl,      setCoverUrl]      = useState<string | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [coverUploading,setCoverUploading]= useState(false)
  const [color,         setColor]         = useState('#1c2e4a')

  const [username,      setUsername]      = useState('')
  const [firstName,     setFirstName]     = useState('')
  const [lastName,      setLastName]      = useState('')
  const [bio,           setBio]           = useState('')
  const [originalUsername] = useState<{ v: string }>({ v: '' })

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: p } = await supabase
        .from('profiles')
        .select('username,first_name,last_name,bio,avatar_url,cover_url')
        .eq('id', user.id)
        .single()

      if (p) {
        setUsername(p.username ?? '')
        setFirstName(p.first_name ?? '')
        setLastName(p.last_name ?? '')
        setBio(p.bio ?? '')
        setAvatarUrl(p.avatar_url ?? null)
        setCoverUrl(p.cover_url ?? null)
        originalUsername.v = p.username ?? ''
        setColor(avatarColor(p.username ?? user.id))
        setUsernameStatus('ok')
      }
      setLoading(false)
    }
    load()
  }, [])

  const checkUsername = useCallback(async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    if (clean === originalUsername.v) { setUsernameStatus('ok'); return }
    if (clean.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    const { data } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle()
    setUsernameStatus(data ? 'taken' : 'ok')
  }, [supabase])

  async function handleAvatarUpload(file: File) {
    if (!userId) return
    setUploading(true); setError(null)
    try {
      const ready = await prepareImage(file)
      const ext   = ready.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path  = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, ready, { upsert: true, contentType: ready.type })
      if (upErr) { setError(`Errore upload foto: ${upErr.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (dbErr) setError(`Errore salvataggio: ${dbErr.message}`)
      else setAvatarUrl(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCoverUpload(file: File) {
    if (!userId) return
    setCoverUploading(true); setError(null)
    try {
      const ready = await prepareImage(file)
      const ext   = ready.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path  = `${userId}/cover.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, ready, { upsert: true, contentType: ready.type })
      if (upErr) { setError(`Errore upload copertina: ${upErr.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('profiles').update({ cover_url: url }).eq('id', userId)
      if (dbErr) setError(`Errore salvataggio: ${dbErr.message}`)
      else setCoverUrl(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto.')
    } finally {
      setCoverUploading(false)
    }
  }

  async function saveProfile() {
    if (usernameStatus === 'taken') { setError('Username già in uso'); return }
    if (!username || username.length < 3) { setError('Username minimo 3 caratteri'); return }
    if (!firstName || !lastName) { setError('Nome e cognome obbligatori'); return }
    setSaving(true); setError(null)
    const { error: saveErr } = await supabase.from('profiles').update({
      username,
      first_name: firstName,
      last_name:  lastName,
      full_name:  `${firstName} ${lastName}`,
      bio:        bio || null,
    }).eq('id', userId)
    setSaving(false)
    if (saveErr) { setError('Errore nel salvataggio. Riprova.'); return }
    setSaved(true)
    setTimeout(() => router.push(`/profilo/${username}`), 1000)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveProfile()
  }

  const initials = getInitials(firstName || null, lastName || null, username || null)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen gap-3 text-muted">
      <Loader2 size={20} className="animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-parchment">

      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-parchment/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href={username ? `/profilo/${username}` : '/'} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-espresso transition-colors">
          <ArrowLeft size={15} />
          Annulla
        </Link>
        <h1 className="font-serif font-bold text-espresso text-[16px]">Modifica profilo</h1>
        <button
          onClick={handleSave}
          disabled={saving || usernameStatus === 'taken'}
          className="text-[13px] font-bold text-sienna hover:text-espresso transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <BadgeCheck size={15} className="text-green-600" /> : 'Salva'}
        </button>
      </div>

      {/* Cover preview + edit */}
      <div className="relative">
        <div
          className="relative h-28 sm:h-36 overflow-hidden group cursor-pointer"
          onClick={() => coverRef.current?.click()}
          style={!coverUrl ? { background: `linear-gradient(135deg, ${color}55 0%, ${color}22 100%)` } : undefined}
        >
          {coverUrl && <Image src={coverUrl} alt="Copertina" fill className="object-cover" />}
          {coverUrl && <div className="absolute inset-0 bg-espresso/10" />}
          <div className="absolute inset-0 flex items-center justify-center bg-espresso/0 group-hover:bg-espresso/20 transition-colors">
            {coverUploading
              ? <Loader2 size={20} className="text-white animate-spin" />
              : <div className="flex items-center gap-2 bg-espresso/60 text-parchment text-[12px] font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus size={14} />
                  {coverUrl ? 'Cambia copertina' : 'Aggiungi copertina'}
                </div>
            }
          </div>
        </div>
        <input ref={coverRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }} />

        {/* Avatar */}
        <div className="px-5 -mt-10 mb-4">
          <div className="relative w-20 h-20">
            <div className="relative w-20 h-20 rounded-full ring-[3px] ring-espresso/25 overflow-hidden cursor-pointer" onClick={() => fileRef.current?.click()}>
              {avatarUrl
                ? <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ background: color }}>{initials}</div>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-espresso text-parchment rounded-full flex items-center justify-center hover:bg-sienna transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={12} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="max-w-lg mx-auto px-4 pb-16 space-y-5">

        {error && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Nome + cognome */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">Nome</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Nome"
              className="w-full input"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">Cognome</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Cognome"
              className="w-full input"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">Username</label>
          <div className="relative">
            <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={e => checkUsername(e.target.value)}
              placeholder="username"
              className={cn('w-full input pl-8 pr-8', usernameStatus === 'taken' && 'border-red-400 focus:border-red-500 focus:ring-red-100')}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <Loader2 size={13} className="animate-spin text-muted" />}
              {usernameStatus === 'ok'       && <BadgeCheck size={14} className="text-green-500" />}
              {usernameStatus === 'taken'    && <AlertCircle size={14} className="text-red-500" />}
            </div>
          </div>
          {usernameStatus === 'taken' && (
            <p className="text-[11px] text-red-500 mt-1">Username non disponibile.</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">
            Bio <span className="font-normal text-muted normal-case tracking-normal">· opzionale</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Raccontati in poche parole..."
            className="w-full input resize-none"
          />
          <p className="text-[11px] text-muted/60 mt-1 text-right">{bio.length}/200</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || usernameStatus === 'taken'}
          className="w-full flex items-center justify-center gap-2 bg-espresso text-parchment font-semibold py-3 rounded-xl text-[14px] hover:bg-sienna transition-colors disabled:opacity-40"
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
            : saved
            ? <><BadgeCheck size={15} className="text-green-400" /> Salvato — reindirizzo...</>
            : 'Salva modifiche'
          }
        </button>

        <Link
          href="/impostazioni"
          className="block text-center text-[13px] text-muted hover:text-sienna transition-colors"
        >
          Impostazioni account →
        </Link>
      </form>
    </div>
  )
}
