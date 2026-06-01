'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

const fi = [
  'w-full rounded-xl border border-border bg-white px-4 py-3.5',
  'text-[15px] text-espresso placeholder:text-muted/40',
  'focus:outline-none focus:ring-2 focus:ring-sienna/20 focus:border-sienna',
  'transition-all duration-200',
].join(' ')

const la = 'block text-[10px] font-bold text-espresso/50 uppercase tracking-[0.14em] mb-2'

const BENEFITS = [
  'Scopri mercatini vicino a te',
  'Aggiungi eventi al calendario in un clic',
  'Segui i negozi che ami',
  'Ricevi avvisi di nuove entrate',
]

type ErrorState = { type: 'generic' | 'unconfirmed'; message: string } | null

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const from = searchParams.get('from')
  const safeTo = from?.startsWith('/') ? from : '/home'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<ErrorState>(null)
  const [resending, setResending] = useState(false)
  const [resent,    setResent]    = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      if (err.message.includes('Email not confirmed') || err.message.includes('email_not_confirmed')) {
        setError({ type: 'unconfirmed', message: 'Email non ancora confermata. Controlla la casella di posta o richiedi un nuovo codice.' })
      } else if (err.message.includes('Invalid login credentials')) {
        setError({ type: 'generic', message: 'Email o password errati. Riprova o usa "Dimenticata?" per reimpostare la password.' })
      } else if (err.message.includes('Too many requests')) {
        setError({ type: 'generic', message: 'Troppi tentativi. Attendi qualche minuto prima di riprovare.' })
      } else {
        setError({ type: 'generic', message: err.message || 'Errore di accesso. Riprova.' })
      }
      return
    }
    window.location.href = safeTo
  }

  async function resendConfirmation() {
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 6000)
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[480px_1fr]">

      {/* LEFT — Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-espresso text-parchment p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: PATTERN }} />

        <Link href="/" className="relative font-serif font-bold text-parchment text-[18px] tracking-[-0.01em]">
          <span className="text-gold">V</span>intagery
        </Link>

        <div className="relative">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold/65 mb-6">
            La community del vintage italiano
          </p>
          <h2 className="font-serif font-bold text-parchment leading-[1.1] mb-8"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
            Bentornato<br />nel vintage<br />italiano.
          </h2>
          <div className="space-y-3">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-center gap-2.5">
                <CheckCircle2 size={14} className="text-gold flex-shrink-0" />
                <p className="text-parchment/60 text-[14px]">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="h-px bg-parchment/12 mb-5" />
          <p className="text-parchment/30 text-[12px]">
            Non hai un account?{' '}
            <Link href="/auth/register" className="text-gold hover:text-gold/80 transition-colors font-medium underline underline-offset-2">
              Registrati gratis
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex items-center justify-center min-h-screen lg:min-h-0 bg-cream px-6 py-16">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="font-serif font-bold text-espresso text-xl tracking-[-0.01em]">
              <span className="text-sienna">V</span>intagery
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-[30px] font-bold text-espresso leading-tight mb-1.5">Bentornato</h1>
            <p className="text-muted text-[14px]">Inserisci le tue credenziali per continuare</p>
          </div>

          <form onSubmit={submit} className="space-y-5" aria-label="Modulo di accesso">
            <div>
              <label htmlFor="login-email" className={la}>Email</label>
              <input
                id="login-email"
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className={fi} placeholder="tua@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className={la.replace('mb-2', '')}>Password</label>
                <Link href="/auth/reset-password" className="text-[12px] text-sienna/80 hover:text-sienna transition-colors">
                  Dimenticata?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={fi + ' pr-12'} placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-espresso transition-colors"
                >
                  {showPw ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </div>

            {/* Error states */}
            {error && (
              <div role="alert" className={`border rounded-xl px-4 py-3.5 ${
                error.type === 'unconfirmed'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={15} className={`flex-shrink-0 mt-0.5 ${error.type === 'unconfirmed' ? 'text-amber-600' : 'text-red-500'}`} aria-hidden />
                  <p className={`text-[13px] leading-relaxed ${error.type === 'unconfirmed' ? 'text-amber-800' : 'text-red-700'}`}>
                    {error.message}
                  </p>
                </div>
                {error.type === 'unconfirmed' && email && (
                  <button
                    type="button"
                    onClick={resendConfirmation}
                    disabled={resending || resent}
                    className="mt-2.5 ml-7 text-[12px] font-semibold text-amber-700 hover:underline flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {resending
                      ? <><Loader2 size={11} className="animate-spin" /> Invio in corso...</>
                      : resent
                      ? <><CheckCircle2 size={11} className="text-green-600" /> Email inviata!</>
                      : <><RefreshCw size={11} /> Invia nuovo link di conferma</>
                    }
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-espresso text-parchment font-semibold py-4 text-[15px] hover:bg-sienna transition-all duration-200 shadow-lg shadow-espresso/20 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Accesso in corso...</>
                : <>Accedi <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-[13px] text-muted">
              Non hai un account?{' '}
              <Link href="/auth/register" className="text-espresso font-semibold hover:text-sienna transition-colors">
                Registrati gratis
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-muted/50 mt-5 leading-relaxed">
            Continuando accetti i{' '}
            <Link href="/termini" className="underline hover:text-muted/80">Termini di servizio</Link>{' '}
            e la{' '}
            <Link href="/privacy" className="underline hover:text-muted/80">Privacy policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 size={20} className="text-muted animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
