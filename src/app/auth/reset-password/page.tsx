'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

function ResetForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [step, setStep] = useState<'request' | 'update'>(
    searchParams.get('step') === 'update' ? 'update' : 'request'
  )

  useEffect(() => {
    if (searchParams.get('step') === 'update') setStep('update')
  }, [searchParams])

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password?step=update`,
    })
    setLoading(false)
    if (err) {
      if (err.message.includes('rate limit') || err.message.includes('Too many')) {
        setError('Troppi tentativi. Attendi qualche minuto prima di riprovare.')
      } else {
        setError('Errore nell\'invio. Controlla l\'email e riprova.')
      }
      return
    }
    setDone(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8)  { setError('La password deve essere di almeno 8 caratteri.'); return }
    if (password !== confirm)  { setError('Le password non coincidono.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message || 'Errore durante l\'aggiornamento. Riprova.'); return }
    setDone(true)
    setTimeout(() => router.push('/home'), 2500)
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
            Accesso sicuro
          </p>
          <h2 className="font-serif font-bold text-parchment leading-[1.1] mb-6"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>
            {step === 'request'
              ? 'Recupera\nl\'accesso al\ntuo account.'
              : 'Scegli una\nnuova password\nsicura.'
            }
          </h2>
          <p className="text-parchment/45 text-[14px] leading-relaxed max-w-[280px]">
            {step === 'request'
              ? 'Ti invieremo un link sicuro per reimpostare la password.'
              : 'La nuova password sostituisce immediatamente quella precedente.'
            }
          </p>
        </div>

        <div className="relative">
          <div className="h-px bg-parchment/12 mb-5" />
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-[13px] text-parchment/40 hover:text-parchment/70 transition-colors">
            <ArrowLeft size={13} /> Torna al login
          </Link>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex items-center justify-center min-h-screen lg:min-h-0 bg-cream px-6 py-16">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2 font-serif font-bold text-espresso text-xl">
              <span className="w-7 h-7 rounded-md bg-sienna flex items-center justify-center text-parchment text-sm font-bold">V</span>
              Vintagery
            </Link>
          </div>

          {/* ── Request reset ── */}
          {step === 'request' && !done && (
            <>
              <div className="mb-8">
                <h1 className="font-serif text-[28px] font-bold text-espresso mb-1.5">Password dimenticata?</h1>
                <p className="text-muted text-[14px]">Inserisci la tua email. Ti mandiamo un link per reimpostarla.</p>
              </div>
              <form onSubmit={handleRequest} className="space-y-4" aria-label="Richiesta reset password">
                <div>
                  <label htmlFor="reset-email" className="block text-[11px] font-semibold text-coffee mb-1.5 uppercase tracking-[0.08em]">
                    Email
                  </label>
                  <input
                    id="reset-email" type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tua@email.com" className="input !py-2.5"
                  />
                </div>
                {error && (
                  <div role="alert" className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
                    <p className="text-red-700 text-[13px]">{error}</p>
                  </div>
                )}
                <button
                  type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-[15px] disabled:opacity-60"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Invio in corso...</>
                    : 'Invia link di reset'
                  }
                </button>
              </form>
            </>
          )}

          {/* ── Request sent ── */}
          {step === 'request' && done && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={30} className="text-green-600" aria-hidden />
              </div>
              <h2 className="font-serif text-[26px] font-bold text-espresso mb-3">Email inviata!</h2>
              <p className="text-muted text-[14px] leading-relaxed mb-8">
                Controlla la casella di posta a<br />
                <span className="font-semibold text-espresso">{email}</span><br />
                e clicca il link per reimpostare la password.
              </p>
              <p className="text-muted text-[12px]">
                Non hai ricevuto nulla?{' '}
                <button
                  onClick={() => { setDone(false); setEmail('') }}
                  className="text-sienna hover:underline font-medium"
                >
                  Riprova
                </button>
              </p>
            </div>
          )}

          {/* ── Set new password ── */}
          {step === 'update' && !done && (
            <>
              <div className="mb-8">
                <h1 className="font-serif text-[28px] font-bold text-espresso mb-1.5">Nuova password</h1>
                <p className="text-muted text-[14px]">Scegli una password sicura di almeno 8 caratteri.</p>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4" aria-label="Aggiornamento password">
                <div>
                  <label htmlFor="new-password" className="block text-[11px] font-semibold text-coffee mb-1.5 uppercase tracking-[0.08em]">
                    Nuova password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password" type={showPwd ? 'text' : 'password'} required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      className="input !py-2.5 pr-10"
                    />
                    <button
                      type="button" onClick={() => setShowPwd(v => !v)}
                      aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-coffee transition-colors"
                    >
                      {showPwd ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-[11px] text-amber-600 mt-1">Minimo 8 caratteri ({8 - password.length} mancanti)</p>
                  )}
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-[11px] font-semibold text-coffee mb-1.5 uppercase tracking-[0.08em]">
                    Conferma password
                  </label>
                  <input
                    id="confirm-password" type={showPwd ? 'text' : 'password'} required autoComplete="new-password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                    className={`input !py-2.5 ${confirm.length > 0 && confirm !== password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-[11px] text-red-500 mt-1">Le password non coincidono</p>
                  )}
                </div>
                {error && (
                  <div role="alert" className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
                    <p className="text-red-700 text-[13px]">{error}</p>
                  </div>
                )}
                <button
                  type="submit" disabled={loading || (confirm.length > 0 && confirm !== password)}
                  className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-[15px] disabled:opacity-60"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Salvataggio...</>
                    : 'Aggiorna password'
                  }
                </button>
              </form>
            </>
          )}

          {/* ── Password updated ── */}
          {step === 'update' && done && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={30} className="text-green-600" aria-hidden />
              </div>
              <h2 className="font-serif text-[26px] font-bold text-espresso mb-3">Password aggiornata!</h2>
              <p className="text-muted text-[14px] mb-2">Reindirizzamento alla home in corso...</p>
              <Loader2 size={16} className="text-muted animate-spin mx-auto" />
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-border/50 text-center">
            <Link href="/auth/login" className="text-[13px] text-sienna hover:underline font-medium">
              ← Torna al login
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 size={20} className="text-muted animate-spin" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  )
}
