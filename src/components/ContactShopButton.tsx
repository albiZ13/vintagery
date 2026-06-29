'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ContactShopButton({ shopId, shopOwnerId }: {
  shopId: string
  shopOwnerId?: string
}) {
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'error'>('idle')
  const [error,   setError]   = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [authed,  setAuthed]  = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user)
      if (user && shopOwnerId && user.id === shopOwnerId) setIsOwner(true)
    })
  }, [shopOwnerId])

  if (isOwner) return null

  if (authed === null) return (
    <button disabled className="inline-flex items-center gap-2 border border-border text-muted font-semibold px-4 py-2 rounded-xl text-[13px] opacity-50">
      <MessageCircle size={14} /> Scrivi
    </button>
  )

  if (!authed) return (
    <Link href={`/auth/login?from=/negozi/${shopId}`}
      className="inline-flex items-center gap-2 border border-border text-espresso font-semibold px-4 py-2 rounded-xl text-[13px] hover:border-sienna/40 hover:text-sienna transition-all">
      <LogIn size={14} /> Accedi per scrivere
    </Link>
  )

  async function startConversation() {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Errore. Riprova.')
        setStatus('error')
        return
      }
      if (data?.id) {
        router.push(`/messaggi/${data.id}?as=user`)
      } else {
        setError('Impossibile aprire la conversazione.')
        setStatus('error')
      }
    } catch {
      setError('Errore di rete. Riprova.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={startConversation}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 border border-border text-espresso font-semibold px-4 py-2 rounded-xl text-[13px] hover:border-sienna/40 hover:text-sienna transition-all disabled:opacity-60"
      >
        {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
        Scrivi
      </button>
      {error && <p className="text-[11px] text-red-500 text-right max-w-[160px]">{error}</p>}
    </div>
  )
}
