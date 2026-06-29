'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

export default function PushNotificationButton({ className, onEnabled }: { className?: string; onEnabled?: () => void }) {
  const [supported, setSupported]   = useState(false)
  const [enabled,   setEnabled]     = useState(false)
  const [loading,   setLoading]     = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setEnabled(!!sub))
    )
  }, [])

  if (!supported) return null

  async function toggle() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      if (enabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setEnabled(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') { setLoading(false); return }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const json = sub.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        })
        setEnabled(true)
        onEnabled?.()
      }
    } catch {}
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enabled ? 'Disattiva notifiche push' : 'Attiva notifiche push weekend'}
      className={cn(
        'flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors',
        enabled
          ? 'bg-gold/10 text-gold hover:bg-gold/20'
          : 'text-muted hover:text-espresso hover:bg-cream',
        className,
      )}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : enabled
          ? <Bell size={14} className="text-gold" />
          : <BellOff size={14} />
      }
      {enabled ? 'Notifiche attive' : 'Attiva notifiche'}
    </button>
  )
}
