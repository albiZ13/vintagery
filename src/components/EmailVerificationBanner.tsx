'use client'

import { useState } from 'react'
import { BadgeCheck, X, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function EmailVerificationBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false)
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)

  if (dismissed) return null

  async function sendVerification() {
    setSending(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?verify=1`,
      },
    })
    setSending(false)
    setSent(true)
  }

  return (
    <div className="bg-gold/10 border-b border-gold/25 px-4 py-2.5 flex items-center gap-3">
      <BadgeCheck size={15} className="text-gold flex-shrink-0" />
      <p className="text-[13px] text-espresso flex-1">
        <span className="font-semibold">Verifica la tua email</span> per ottenere il badge verificato e sbloccare tutte le funzioni.
      </p>

      {sent ? (
        <span className="flex items-center gap-1.5 text-[12px] text-green-700 font-medium flex-shrink-0">
          <CheckCircle2 size={13} /> Email inviata
        </span>
      ) : (
        <button onClick={sendVerification} disabled={sending}
          className="text-[12px] font-semibold text-espresso underline underline-offset-2 hover:text-sienna transition-colors flex-shrink-0 disabled:opacity-50 flex items-center gap-1">
          {sending && <Loader2 size={11} className="animate-spin" />}
          {sending ? 'Invio…' : 'Invia email'}
        </button>
      )}

      <button onClick={() => setDismissed(true)} aria-label="Chiudi" className="text-muted/50 hover:text-muted transition-colors flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
