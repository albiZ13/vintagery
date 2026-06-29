'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa-dismissed')) return
    // Non mostrare se già installata
    if (window.matchMedia('(display-mode: standalone)').matches) return

    function handler(e: Event) {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDismissed(true)
    }
  }

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-espresso text-parchment rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gold/20">
      <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
        <Download size={18} className="text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight">Aggiungi Vintagery</p>
        <p className="text-[11px] text-parchment/60 mt-0.5">Accesso rapido dal telefono</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={install}
          className="text-[11px] font-semibold bg-gold text-espresso px-3 py-1.5 rounded-lg hover:bg-gold/90 transition-colors"
        >
          Installa
        </button>
        <button onClick={dismiss} className="text-parchment/50 hover:text-parchment transition-colors">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
