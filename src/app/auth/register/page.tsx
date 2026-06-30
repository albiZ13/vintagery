'use client'

import { Fragment, Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Store, User, BadgeCheck, AlertCircle, Loader2,
  AtSign, Mail, RefreshCw, Camera, Navigation,
  CheckCircle2, Eye, EyeOff, ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { ITALIAN_REGIONS } from '@/types'
import { OAuthButtons } from '@/components/auth/OAuthButtons'

type Step = 1 | 2 | 3

const PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`


const fi = [
  'w-full rounded-xl border border-border bg-white px-4 py-3.5',
  'text-[15px] text-espresso placeholder:text-muted/40',
  'focus:outline-none focus:ring-2 focus:ring-sienna/20 focus:border-sienna',
  'transition-all duration-200',
].join(' ')

const la = 'block text-[10px] font-bold text-espresso/50 uppercase tracking-[0.14em] mb-2'

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-5 flex items-start gap-2.5">
      <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-red-700 text-[13px]">{msg}</p>
    </div>
  )
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const isShop       = searchParams.get('type') === 'shop'

  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<'user' | 'shop'>(isShop ? 'shop' : 'user')

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  const passStrength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
    : 2
  const STRENGTH_LABEL = ['', 'Debole', 'Buona', 'Ottima']
  const STRENGTH_BAR   = ['', 'bg-red-400', 'bg-amber-400', 'bg-green-500']
  const STRENGTH_TEXT  = ['', 'text-red-500', 'text-amber-600', 'text-green-600']

  const [username,       setUsername]       = useState('')
  const [firstName,      setFirstName]      = useState('')
  const [lastName,       setLastName]       = useState('')
  const [bio,            setBio]            = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')

  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [userRegion,  setUserRegion]  = useState('')
  const [geoLoading,  setGeoLoading]  = useState(false)
  const [geoDetected, setGeoDetected] = useState(false)

  const [newsletter,       setNewsletter]       = useState(false)
  const [newsletterRegion, setNewsletterRegion] = useState('')

  const [shopName,   setShopName]   = useState('')
  const [city,       setCity]       = useState('')
  const [region,     setRegion]     = useState('')
  const [vatNumber,  setVatNumber]  = useState('')
  const [vatStatus,  setVatStatus]  = useState<'idle'|'checking'|'ok'|'error'|'pending'>('idle')
  const [vatMessage, setVatMessage] = useState('')
  const [vatName,    setVatName]    = useState('')

  const [sent,      setSent]      = useState(false)
  const [resending, setResending] = useState(false)
  const [resent,    setResent]    = useState(false)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createClient()

  async function checkUsername(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    if (clean.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    const { data } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle()
    setUsernameStatus(data ? 'taken' : 'ok')
  }

  async function detectRegion() {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=it`,
            { headers: { 'User-Agent': 'Vintagery/1.0' } }
          )
          const data = await res.json()
          const state = data.address?.state as string | undefined
          if (state) {
            const normalized = ITALIAN_REGIONS.find(r =>
              r.toLowerCase() === state.toLowerCase() ||
              state.toLowerCase().includes(r.toLowerCase()) ||
              r.toLowerCase().includes(state.toLowerCase())
            )
            if (normalized) {
              setUserRegion(normalized)
              setGeoDetected(true)
              if (!newsletterRegion) setNewsletterRegion(normalized)
            }
          }
        } catch {}
        setGeoLoading(false)
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    )
  }

  async function checkVat() {
    if (!vatNumber) return
    setVatStatus('checking')
    const res  = await fetch('/api/verify-vat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vatNumber }),
    })
    const data = await res.json()
    if (data.valid === true) {
      setVatStatus('ok')
      setVatMessage(`P.IVA verificata${data.name ? ` — ${data.name}` : ''}`)
      if (data.name) { setVatName(data.name); if (!shopName) setShopName(data.name) }
    } else if (data.pending) {
      setVatStatus('pending'); setVatMessage('Verifica in sospeso — revisione manuale entro 24h')
    } else {
      setVatStatus('error'); setVatMessage(data.error ?? 'P.IVA non valida')
    }
  }

  function validateStep2() {
    if (!email || !password)    { setError('Compila tutti i campi'); return false }
    if (password.length < 8)    { setError('Password minimo 8 caratteri'); return false }
    if (password !== password2) { setError('Le password non coincidono'); return false }
    return true
  }

  function validateStep3() {
    if (!username || username.length < 3) { setError('Username minimo 3 caratteri'); return false }
    if (usernameStatus === 'taken')        { setError('Username già in uso'); return false }
    if (!firstName)                        { setError('Inserisci il tuo nome'); return false }
    if (!lastName)                         { setError('Inserisci il tuo cognome'); return false }
    if (newsletter && !newsletterRegion)   { setError('Seleziona la regione per la newsletter'); return false }
    if (mode === 'shop') {
      if (vatStatus === 'idle')  { setError('Verifica la tua Partita IVA prima di continuare'); return false }
      if (vatStatus === 'error') { setError('Partita IVA non valida'); return false }
      if (!shopName)             { setError('Inserisci il nome del negozio'); return false }
    }
    return true
  }

  function goNext() {
    setError(null)
    if (step === 2 && !validateStep2()) return
    setStep(s => (s + 1) as Step)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateStep3()) return
    setLoading(true)

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })

    if (signupErr || !data.user) {
      setLoading(false)
      const msg = signupErr?.message ?? ''
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Questa email è già registrata. Prova ad accedere.')
      } else {
        setError(msg || 'Errore di registrazione. Riprova.')
      }
      return
    }

    if (!data.user.identities || data.user.identities.length === 0) {
      setLoading(false)
      setError('Questa email è già registrata. Prova ad accedere.')
      return
    }

    sessionStorage.setItem('vintagery_pending_profile', JSON.stringify({
      userId:           data.user.id,
      username,
      firstName,
      lastName,
      bio:              bio || null,
      role:             mode,
      region:           userRegion || null,
      newsletter,
      newsletterRegion: newsletter ? newsletterRegion : null,
      shop: mode === 'shop' ? {
        shopName,
        city,
        region,
        vatNumber:   vatNumber.replace(/^IT/i, '').replace(/\s/g, ''),
        vatVerified: vatStatus === 'ok',
        vatStatus:   vatStatus === 'ok' ? 'verified' : 'pending',
        vatName:     vatName || null,
      } : null,
    }))

    setLoading(false)
    setSent(true)
  }

  async function resendEmail() {
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 6000)
  }

  const stepItems = [
    { n: 1 as Step, label: 'Account'    },
    { n: 2 as Step, label: 'Credenziali'},
    { n: 3 as Step, label: 'Profilo'    },
  ]

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[460px_1fr]">

      {/* ── LEFT panel ── */}
      <div className="hidden lg:flex flex-col bg-espresso text-parchment px-12 py-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: PATTERN }} />

        <Link href="/" className="relative font-serif font-bold text-parchment text-[18px] tracking-[-0.01em]">
          <span className="text-gold">V</span>intagery
        </Link>

        <div className="relative flex-1 flex flex-col justify-center py-16">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold/60 mb-5">
            Unisciti alla community
          </p>
          <h2
            className="font-serif font-bold text-parchment leading-[1.08] mb-10"
            style={{ fontSize: 'clamp(1.9rem, 2.6vw, 2.7rem)' }}
          >
            Tutto il vintage italiano,<br />
            <span className="text-gold">gratis.</span>
          </h2>

          <div className="space-y-4">
            {[
              'Scopri mercatini vicino a te',
              'Aggiungi eventi al calendario in un clic',
              'Segui i negozi che ami',
              'Ricevi avvisi di nuove entrate',
            ].map(b => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={13} className="text-gold" />
                </div>
                <p className="text-parchment/55 text-[14px]">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="h-px bg-parchment/10 mb-5" />
          <p className="text-parchment/30 text-[12px]">
            Hai già un account?{' '}
            <Link href="/auth/login" className="text-gold/80 hover:text-gold transition-colors font-medium">
              Accedi
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT form ── */}
      <div className="flex flex-col min-h-screen lg:justify-center bg-[#FAF6F0] px-6 py-12">
        <div className="w-full max-w-[440px] mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="font-serif font-bold text-espresso text-xl tracking-[-0.01em]">
              <span className="text-sienna">V</span>intagery
            </Link>
          </div>

          {/* ── Stepper ── */}
          <div className="flex items-start mb-10">
            {stepItems.map(({ n, label }, i) => (
              <Fragment key={n}>
                {i > 0 && (
                  <div className={`flex-1 h-[1.5px] mt-[18px] mx-2 transition-all duration-500 ${
                    step > i ? 'bg-sienna' : 'bg-border'
                  }`} />
                )}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-300 ${
                    step > n
                      ? 'bg-sienna text-parchment shadow-sm'
                      : step === n
                      ? 'bg-espresso text-parchment shadow-md shadow-espresso/20'
                      : 'bg-white border-2 border-border text-muted'
                  }`}>
                    {step > n ? <CheckCircle2 size={15} /> : n}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide whitespace-nowrap transition-colors ${
                    step === n ? 'text-espresso' : 'text-muted/50'
                  }`}>
                    {label}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <h1 className="font-serif text-[30px] font-bold text-espresso leading-tight mb-1.5">
                Come vuoi usare Vintagery?
              </h1>
              <p className="text-muted text-[14px] mb-8">Puoi cambiare in seguito dalle impostazioni.</p>

              <div className="space-y-3 mb-8">
                {([
                  { v: 'user' as const, icon: User,  title: 'Sono un appassionato', desc: 'Scopri mercatini, segui negozi, condividi i tuoi acquisti' },
                  { v: 'shop' as const, icon: Store, title: 'Ho un negozio vintage', desc: 'Crea il profilo negozio, pubblica le nuove entrate'        },
                ] as const).map(({ v, icon: Icon, title, desc }) => (
                  <button
                    key={v} type="button" onClick={() => setMode(v)}
                    className={`w-full flex items-start gap-5 p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                      mode === v
                        ? 'border-espresso bg-espresso/[0.04] shadow-lg shadow-espresso/[0.07]'
                        : 'border-border bg-white hover:border-espresso/30 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      mode === v ? 'bg-espresso' : 'bg-cream border border-border/60'
                    }`}>
                      <Icon size={22} className={mode === v ? 'text-gold' : 'text-coffee/70'} />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className="font-semibold text-[16px] text-espresso leading-tight mb-1">{title}</p>
                      <p className="text-muted text-[13px] leading-relaxed">{desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-2 transition-all ${
                      mode === v ? 'border-espresso bg-espresso' : 'border-border'
                    }`}>
                      {mode === v && <div className="w-2 h-2 bg-parchment rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>

              {mode === 'shop' && (
                <div className="bg-gold/10 border border-gold/25 rounded-xl px-4 py-3.5 mb-8 flex gap-3">
                  <BadgeCheck size={16} className="text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-coffee leading-relaxed">
                    <span className="font-semibold text-espresso">Solo rivenditori di vintage e usato.</span>{' '}
                    Partita IVA verificata via VIES nel passo successivo.
                  </p>
                </div>
              )}

              <button
                type="button" onClick={() => setStep(2)}
                className="w-full rounded-full bg-espresso text-parchment font-semibold py-4 text-[15px] hover:bg-sienna transition-all duration-200 shadow-lg shadow-espresso/20 active:scale-[0.99]"
              >
                Continua
              </button>

              <div className="mt-6 relative flex items-center">
                <div className="flex-grow border-t border-border/50" />
                <span className="mx-3 text-[11px] text-muted/50 bg-[#FAF6F0] px-1">oppure</span>
                <div className="flex-grow border-t border-border/50" />
              </div>
              <div className="mt-4">
                <OAuthButtons next="/home" />
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>
              <h1 className="font-serif text-[30px] font-bold text-espresso leading-tight mb-1.5">Il tuo account</h1>
              <p className="text-muted text-[14px] mb-8">Email e password di accesso</p>

              <div className="space-y-5">
                <div>
                  <label htmlFor="reg-email" className={la}>Email *</label>
                  <input id="reg-email" type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className={fi} placeholder="tua@email.com" />
                </div>

                <div>
                  <label htmlFor="reg-password" className={la}>Password *</label>
                  <div className="relative">
                    <input id="reg-password" type={showPass ? 'text' : 'password'} required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className={fi + ' pr-12'} placeholder="minimo 8 caratteri" />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-espresso transition-colors"
                      aria-label={showPass ? 'Nascondi password' : 'Mostra password'}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="mt-2.5">
                      <div className="flex gap-1 mb-1.5">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${passStrength >= i ? STRENGTH_BAR[passStrength] : 'bg-border'}`} />
                        ))}
                      </div>
                      <p className={`text-[11px] font-medium ${STRENGTH_TEXT[passStrength]}`}>
                        {STRENGTH_LABEL[passStrength]}
                      </p>
                    </div>
                  )}

                  {/* Requirements (shown upfront) */}
                  <div className="mt-2 space-y-1">
                    {([
                      { ok: password.length >= 8,         text: 'Almeno 8 caratteri'   },
                      { ok: /[A-Z]/.test(password),       text: 'Una lettera maiuscola' },
                      { ok: /[0-9]/.test(password),       text: 'Un numero'             },
                    ] as const).map(({ ok, text }) => (
                      <p key={text} className={`text-[11px] flex items-center gap-1.5 transition-colors ${
                        password.length > 0 && ok ? 'text-green-600' : 'text-muted/55'
                      }`}>
                        {password.length > 0 && ok
                          ? <CheckCircle2 size={10} />
                          : <span className="w-2.5 h-2.5 rounded-full border border-current inline-block opacity-50 flex-shrink-0" />
                        }
                        {text}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password2" className={la}>Conferma password *</label>
                  <div className="relative">
                    <input id="reg-password2" type={showPass2 ? 'text' : 'password'} required autoComplete="new-password"
                      value={password2} onChange={e => setPassword2(e.target.value)}
                      className={fi + ' pr-12' + (password2.length > 0 && password2 !== password ? ' !border-red-300 focus:!border-red-400' : '')}
                      placeholder="ripeti la password" />
                    <button type="button" onClick={() => setShowPass2(p => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-espresso transition-colors"
                      aria-label={showPass2 ? 'Nascondi password' : 'Mostra password'}>
                      {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password2.length > 0 && password2 !== password && (
                    <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={11} /> Le password non coincidono
                    </p>
                  )}
                </div>
              </div>

              {error && <ErrorBox msg={error} />}

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setError(null); setStep(1) }}
                  className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center text-muted hover:border-espresso hover:text-espresso transition-all flex-shrink-0"
                  aria-label="Indietro">
                  <ArrowLeft size={16} />
                </button>
                <button type="button" onClick={goNext}
                  className="flex-1 rounded-full bg-espresso text-parchment font-semibold py-3.5 text-[15px] hover:bg-sienna transition-all duration-200 shadow-lg shadow-espresso/20 active:scale-[0.99]">
                  Continua
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <form onSubmit={submit}>
              <h1 className="font-serif text-[30px] font-bold text-espresso leading-tight mb-1.5">Il tuo profilo</h1>
              <p className="text-muted text-[14px] mb-8">Come ti vedranno gli altri utenti</p>

              {/* Avatar */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-white border-2 border-border shadow-sm overflow-hidden flex items-center justify-center">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Anteprima foto profilo" className="w-full h-full object-cover" />
                      : <User size={30} className="text-border" />
                    }
                  </div>
                  <label htmlFor="reg-avatar"
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-espresso rounded-full flex items-center justify-center cursor-pointer hover:bg-sienna transition-colors shadow-md">
                    <Camera size={14} className="text-parchment" aria-hidden />
                    <span className="sr-only">Aggiungi foto profilo</span>
                  </label>
                  <input id="reg-avatar" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 2 * 1024 * 1024) { setError('Immagine troppo grande (max 2MB)'); return }
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                      setError(null)
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted/60 mt-2.5">Foto opzionale · max 2 MB</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-first-name" className={la}>Nome *</label>
                    <input id="reg-first-name" type="text" required autoComplete="given-name"
                      value={firstName} onChange={e => setFirstName(e.target.value)}
                      className={fi} placeholder="Mario" />
                  </div>
                  <div>
                    <label htmlFor="reg-last-name" className={la}>Cognome *</label>
                    <input id="reg-last-name" type="text" required autoComplete="family-name"
                      value={lastName} onChange={e => setLastName(e.target.value)}
                      className={fi} placeholder="Rossi" />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-username" className={la}>Username *</label>
                  <div className="relative">
                    <AtSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" aria-hidden />
                    <input id="reg-username" type="text" value={username}
                      onChange={e => checkUsername(e.target.value)}
                      className={fi + ' pl-10 pr-10'} placeholder="il_tuo_username"
                      maxLength={20} autoComplete="username" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {usernameStatus === 'checking' && <Loader2 size={15} className="text-muted animate-spin" />}
                      {usernameStatus === 'ok'       && <CheckCircle2 size={15} className="text-green-500" />}
                      {usernameStatus === 'taken'    && <AlertCircle size={15} className="text-red-500" />}
                    </div>
                  </div>
                  <p className={`text-[11px] mt-1.5 ${usernameStatus === 'taken' ? 'text-red-500' : 'text-muted/60'}`}>
                    {usernameStatus === 'taken'
                      ? 'Username già in uso — prova un altro'
                      : 'Solo lettere minuscole, numeri e _ · minimo 3 caratteri'}
                  </p>
                </div>

                <div>
                  <label htmlFor="reg-bio" className={la}>
                    Bio <span className="normal-case text-muted/50 font-normal tracking-normal">— opzionale</span>
                  </label>
                  <div className="relative">
                    <textarea id="reg-bio" value={bio} onChange={e => setBio(e.target.value)}
                      className={fi + ' resize-none'} rows={2}
                      placeholder="Appassionato di vintage anni '70..." maxLength={160} />
                    <span className={`absolute bottom-3 right-4 text-[10px] pointer-events-none ${bio.length > 140 ? 'text-amber-500' : 'text-muted/40'}`}>
                      {bio.length}/160
                    </span>
                  </div>
                </div>
              </div>

              {/* Preferenze */}
              <div className="mt-5 space-y-3">

                {/* Regione */}
                <div className="bg-white border border-border/60 rounded-2xl p-4">
                  <p className={la + ' mb-3'}>
                    La tua regione{' '}
                    <span className="normal-case text-muted/50 font-normal tracking-normal">— mercatini vicino a te</span>
                  </p>
                  <div className="flex gap-2">
                    <select value={userRegion} onChange={e => { setUserRegion(e.target.value); setGeoDetected(false) }}
                      className={fi + ' py-3 flex-1'}>
                      <option value="">Seleziona regione</option>
                      {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button type="button" onClick={detectRegion} disabled={geoLoading}
                      title="Rileva automaticamente"
                      className="flex items-center gap-1.5 px-3.5 rounded-xl border border-border/70 bg-white text-muted hover:border-espresso/40 hover:text-espresso transition-all flex-shrink-0 text-[12px] font-medium">
                      {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} className={geoDetected ? 'text-green-500' : ''} />}
                      <span className="hidden sm:inline">{geoLoading ? 'Rilevo…' : 'Rileva'}</span>
                    </button>
                  </div>
                  {geoDetected && (
                    <p className="text-[11px] text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Rilevata automaticamente · puoi cambiarla
                    </p>
                  )}
                </div>

                {/* Newsletter */}
                <div className="bg-gold/[0.06] border border-gold/20 rounded-2xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)} className="sr-only" />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      newsletter ? 'bg-espresso border-espresso' : 'bg-white border-border'
                    }`}>
                      {newsletter && <CheckCircle2 size={11} className="text-gold" />}
                    </div>
                    <div>
                      <p className="font-semibold text-[14px] text-espresso leading-tight">Newsletter mensile gratuita</p>
                      <p className="text-[12px] text-muted mt-0.5 leading-relaxed">Tutti i mercatini della tua regione, ogni primo del mese.</p>
                    </div>
                  </label>
                  {newsletter && (
                    <div className="mt-3.5 pl-8">
                      <label className={la}>Regione *</label>
                      <select value={newsletterRegion} onChange={e => setNewsletterRegion(e.target.value)}
                        className={fi + ' py-3'}>
                        <option value="">Seleziona regione</option>
                        {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Shop data */}
                {mode === 'shop' && (
                  <div className="bg-white border border-border/60 rounded-2xl p-4 space-y-4">
                    <p className={la}>Dati negozio</p>
                    <div>
                      <label className={la}>Partita IVA *</label>
                      <div className="flex gap-2">
                        <input type="text" value={vatNumber}
                          onChange={e => { setVatNumber(e.target.value); setVatStatus('idle') }}
                          className={fi + ' py-3 flex-1'} placeholder="IT 12345678901" maxLength={13} />
                        <button type="button" onClick={checkVat}
                          disabled={vatStatus === 'checking' || !vatNumber}
                          className="flex items-center gap-1.5 px-4 rounded-xl border border-border/70 bg-white text-coffee hover:border-espresso/50 hover:text-espresso transition-all flex-shrink-0 text-[13px] font-medium disabled:opacity-50">
                          {vatStatus === 'checking' ? <Loader2 size={13} className="animate-spin" /> : 'Verifica'}
                        </button>
                      </div>
                      {vatStatus !== 'idle' && (
                        <p className={`text-[12px] mt-1.5 flex items-center gap-1 ${
                          vatStatus === 'ok' ? 'text-green-700' : vatStatus === 'error' ? 'text-red-600' : 'text-yellow-700'
                        }`}>
                          {vatStatus === 'ok' ? <BadgeCheck size={12} /> : <AlertCircle size={12} />}
                          {vatMessage}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={la}>Nome negozio *</label>
                      <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                        className={fi + ' py-3'} placeholder="Vintage Paradise" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={la}>Città *</label>
                        <input type="text" value={city} onChange={e => setCity(e.target.value)}
                          className={fi + ' py-3'} placeholder="Milano" />
                      </div>
                      <div>
                        <label className={la}>Regione *</label>
                        <select value={region} onChange={e => setRegion(e.target.value)}
                          className={fi + ' py-3'}>
                          <option value="">Seleziona</option>
                          {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && <ErrorBox msg={error} />}

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setError(null); setStep(2) }}
                  className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center text-muted hover:border-espresso hover:text-espresso transition-all flex-shrink-0"
                  aria-label="Indietro">
                  <ArrowLeft size={16} />
                </button>
                <button type="submit" disabled={loading || usernameStatus === 'taken'}
                  className="flex-1 rounded-full bg-espresso text-parchment font-semibold py-3.5 text-[15px] hover:bg-sienna transition-all duration-200 shadow-lg shadow-espresso/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Creazione account...</>
                    : 'Crea account'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-5 border-t border-border/40 text-center">
            <p className="text-[13px] text-muted">
              Hai già un account?{' '}
              <Link href="/auth/login" className="text-espresso font-semibold hover:text-sienna transition-colors">
                Accedi
              </Link>
            </p>
          </div>
        </div>

        {/* ── Email overlay ── */}
        {sent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(28, 46, 74, 0.85)', backdropFilter: 'blur(10px)' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-sienna via-gold to-sienna" />
              <div className="px-10 py-10 text-center">

                {/* Icon */}
                <div className="relative mx-auto w-[72px] h-[72px] mb-7">
                  <div className="absolute inset-[-6px] rounded-[20px] border border-espresso/[0.08]" />
                  <div className="absolute inset-[-12px] rounded-[24px] border border-espresso/[0.04]" />
                  <div className="w-full h-full rounded-2xl bg-espresso/[0.07] flex items-center justify-center">
                    <Mail size={32} className="text-espresso" />
                  </div>
                </div>

                <h2 className="font-serif text-[25px] font-bold text-espresso mb-2 leading-tight">
                  Controlla la tua email
                </h2>
                <p className="text-muted text-[14px] mb-3">Abbiamo inviato il link di accesso a</p>

                <div className="inline-flex items-center gap-2 bg-espresso/[0.05] border border-espresso/[0.08] rounded-full px-4 py-1.5 mb-6">
                  <Mail size={12} className="text-espresso/40" />
                  <span className="font-semibold text-espresso text-[14px]">{email}</span>
                </div>

                <div className="bg-[#FAF6F0] border border-border/60 rounded-xl px-4 py-3.5 mb-7 text-left">
                  <p className="text-[13px] text-coffee leading-relaxed">
                    <span className="font-semibold">Clicca il link nell'email</span> per accedere direttamente — nessun codice da inserire.
                  </p>
                  <p className="text-[12px] text-muted mt-1.5">
                    Controlla la cartella <span className="font-medium text-coffee">spam</span> se non trovi la mail. Il link scade dopo 24 ore.
                  </p>
                </div>

                <button onClick={resendEmail} disabled={resending || resent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-espresso/55 hover:text-espresso transition-colors disabled:opacity-50 mb-4">
                  {resending
                    ? <><Loader2 size={13} className="animate-spin" /> Invio in corso...</>
                    : resent
                    ? <><CheckCircle2 size={13} className="text-green-500" /> Email inviata di nuovo!</>
                    : <><RefreshCw size={13} /> Non hai ricevuto la mail? Inviala di nuovo</>
                  }
                </button>

                <button onClick={() => setSent(false)}
                  className="text-[12px] text-muted/50 hover:text-muted transition-colors">
                  Ho sbagliato email — torna indietro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <Loader2 size={20} className="text-muted animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
