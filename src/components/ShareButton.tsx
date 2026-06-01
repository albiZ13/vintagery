'use client'

import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

interface Props {
  title: string
  className?: string
}

export default function ShareButton({ title, className }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      aria-label={copied ? 'Link copiato!' : `Condividi: ${title}`}
      className={`flex items-center gap-1.5 text-sm text-muted hover:text-sienna transition-colors ${className ?? ''}`}
    >
      {copied
        ? <Check size={15} className="text-green-600" aria-hidden />
        : <Share2 size={15} aria-hidden />
      }
      <span aria-live="polite">{copied ? 'Copiato!' : 'Condividi'}</span>
    </button>
  )
}
