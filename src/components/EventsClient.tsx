'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Props {
  month: number
  year: number
  asButton?: boolean
}

export default function EventsClient({ month, year, asButton = false }: Props) {
  const [status, setStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setIsAdmin(data?.role === 'admin')
    })
  }, [])

  async function sync() {
    if (status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/sync-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ month, year }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore server')
      setStatus('ok')
      setMessage(`${data.inserted ?? 0} nuovi eventi aggiunti`)
      setTimeout(() => { setStatus('idle'); window.location.reload() }, 2000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Errore sconosciuto')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  // Non mostrare nulla se non è admin
  if (!isAdmin) return null

  if (asButton) {
    return (
      <button onClick={sync} disabled={status === 'loading'}
        className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
        {status === 'loading'
          ? <><Loader2 size={15} className="animate-spin" /> Sincronizzazione...</>
          : <><RefreshCw size={15} /> Sincronizza eventi con AI</>}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {status === 'ok' && (
        <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
          <CheckCircle size={13} /> {message}
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle size={13} /> {message}
        </span>
      )}
      <button onClick={sync} disabled={status === 'loading'}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-coffee hover:border-sienna hover:text-sienna transition-colors disabled:opacity-50">
        {status === 'loading'
          ? <><Loader2 size={12} className="animate-spin" /> Sincronizzazione...</>
          : <><RefreshCw size={12} /> Sincronizza con AI</>}
      </button>
    </div>
  )
}
