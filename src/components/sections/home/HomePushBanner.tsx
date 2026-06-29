'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import PushNotificationButton from '@/components/PushNotificationButton'

export default function HomePushBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    if (sessionStorage.getItem('push_banner_dismissed')) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (!sub) setShow(true)
      })
    )
  }, [])

  function dismiss() {
    sessionStorage.setItem('push_banner_dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4">
      <div className="flex items-center gap-2 sm:gap-3 bg-espresso/5 border border-espresso/10 rounded-2xl px-3 sm:px-4 py-2.5">
        <div className="w-7 h-7 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
          <Bell size={14} className="text-gold" />
        </div>
        <p className="text-[11px] sm:text-[12px] text-espresso/70 flex-1 leading-snug min-w-0">
          Ricevi i mercatini del weekend ogni venerdì.
        </p>
        <PushNotificationButton className="shrink-0 text-[11px] whitespace-nowrap" onEnabled={dismiss} />
        <button
          onClick={dismiss}
          className="shrink-0 p-1 text-muted/40 hover:text-muted transition-colors"
          aria-label="Chiudi"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
