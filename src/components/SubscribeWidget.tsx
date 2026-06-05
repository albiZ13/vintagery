'use client'

import { useState } from 'react'
import { Bell, BellOff, CheckCircle2, Loader2, X } from 'lucide-react'
import { ITALIAN_REGIONS } from '@/types'

interface Props {
  initialRegion?: string
}

export default function SubscribeWidget({ initialRegion }: Props) {
  const [open,       setOpen]       = useState(false)
  const [email,      setEmail]      = useState('')
  const [region,     setRegion]     = useState(initialRegion ?? '')
  const [loading,    setLoading]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState<string | null>(null)

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
      if (!res.ok) throw new Error(data.error ?? 'Errore sconosciuto')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Riprova più tardi.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
        <CheckCircle2 size={13} />
        Iscritto{region ? ` per ${region}` : ' per tutta Italia'}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted border border-border bg-white hover:border-sienna/40 hover:text-sienna px-3 py-1.5 rounded-lg transition-colors"
      >
        <Bell size={12} /> Avvisami
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="inline-flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 shadow-sm"
    >
      <input
        type="email"
        required
        autoFocus
        placeholder="la-tua@email.it"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="text-[12px] outline-none bg-transparent w-40 text-espresso placeholder-muted/50"
        maxLength={150}
      />
      <select
        value={region}
        onChange={e => setRegion(e.target.value)}
        className="text-[11px] outline-none bg-transparent text-muted border-l border-border pl-2 cursor-pointer"
      >
        <option value="">Tutta Italia</option>
        {ITALIAN_REGIONS.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {error && (
        <span className="text-[11px] text-red-500">{error}</span>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-sienna hover:bg-sienna/90 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Bell size={11} />}
        {loading ? '' : 'OK'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null) }}
        className="text-muted/60 hover:text-muted transition-colors"
        aria-label="Chiudi"
      >
        <X size={13} />
      </button>
    </form>
  )
}
