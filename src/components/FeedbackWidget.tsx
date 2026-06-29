'use client'

import { useState } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Props {
  userId: string
}

export default function FeedbackWidget({ userId }: Props) {
  const [open,    setOpen]    = useState(false)
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSend() {
    if (body.trim().length < 5) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('site_feedback').insert({ user_id: userId, body: body.trim() })
    setSending(false)
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setBody('')
      setOpen(false)
    }, 2500)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Invia feedback"
        className={cn(
          'fixed bottom-6 right-5 z-40 w-11 h-11 rounded-full bg-espresso text-parchment shadow-lg',
          'flex items-center justify-center transition-all duration-200',
          'hover:bg-sienna hover:scale-105 active:scale-95',
          open && 'opacity-0 pointer-events-none',
        )}
      >
        <MessageSquarePlus size={18} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div className={cn(
        'fixed bottom-6 right-5 z-50 w-80 bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,32,64,0.18)] border border-border/60',
        'transition-all duration-200 origin-bottom-right',
        open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none',
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border/40">
          <div>
            <p className="font-serif font-bold text-espresso text-[15px] leading-tight">Feedback</p>
            <p className="text-[12px] text-muted mt-0.5">Segnala un problema o suggerisci una miglioria.</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-muted/50 hover:text-espresso hover:bg-cream rounded-lg transition-colors -mr-1 -mt-0.5"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {sent ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <CheckCircle size={28} className="text-emerald-500" />
              <p className="text-[13px] font-semibold text-espresso">Messaggio inviato.</p>
              <p className="text-[12px] text-muted">Grazie per il feedback.</p>
            </div>
          ) : (
            <>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Scrivi qui…"
                rows={4}
                className="w-full text-[13px] text-espresso placeholder:text-muted/50 bg-cream/60 border border-border/60 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/30 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={body.trim().length < 5 || sending}
                className="mt-2.5 w-full flex items-center justify-center gap-2 text-[13px] font-semibold bg-espresso text-parchment rounded-xl py-2.5 hover:bg-sienna transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Invia
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
