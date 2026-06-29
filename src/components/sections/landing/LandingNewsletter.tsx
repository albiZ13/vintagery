'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { ITALIAN_REGIONS } from '@/types'

export default function LandingNewsletter() {
  const [email,   setEmail]   = useState('')
  const [region,  setRegion]  = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), region: region || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Riprova più tardi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-[#0f1e30] py-20 border-b border-black/30">
      <div className="max-w-2xl mx-auto px-4 text-center">

        <p className="text-[9px] font-black tracking-[0.38em] uppercase text-parchment/22 mb-6">
          Newsletter settimanale
        </p>

        <h2
          className="font-serif font-bold text-parchment leading-[1.08] tracking-[-0.015em] mb-4"
          style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}
        >
          Il weekend vintage della tua zona,<br />ogni venerdì sera.
        </h2>

        <p className="text-parchment/40 text-[14px] leading-relaxed mb-10 max-w-md mx-auto">
          Mercatini, svendite e nuove entrate nei negozi vicino a te —
          direttamente in inbox, senza social, senza algoritmi.
        </p>

        {done ? (
          <div className="inline-flex items-center gap-3 bg-parchment/10 border border-parchment/15 text-parchment rounded-2xl px-6 py-4">
            <CheckCircle2 size={18} className="text-gold flex-shrink-0" />
            <span className="text-[14px] font-semibold">
              Iscritto{region ? ` per ${region}` : ' per tutta Italia'}. A venerdì.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
            <input
              type="email"
              required
              placeholder="la-tua@email.it"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={150}
              className="flex-1 bg-white/[0.06] border border-parchment/15 text-parchment placeholder:text-parchment/30 rounded-full px-5 py-3 text-[14px] outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
            />
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="bg-white/[0.06] border border-parchment/15 text-parchment/60 rounded-full px-4 py-3 text-[13px] outline-none focus:border-gold/40 cursor-pointer sm:w-36"
            >
              <option value="" className="bg-espresso">Tutta Italia</option>
              {ITALIAN_REGIONS.map(r => (
                <option key={r} value={r} className="bg-espresso">{r}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-gold text-espresso font-bold rounded-full px-6 py-3 text-[14px] hover:bg-[#d4a84c] transition-all disabled:opacity-60 whitespace-nowrap flex-shrink-0"
              style={{ boxShadow: '0 4px 20px rgba(201,145,58,0.3)' }}
            >
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : <><span>Iscriviti</span><ArrowRight size={13} /></>
              }
            </button>
          </form>
        )}

        {error && (
          <p className="text-[12px] text-red-400 mt-3">{error}</p>
        )}

        <p className="text-[11px] text-parchment/20 mt-6">
          Nessuno spam. Cancellati in un clic quando vuoi.
        </p>
      </div>
    </section>
  )
}
