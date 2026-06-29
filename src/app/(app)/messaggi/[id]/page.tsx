'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Send, Store, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  sender_id: string
  sender_type: 'user' | 'shop'
  body: string
  created_at: string
}

interface ConvMeta {
  id: string
  shop_id: string
  user_id: string
  shops: { name: string; image_url: string | null; city: string } | null
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

export default function ChatPage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const sbRef        = useRef(createClient())
  const supabase     = sbRef.current

  const convId  = params.id as string
  const asType  = (searchParams.get('as') ?? 'user') as 'user' | 'shop'

  const [userId,   setUserId]   = useState<string | null>(null)
  const [conv,     setConv]     = useState<ConvMeta | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)

  // Carica conversazione e messaggi
  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      if (!mounted) return
      setUserId(user.id)

      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('id, shop_id, user_id, shops(name, image_url, city), profiles(username, full_name, avatar_url)')
        .eq('id', convId)
        .single()

      if (convErr || !convData) {
        setError('Conversazione non trovata.')
        setLoading(false)
        return
      }

      // Verifica che l'utente faccia parte di questa conversazione
      const conv = convData as unknown as ConvMeta
      const shopCheck = await supabase.from('shops').select('id').eq('id', conv.shop_id).eq('owner_id', user.id).maybeSingle()
      const isMember  = conv.user_id === user.id || !!shopCheck.data
      if (!isMember) { router.push('/messaggi'); return }

      if (!mounted) return
      setConv(conv)

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, sender_type, body, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (!mounted) return
      setMessages((msgs ?? []) as Message[])
      setLoading(false)

      // Segna come letto in background
      fetch('/api/messages/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, reader_type: asType }),
      }).catch(() => {})
    }
    init()
    return () => { mounted = false }
  }, [convId, asType])

  // Realtime — nuovi messaggi
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, payload => {
        const incoming = payload.new as Message
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [convId])

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !userId || sending) return
    setSending(true)
    const body = input.trim()
    setInput('')

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, sender_id: userId, sender_type: asType, body,
      created_at: new Date().toISOString(),
    }])

    const res  = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId, body, sender_type: asType }),
    })
    const saved = await res.json()

    if (saved?.id) {
      setMessages(prev => prev.map(m => m.id === tempId ? (saved as Message) : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(body)
    }
    setSending(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-sienna" size={24} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
      <AlertCircle size={32} className="text-muted" />
      <p className="text-espresso font-semibold">{error}</p>
      <Link href="/messaggi" className="text-sienna text-sm hover:underline">← Torna ai messaggi</Link>
    </div>
  )

  const shop    = conv?.shops
  const profile = conv?.profiles
  const otherName  = asType === 'user'
    ? (shop?.name ?? 'Negozio')
    : (profile?.full_name ?? profile?.username ?? 'Utente')
  const otherImage = asType === 'user' ? shop?.image_url : profile?.avatar_url

  const grouped: { day: string; msgs: Message[] }[] = []
  for (const m of messages) {
    const day  = fmtDay(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.day === day) last.msgs.push(m)
    else grouped.push({ day, msgs: [m] })
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border flex-shrink-0">
        <Link href="/messaggi" className="text-muted hover:text-espresso transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-cream border border-border overflow-hidden flex-shrink-0">
          {otherImage
            ? <img src={otherImage} className="w-full h-full object-cover" alt={otherName} />
            : <div className="w-full h-full flex items-center justify-center"><Store size={14} className="text-muted" /></div>
          }
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-espresso truncate">{otherName}</p>
          {asType === 'user' && shop?.city && (
            <p className="text-[11px] text-muted">{shop.city}</p>
          )}
        </div>
        {asType === 'user' && conv?.shop_id && (
          <Link href={`/negozi/${conv.shop_id}`}
            className="ml-auto text-[11px] text-sienna hover:underline flex-shrink-0">
            Vai al negozio
          </Link>
        )}
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-parchment">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted text-[13px]">
            Nessun messaggio ancora. Di&apos; ciao!
          </div>
        )}
        {grouped.map(({ day, msgs }) => (
          <div key={day}>
            <div className="flex justify-center my-4">
              <span className="text-[10px] font-semibold text-muted bg-white border border-border px-3 py-1 rounded-full">
                {day}
              </span>
            </div>
            {msgs.map((m, i) => {
              const isMine   = m.sender_type === asType
              const showTime = i === msgs.length - 1 || msgs[i + 1]?.sender_type !== m.sender_type
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-0.5`}>
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      isMine
                        ? 'bg-sienna text-white rounded-br-sm'
                        : 'bg-white border border-border text-espresso rounded-bl-sm shadow-sm'
                    }`}>
                      {m.body}
                    </div>
                    {showTime && (
                      <span className="text-[9px] text-muted mt-1 px-1">{fmtTime(m.created_at)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-border flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Scrivi un messaggio..."
          className="flex-1 bg-cream border border-border rounded-xl px-4 py-2.5 text-[13px] text-espresso placeholder:text-muted focus:outline-none focus:border-sienna/50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl bg-sienna text-white flex items-center justify-center hover:bg-espresso transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}
