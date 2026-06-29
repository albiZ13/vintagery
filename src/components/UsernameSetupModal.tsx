'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AtSign, BadgeCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function UsernameSetupModal() {
  const [show, setShow]         = useState(false)
  const [userId, setUserId]     = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [status, setStatus]     = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('username').eq('id', user.id).single()
        .then(({ data }) => {
          if (data && !data.username) { setUserId(user.id); setShow(true) }
        })
    })
  }, [])

  const checkUsername = useCallback(async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    if (clean.length < 3) { setStatus('idle'); return }
    setStatus('checking')
    const { data } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle()
    setStatus(data ? 'taken' : 'ok')
  }, [])

  async function save() {
    if (!userId || status !== 'ok' || username.length < 3) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('profiles').update({ username }).eq('id', userId)
    if (err) { setError('Errore nel salvataggio. Riprova.'); setSaving(false); return }
    setShow(false)
    router.refresh()
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,32,64,0.88)', backdropFilter: 'blur(14px)' }}
    >
      <div className="w-full max-w-sm bg-parchment rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-espresso px-6 pt-7 pb-6 text-center">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={20} className="text-gold" />
          </div>
          <h2 className="font-serif font-bold text-parchment text-[21px] leading-tight mb-1">
            Scegli il tuo username
          </h2>
          <p className="text-parchment/45 text-[13px] leading-relaxed">
            È il tuo identificatore unico su Vintagery.<br />
            Gli altri utenti ti troveranno con @username.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <div className="relative">
              <AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={e => checkUsername(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save() }}
                placeholder="il_tuo_username"
                maxLength={20}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white border border-border rounded-xl pl-9 pr-9 py-3 text-[14px] text-espresso focus:outline-none focus:border-espresso/50 focus:ring-2 focus:ring-espresso/10 placeholder:text-muted/50"
              />
              {status === 'checking' && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
              {status === 'ok'       && <BadgeCheck size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-600" />}
              {status === 'taken'    && <AlertCircle size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500" />}
            </div>
            <p className="text-[11px] mt-1.5 h-4" aria-live="polite">
              {status === 'taken' && <span className="text-red-500">Username già in uso, scegline un altro</span>}
              {status === 'ok'    && <span className="text-green-600">Disponibile ✓</span>}
              {status === 'idle'  && <span className="text-muted">Min. 3 caratteri · lettere minuscole, numeri e _</span>}
            </p>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={save}
            disabled={saving || status !== 'ok' || username.length < 3}
            className="w-full py-3 rounded-xl bg-espresso text-parchment font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-sienna transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Salvataggio…</>
              : 'Continua →'
            }
          </button>

          <p className="text-[11px] text-muted/55 text-center leading-relaxed">
            Potrai cambiarlo in seguito dalle impostazioni.
          </p>
        </div>
      </div>
    </div>
  )
}
