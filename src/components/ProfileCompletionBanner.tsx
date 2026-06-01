'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function ProfileCompletionBanner() {
  const pathname = usePathname()
  const [show, setShow]       = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (pathname === '/impostazioni' || dismissed) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('username').eq('id', user.id).single()
        .then(({ data }) => { if (data && !data.username) setShow(true) })
    })
  }, [pathname, dismissed])

  if (!show || dismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
        <p className="text-amber-800 text-sm">
          Il tuo profilo non è ancora completo.{' '}
          <Link href="/impostazioni" className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Aggiungi username e nome →
          </Link>
        </p>
      </div>
      <button
        onClick={() => { setShow(false); setDismissed(true) }}
        aria-label="Chiudi avviso"
        className="text-amber-500 hover:text-amber-700 flex-shrink-0 p-0.5">
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}
