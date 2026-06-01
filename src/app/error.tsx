'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In produzione si potrebbe loggare su Sentry/etc
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="it">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-parchment">
          <AlertTriangle size={40} className="text-sienna opacity-60 mb-6" aria-hidden />
          <h1 className="font-serif text-2xl font-bold text-espresso mb-2">Qualcosa è andato storto</h1>
          <p className="text-muted text-sm mb-8 max-w-sm">
            Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-espresso text-parchment px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-espresso/90 transition-colors"
          >
            <RotateCcw size={15} aria-hidden /> Riprova
          </button>
        </div>
      </body>
    </html>
  )
}
