'use client'

import { useState } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

interface Props {
  shopId: string
  initialFollowing?: boolean
  onToggle?: (following: boolean) => void
}

export default function FollowButton({ shopId, initialFollowing = false, onToggle }: Props) {
  const supabase  = createClient()
  const router    = useRouter()
  const pathname  = usePathname()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading,   setLoading]   = useState(false)

  async function toggle() {
    if (loading) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/auth/login?from=${encodeURIComponent(pathname)}`); return }

    setLoading(true)
    if (following) {
      await supabase.from('shop_follows').delete().match({ user_id: user.id, shop_id: shopId })
      setFollowing(false); onToggle?.(false)
    } else {
      await supabase.from('shop_follows').insert({ user_id: user.id, shop_id: shopId })
      setFollowing(true); onToggle?.(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 text-body-sm font-medium px-4 py-2 rounded transition-colors',
        following
          ? 'bg-cream border border-border text-coffee hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          : 'bg-sienna text-parchment hover:bg-coffee',
      )}
    >
      {following
        ? <><UserCheck size={14} /> Seguendo</>
        : <><UserPlus size={14} /> Segui</>}
    </button>
  )
}
