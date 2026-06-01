'use client'

import { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  type: 'market' | 'shop'
  targetId: string
  className?: string
}

export default function SaveButton({ type, targetId, className }: Props) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('user_favorites')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('target_type', type)
        .eq('target_id', targetId)
        .maybeSingle()
      setSaved(!!data)
      setLoading(false)
    })
  }, [type, targetId])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/auth/login?from=${encodeURIComponent(pathname)}`); return }

    const next = !saved
    setSaved(next)
    if (next) {
      await supabase.from('user_favorites').insert({ user_id: user.id, target_type: type, target_id: targetId })
    } else {
      await supabase.from('user_favorites').delete()
        .eq('user_id', user.id).eq('target_type', type).eq('target_id', targetId)
    }
  }

  if (loading) return null

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Rimuovi dai salvati' : 'Salva'}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
        saved ? 'bg-sienna text-parchment' : 'bg-white/90 text-coffee hover:bg-sienna hover:text-parchment',
        className,
      )}
    >
      <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
