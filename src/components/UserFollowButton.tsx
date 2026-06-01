'use client'

import { useState, useEffect } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

interface Props {
  targetUserId: string
  initialFollowing?: boolean
  initialCount?: number
}

export default function UserFollowButton({ targetUserId, initialFollowing = false, initialCount = 0 }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount]         = useState(initialCount)
  const [hover, setHover]         = useState(false)
  const [myId, setMyId]           = useState<string | null>(null)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setMyId(user.id)
      const { data } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()
      setFollowing(!!data)
    })
  }, [targetUserId])

  async function toggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/auth/login?from=${encodeURIComponent(pathname)}`); return }
    if (user.id === targetUserId) return

    const next = !following
    setFollowing(next)
    setCount(c => next ? c + 1 : Math.max(c - 1, 0))

    if (next) {
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: targetUserId })
    } else {
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
    }
  }

  if (myId === targetUserId) return null

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
        following
          ? hover
            ? 'bg-red-50 text-red-500 border-red-200'
            : 'bg-cream text-coffee border-border'
          : 'bg-espresso text-parchment border-espresso hover:bg-coffee'
      }`}
    >
      {following
        ? <><UserCheck size={15} />{hover ? 'Smetti di seguire' : 'Seguendo'}</>
        : <><UserPlus size={15} />Segui</>
      }
    </button>
  )
}
