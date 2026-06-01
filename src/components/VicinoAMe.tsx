'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Props {
  currentRegion: string
  month: number
  year: number
  type: string
}

export default function VicinoAMe({ currentRegion, month, year, type }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userRegion, setUserRegion] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setChecked(true); return }
      const { data } = await supabase
        .from('profiles')
        .select('region')
        .eq('id', user.id)
        .single()
      setUserRegion(data?.region ?? null)
      setChecked(true)
    })
  }, [])

  if (!checked) return null

  // Already filtered by user's region
  if (userRegion && currentRegion === userRegion) return null

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login?redirect=/mercatini')
      return
    }

    if (!userRegion) {
      router.push('/impostazioni?tab=region')
      return
    }

    router.push(`/mercatini?month=${month}&year=${year}&type=${type}&region=${encodeURIComponent(userRegion)}`)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-sienna/40 text-sienna bg-sienna/5 hover:bg-sienna/10 transition-colors disabled:opacity-50"
    >
      {loading
        ? <Loader2 size={12} className="animate-spin" />
        : <MapPin size={12} />
      }
      {userRegion ? `Solo ${userRegion}` : 'Vicino a me'}
    </button>
  )
}
