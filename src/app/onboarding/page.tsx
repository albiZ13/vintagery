'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Loader2, Sparkles, Bell, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { ITALIAN_REGIONS } from '@/types'
import { cn } from '@/lib/utils'

const INTERESTS = [
  { id: 'antiquariato',   label: 'Antiquariato',    emoji: '🏺' },
  { id: 'abbigliamento',  label: 'Abbigliamento',   emoji: '👗' },
  { id: 'vinili',         label: 'Vinili & Musica',  emoji: '🎵' },
  { id: 'design',         label: 'Design & Oggetti', emoji: '🪑' },
  { id: 'libri',          label: 'Libri',            emoji: '📚' },
  { id: 'kilo',           label: 'Kilo Vintage',     emoji: '⚖️' },
  { id: 'collezionismo',  label: 'Collezionismo',    emoji: '🔍' },
  { id: 'arredamento',    label: 'Arredamento',      emoji: '🛋️' },
]

const PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

type Step = 1 | 2 | 3 | 4

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,           setStep]           = useState<Step>(1)
  const [userId,         setUserId]         = useState<string | null>(null)
  const [firstName,      setFirstName]      = useState('')
  const [interests,      setInterests]      = useState<string[]>([])
  const [region,         setRegion]         = useState('')
  const [newsletter,     setNewsletter]     = useState(true)
  const [pushEnabled,    setPushEnabled]    = useState(false)
  const [pushSupported,  setPushSupported]  = useState(false)
  const [pushLoading,    setPushLoading]    = useState(false)
  const [pushDenied,     setPushDenied]     = useState(false)
  const [saving,         setSaving]         = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
      )
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('first_name, region, interests, onboarding_done, notify_newsletter')
        .eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.onboarding_done) { router.push('/home'); return }
          if (data?.first_name) setFirstName(data.first_name)
          if (data?.region) setRegion(data.region)
          if (data?.interests?.length) setInterests(data.interests)
          if (typeof data?.notify_newsletter === 'boolean') setNewsletter(data.notify_newsletter)
        })
    })
  }, [])

  function toggleInterest(id: string) {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function togglePush() {
    if (!pushSupported) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setPushEnabled(false)
      } else {
        setPushDenied(false)
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setPushDenied(true)
          setPushLoading(false)
          return
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
        setPushEnabled(true)
        const json = sub.toJSON()
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        }).catch(() => {})
      }
    } catch {}
    setPushLoading(false)
  }

  async function finish() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      first_name:        firstName.trim() || null,
      interests,
      region:            region || null,
      notify_newsletter: newsletter,
      onboarding_done:   true,
    }).eq('id', userId)
    router.push('/home')
  }

  const progress = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100

  return (
    <div
      className="min-h-screen bg-espresso flex items-center justify-center px-4 py-10"
      style={{ backgroundImage: PATTERN }}
    >
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 font-serif font-bold text-parchment text-xl mb-8">
          <svg viewBox="28 40 64 104" width="13" height="20" fill="none" aria-hidden="true">
            <path d="M60,142 C40,108 30,94 30,72 A30,30 0 1 1 90,72 C90,94 80,108 60,142 Z" fill="#F0EDE6"/>
            <polygon points="60,50 63.54,68.46 82,72 63.54,75.54 60,94 56.46,75.54 38,72 56.46,68.46" fill="#C99A4B"/>
          </svg>
          Vintagery
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-parchment rounded-2xl overflow-hidden shadow-2xl">

          {/* ── Step 1 — Benvenuto ── */}
          {step === 1 && (
            <div className="p-8">
              <div className="w-12 h-12 bg-gold/15 border border-gold/25 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles size={22} className="text-gold" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sienna mb-2">
                Passo 1 di 4
              </p>
              <h1 className="font-serif font-bold text-espresso text-[26px] leading-tight mb-2">
                {firstName ? `Ciao, ${firstName}!` : 'Benvenuto!'}
              </h1>
              <p className="text-muted text-[14px] leading-relaxed mb-8">
                Rispondi a 3 domande rapide — personalizzeremo la tua esperienza su Vintagery.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-espresso/50 mb-2">
                    Come ti chiami?
                  </p>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Il tuo nome"
                    className="w-full bg-white border border-border rounded-xl px-4 py-3 text-[14px] text-espresso focus:outline-none focus:ring-2 focus:ring-sienna/20 focus:border-sienna placeholder:text-muted/40"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="mt-6 w-full py-3.5 rounded-xl bg-espresso text-parchment font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-sienna transition-colors"
              >
                Continua <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── Step 2 — Interessi ── */}
          {step === 2 && (
            <div className="p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sienna mb-2">
                Passo 2 di 4
              </p>
              <h2 className="font-serif font-bold text-espresso text-[22px] leading-tight mb-1">
                Cosa cerchi?
              </h2>
              <p className="text-muted text-[13px] mb-6">
                Seleziona tutto ciò che ti interessa. Puoi cambiarlo in seguito.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {INTERESTS.map(({ id, label, emoji }) => {
                  const selected = interests.includes(id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleInterest(id)}
                      className={cn(
                        'relative flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all duration-150',
                        selected
                          ? 'bg-espresso border-espresso text-parchment'
                          : 'bg-white border-border text-espresso hover:border-sienna/40 hover:bg-sienna/4',
                      )}
                    >
                      <span className="text-[18px] leading-none">{emoji}</span>
                      <span className="text-[13px] font-medium leading-tight">{label}</span>
                      {selected && (
                        <Check size={12} className="absolute top-2 right-2 text-gold" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl border border-border text-espresso text-[13px] font-medium hover:bg-cream transition-colors"
                >
                  Indietro
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl bg-espresso text-parchment font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-sienna transition-colors"
                >
                  {interests.length === 0 ? 'Salta' : 'Continua'} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 — Regione ── */}
          {step === 3 && (
            <div className="p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sienna mb-2">
                Passo 3 di 4
              </p>
              <h2 className="font-serif font-bold text-espresso text-[22px] leading-tight mb-1">
                Dove cerchi?
              </h2>
              <p className="text-muted text-[13px] mb-6">
                Ti mostreremo i mercati più vicini a te. Puoi sempre filtrare.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                {ITALIAN_REGIONS.map(r => {
                  const selected = region === r
                  return (
                    <button
                      key={r}
                      onClick={() => setRegion(selected ? '' : r)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 text-[12px] font-medium',
                        selected
                          ? 'bg-espresso border-espresso text-parchment'
                          : 'bg-white border-border text-espresso hover:border-sienna/40',
                      )}
                    >
                      {selected && <Check size={11} className="text-gold shrink-0" />}
                      <span>{r}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl border border-border text-espresso text-[13px] font-medium hover:bg-cream transition-colors"
                >
                  Indietro
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 rounded-xl bg-espresso text-parchment font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-sienna transition-colors"
                >
                  {region ? 'Continua' : 'Salta'} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4 — Notifiche ── */}
          {step === 4 && (
            <div className="p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sienna mb-2">
                Passo 4 di 4
              </p>
              <h2 className="font-serif font-bold text-espresso text-[22px] leading-tight mb-1">
                Resta aggiornato
              </h2>
              <p className="text-muted text-[13px] mb-6">
                Ogni venerdì sera ti diciamo cosa c&apos;è nel weekend. Zero spam.
              </p>

              <div className="space-y-3 mb-6">
                {/* Email digest */}
                <button
                  onClick={() => setNewsletter(v => !v)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150',
                    newsletter
                      ? 'bg-espresso border-espresso'
                      : 'bg-white border-border hover:border-sienna/30',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    newsletter ? 'bg-gold/20' : 'bg-cream',
                  )}>
                    <Mail size={17} className={newsletter ? 'text-gold' : 'text-muted'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[13px] font-semibold leading-tight', newsletter ? 'text-parchment' : 'text-espresso')}>
                      Digest del venerdì
                    </p>
                    <p className={cn('text-[11px] mt-0.5', newsletter ? 'text-parchment/60' : 'text-muted')}>
                      I mercatini del weekend{region ? ` in ${region}` : ''} via email
                    </p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                    newsletter ? 'bg-gold border-gold' : 'border-border',
                  )}>
                    {newsletter && <Check size={11} className="text-espresso" strokeWidth={3} />}
                  </div>
                </button>

                {/* Push notifications */}
                {pushSupported && (
                  <>
                    {pushDenied && (
                      <p className="text-[11px] text-sienna/80 px-1 -mt-1">
                        Hai bloccato le notifiche nel browser. Abilitale dalle impostazioni del sito per riceverle.
                      </p>
                    )}
                    <button
                      onClick={togglePush}
                      disabled={pushLoading}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 disabled:opacity-60',
                        pushEnabled
                          ? 'bg-espresso border-espresso'
                          : 'bg-white border-border hover:border-sienna/30',
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        pushEnabled ? 'bg-gold/20' : 'bg-cream',
                      )}>
                        {pushLoading
                          ? <Loader2 size={17} className="animate-spin text-muted" />
                          : <Bell size={17} className={pushEnabled ? 'text-gold' : 'text-muted'} />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[13px] font-semibold leading-tight', pushEnabled ? 'text-parchment' : 'text-espresso')}>
                          Notifiche push
                        </p>
                        <p className={cn('text-[11px] mt-0.5', pushEnabled ? 'text-parchment/60' : 'text-muted')}>
                          Avviso venerdì pomeriggio sul telefono
                        </p>
                      </div>
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                        pushEnabled ? 'bg-gold border-gold' : 'border-border',
                      )}>
                        {pushEnabled && <Check size={11} className="text-espresso" strokeWidth={3} />}
                      </div>
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-3 rounded-xl border border-border text-espresso text-[13px] font-medium hover:bg-cream transition-colors"
                >
                  Indietro
                </button>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-espresso text-parchment font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-sienna transition-colors disabled:opacity-50"
                >
                  {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Salvataggio…</>
                    : <>Inizia a esplorare <ArrowRight size={15} /></>
                  }
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-parchment/30 text-[11px] mt-5">
          Puoi modificare queste preferenze in qualsiasi momento dalle impostazioni.
        </p>

      </div>
    </div>
  )
}
