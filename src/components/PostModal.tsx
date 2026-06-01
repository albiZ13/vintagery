'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, Tag } from 'lucide-react'
import type { ShopPost } from '@/types'
import { formatDate } from '@/lib/utils'
import LikeButton from './LikeButton'

interface Props {
  post: ShopPost | null
  onClose: () => void
}

export default function PostModal({ post, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!post) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-espresso/70 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={ref} className="bg-white rounded-xl overflow-hidden max-w-2xl w-full flex flex-col sm:flex-row max-h-[90vh]">
        {/* Immagine */}
        <div className="relative sm:w-1/2 aspect-square flex-shrink-0 bg-cream">
          <Image src={post.image_url} alt={post.caption ?? 'Post'} fill className="object-cover" />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-caption text-muted">{formatDate(post.created_at)}</p>
            <button onClick={onClose} className="text-muted hover:text-espresso">
              <X size={18} />
            </button>
          </div>

          {post.caption && (
            <p className="text-body text-coffee leading-relaxed mb-4">{post.caption}</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {post.tags.map(t => (
                <span key={t} className="text-[11px] px-2 py-0.5 bg-cream border border-border rounded-pill text-coffee">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border">
            <LikeButton
              table="post_likes"
              idField="post_id"
              targetId={post.id}
              initialCount={post.likes_count}
            />
            {post.price && (
              <span className="text-body-sm font-semibold text-sienna ml-auto">
                €{post.price}
                {post.sold && <span className="text-muted font-normal ml-2">(Venduto)</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
