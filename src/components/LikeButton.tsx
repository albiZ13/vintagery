'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

interface Props {
  table: 'post_likes' | 'review_likes' | 'purchase_likes'
  idField: 'post_id' | 'review_id' | 'purchase_id'
  targetId: string
  initialCount: number
  initialLiked?: boolean
}

export default function LikeButton({ table, idField, targetId, initialCount, initialLiked = false }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const pathname = usePathname()
  const [liked, setLiked]   = useState(initialLiked)
  const [count, setCount]   = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/auth/login?from=${encodeURIComponent(pathname)}`); return }

    setLoading(true)
    if (liked) {
      await supabase.from(table).delete().match({ user_id: user.id, [idField]: targetId })
      setLiked(false); setCount(c => c - 1)
    } else {
      await supabase.from(table).insert({ user_id: user.id, [idField]: targetId })
      setLiked(true); setCount(c => c + 1)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 text-caption transition-colors',
        liked ? 'text-red-500' : 'text-muted hover:text-red-400',
      )}
      aria-label={liked ? 'Rimuovi like' : 'Metti like'}
    >
      <Heart size={14} className={cn(liked && 'fill-current')} />
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
