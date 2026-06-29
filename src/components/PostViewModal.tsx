'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Trash2, Loader2, Calendar, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { UserPost } from './NewPostModal'
import LikeButton from './LikeButton'

const THOUGHT_PALETTES = [
  ['#1c2e4a', '#f0ebe0'],
  ['#B53A1E', '#fdfbf7'],
  ['#4a3728', '#f5f0e8'],
  ['#2d4a3e', '#f0f5f0'],
  ['#1a1a2e', '#e8e4f0'],
]

function parsePalette(caption: string | null): { palette: number; text: string } {
  if (!caption) return { palette: 0, text: '' }
  const m = caption.match(/^__palette:(\d+)__([\s\S]*)$/)
  if (m) return { palette: Number(m[1]) % THOUGHT_PALETTES.length, text: m[2] }
  return { palette: 0, text: caption }
}

interface Props {
  post: UserPost
  isOwn: boolean
  username: string
  avatarUrl: string | null
  displayName: string
  initials: string
  color: string
  onClose: () => void
  onDeleted: (postId: string) => void
}

export default function PostViewModal({
  post, isOwn, username, avatarUrl, displayName, initials, color, onClose, onDeleted,
}: Props) {
  const [deleting, setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const supabase = createClient()

  async function deletePost() {
    setDeleting(true)
    // elimina media da storage
    if (post.image_url || post.video_url) {
      const url   = post.image_url ?? post.video_url ?? ''
      const match = url.match(/user-posts\/(.+)$/)
      if (match) await supabase.storage.from('user-posts').remove([match[1]])
    }
    await supabase.from('user_posts').delete().eq('id', post.id)
    setDeleting(false)
    onDeleted(post.id)
  }

  const isThought = post.type === 'thought'
  const isVideo   = post.type === 'video'
  const { palette, text: thoughtText } = parsePalette(isThought ? post.caption : null)
  const [bgColor, fgColor] = THOUGHT_PALETTES[palette]
  const displayCaption = isThought ? thoughtText : post.caption

  const dateStr = new Date(post.created_at).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,32,64,0.80)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-3xl sm:max-h-[90vh] bg-parchment rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-2xl">

        {/* ── Media panel ── */}
        <div className="relative sm:w-[55%] flex-shrink-0 bg-espresso overflow-hidden"
          style={{ minHeight: isThought ? '220px' : '300px' }}>
          {isThought && (
            <div className="w-full h-full flex items-center justify-center p-10" style={{ background: bgColor, minHeight: '220px' }}>
              <p className="font-serif text-center text-[20px] leading-snug font-semibold" style={{ color: fgColor }}>
                {thoughtText || '…'}
              </p>
            </div>
          )}
          {!isThought && post.image_url && (
            <Image src={post.image_url} alt={displayCaption ?? 'Post'} fill className="object-cover" />
          )}
          {isVideo && post.video_url && (
            <video src={post.video_url} controls className="w-full h-full object-cover" />
          )}
          {isThought && (
            <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <FileText size={14} style={{ color: fgColor }} />
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white">
            <Link href={`/profilo/${username}`} className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-border">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={32} height={32} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-sm" style={{ background: color }}>
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-espresso group-hover:text-sienna transition-colors truncate">{displayName}</p>
                <p className="text-[11px] text-muted truncate">@{username}</p>
              </div>
            </Link>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center transition-colors flex-shrink-0">
              <X size={16} className="text-muted" />
            </button>
          </div>

          {/* Caption */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {displayCaption && !isThought && (
              <p className="text-[14px] text-coffee leading-relaxed mb-4">{displayCaption}</p>
            )}
            <div className="flex items-center gap-4 text-[12px] text-muted">
              <LikeButton
                table="post_likes"
                idField="post_id"
                targetId={post.id}
                initialCount={post.likes_count}
              />
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {dateStr}
              </span>
            </div>
          </div>

          {/* Delete (solo isOwn) */}
          {isOwn && (
            <div className="px-4 py-3 border-t border-border bg-white">
              {!confirmDel ? (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="flex items-center gap-1.5 text-[12px] text-muted hover:text-rust transition-colors"
                >
                  <Trash2 size={12} /> Elimina post
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-[12px] text-espresso flex-1">Eliminare definitivamente?</p>
                  <button onClick={() => setConfirmDel(false)} className="text-[12px] text-muted hover:text-espresso">Annulla</button>
                  <button
                    onClick={deletePost}
                    disabled={deleting}
                    className="flex items-center gap-1 text-[12px] font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Elimina
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
