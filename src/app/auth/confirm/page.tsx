'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MapPin, Loader2, BadgeCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function ConfirmContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function confirm() {
      const supabase = createClient()

      const tokenHash = searchParams.get('token_hash')
      const type      = searchParams.get('type') as 'signup' | 'email' | null
      const code      = searchParams.get('code')

      try {
        let session = null

        if (code) {
          // PKCE flow (Next.js default)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          session = data.session
        } else if (tokenHash && type) {
          // Token hash flow
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) throw error
          session = data.session
        } else {
          // Leggi la sessione attiva (può già essere stata impostata dal link magico)
          const { data } = await supabase.auth.getSession()
          session = data.session
        }

        if (!session) {
          setStatus('error')
          setMessage('Link non valido o scaduto. Richiedi un nuovo codice.')
          return
        }

        // Applica profilo pendente da sessionStorage
        const raw = sessionStorage.getItem('vintagery_pending_profile')
        if (raw) {
          const p = JSON.parse(raw)
          sessionStorage.removeItem('vintagery_pending_profile')
          await supabase.from('profiles').update({
            username:              p.username,
            first_name:            p.firstName,
            last_name:             p.lastName,
            full_name:             `${p.firstName} ${p.lastName}`,
            bio:                   p.bio,
            role:                  p.role === 'shop' ? 'shop_owner' : 'user',
            newsletter_subscribed: p.newsletter,
            newsletter_region:     p.newsletterRegion,
          }).eq('id', session.user.id)

          if (p.shop) {
            await supabase.from('shops').insert({
              owner_id:     session.user.id,
              name:         p.shop.shopName,
              city:         p.shop.city,
              region:       p.shop.region,
              address:      p.shop.city,
              vat_number:   p.shop.vatNumber,
              vat_verified: p.shop.vatVerified,
              vat_status:   p.shop.vatStatus,
              vat_name:     p.shop.vatName,
            })
          }
        }

        setStatus('ok')
        setMessage('Email verificata! Benvenuto su Vintagery.')
        setTimeout(() => router.push('/home'), 2000)

      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Errore durante la verifica. Riprova.')
      }
    }

    confirm()
  }, [])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white border border-border rounded-xl p-10 shadow-soft max-w-sm w-full text-center">
        <div className="flex items-center justify-center gap-2 font-serif font-bold text-espresso text-xl mb-8">
          <MapPin size={18} className="text-sienna" /> Vintagery
        </div>

        {status === 'loading' && (
          <>
            <Loader2 size={36} className="text-sienna animate-spin mx-auto mb-4" />
            <p className="text-muted text-sm">Verifica email in corso...</p>
          </>
        )}

        {status === 'ok' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BadgeCheck size={32} className="text-green-600" />
            </div>
            <h2 className="font-serif text-xl font-bold text-espresso mb-2">Email verificata!</h2>
            <p className="text-muted text-sm mb-6">{message}</p>
            <p className="text-muted text-xs">Reindirizzamento in corso...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="font-serif text-xl font-bold text-espresso mb-2">Link non valido</h2>
            <p className="text-muted text-sm mb-6">{message}</p>
            <Link href="/auth/register" className="btn-primary inline-block text-sm px-6 py-2.5">
              Registrati di nuovo
            </Link>
            <p className="mt-3">
              <Link href="/auth/login" className="text-sienna text-sm hover:underline">Accedi</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={24} className="text-sienna animate-spin" /></div>}>
      <ConfirmContent />
    </Suspense>
  )
}
