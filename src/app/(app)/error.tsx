'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <AlertTriangle size={36} className="text-sienna opacity-50 mb-5" aria-hidden />
      <h2 className="font-serif text-2xl font-bold text-espresso mb-2">Errore imprevisto</h2>
      <p className="text-muted text-sm mb-8 max-w-sm">
        Non è stato possibile caricare questa pagina. Riprova o torna alla home.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 btn-primary px-5 py-2"
        >
          <RotateCcw size={14} aria-hidden /> Riprova
        </button>
        <Link href="/home" className="flex items-center gap-2 btn-outline px-5 py-2">
          <Home size={14} aria-hidden /> Home
        </Link>
      </div>
    </div>
  )
}
