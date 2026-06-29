'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, ChevronDown, ChevronUp, Send, Loader2, CornerDownRight, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn, avatarColor } from '@/lib/utils'

interface CommentAuthor {
  username: string | null
  first_name: string | null
  avatar_url: string | null
}

interface Comment {
  id: string
  user_id: string
  parent_id: string | null
  body: string
  likes_count: number
  created_at: string
  profiles: CommentAuthor
  liked_by_me: boolean
}

export interface ProfileReview {
  id: string
  rating: number
  title?: string | null
  body?: string | null
  created_at: string
  target_type: string
  target_id: string
  comment_count?: number
  likes_count?: number
  images?: string[] | null
  markets?: { name: string; city: string } | null
  shops?: { name: string; city: string } | null
}

interface Props {
  review: ProfileReview
  currentUserId?: string | null
}

import { HalfStars } from '@/components/NewReviewModal'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Bubble({ name, avatarUrl, color }: { name: string; avatarUrl?: string | null; color: string }) {
  return avatarUrl
    ? <Image src={avatarUrl} alt={name} width={24} height={24} className="rounded-full object-cover w-6 h-6 flex-shrink-0" />
    : <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold" style={{ background: color }}>{(name[0] ?? '?').toUpperCase()}</div>
}

function CommentRow({
  comment, depth = 0, currentUserId, onLike, onReply,
}: {
  comment: Comment
  depth?: number
  currentUserId: string | null | undefined
  onLike: (id: string, liked: boolean) => void
  onReply: (id: string, username: string) => void
}) {
  const name  = comment.profiles.first_name ?? comment.profiles.username ?? 'Utente'
  const color = avatarColor(comment.profiles.username ?? comment.user_id)

  return (
    <div className={cn('flex gap-2', depth > 0 && 'ml-7 mt-2')}>
      {depth > 0 && <CornerDownRight size={11} className="text-border flex-shrink-0 mt-2.5" />}
      <Bubble name={name} avatarUrl={comment.profiles.avatar_url} color={color} />
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-border/60 rounded-2xl rounded-tl-sm px-3 py-2">
          <Link
            href={comment.profiles.username ? `/profilo/${comment.profiles.username}` : '#'}
            className="text-[11px] font-bold text-espresso hover:text-sienna transition-colors"
          >
            {name}
          </Link>
          <p className="text-[13px] text-coffee leading-snug mt-0.5 break-words">{comment.body}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 ml-2">
          <span className="text-[10px] text-muted">{fmtDate(comment.created_at)}</span>
          {currentUserId && (
            <button
              onClick={() => onReply(comment.id, comment.profiles.username ?? name)}
              className="text-[10px] font-bold text-muted hover:text-sienna transition-colors"
            >
              Rispondi
            </button>
          )}
          <button
            onClick={() => onLike(comment.id, comment.liked_by_me)}
            disabled={!currentUserId}
            className={cn(
              'flex items-center gap-1 text-[10px] font-bold transition-colors',
              comment.liked_by_me ? 'text-sienna' : 'text-muted hover:text-sienna',
              !currentUserId && 'cursor-default'
            )}
          >
            <Heart size={10} className={comment.liked_by_me ? 'fill-current' : ''} />
            {comment.likes_count > 0 && comment.likes_count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileReviewCard({ review, currentUserId }: Props) {
  const sbRef    = useRef(createClient())
  const supabase = sbRef.current

  const [expanded,         setExpanded]         = useState(false)
  const [comments,         setComments]         = useState<Comment[]>([])
  const [loadingComments,  setLoadingComments]  = useState(false)
  const [commentText,      setCommentText]      = useState('')
  const [replyTo,          setReplyTo]          = useState<{ id: string; username: string } | null>(null)
  const [posting,          setPosting]          = useState(false)
  const [showFull,         setShowFull]         = useState(false)
  const [reviewLiked,      setReviewLiked]      = useState(false)
  const [reviewLikes,      setReviewLikes]      = useState(review.likes_count ?? 0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!currentUserId) return
    supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', review.id)
      .eq('user_id', currentUserId)
      .maybeSingle()
      .then(({ data }) => setReviewLiked(!!data))
  }, [currentUserId, review.id])

  async function toggleReviewLike() {
    if (!currentUserId) return
    if (reviewLiked) {
      setReviewLiked(false)
      setReviewLikes(l => l - 1)
      await supabase.from('review_likes').delete().eq('review_id', review.id).eq('user_id', currentUserId)
    } else {
      setReviewLiked(true)
      setReviewLikes(l => l + 1)
      await supabase.from('review_likes').insert({ review_id: review.id, user_id: currentUserId })
    }
  }

  const target     = review.markets ?? review.shops
  const targetPath = review.target_type === 'market' ? `/mercatini/${review.target_id}` : `/negozi/${review.target_id}`
  const targetTag  = review.target_type === 'market' ? 'Mercatino' : 'Negozio'

  const body      = review.body ?? ''
  const isLong    = body.length > 220
  const bodyShown = isLong && !showFull ? body.slice(0, 220) + '…' : body

  const commentCount = review.comment_count ?? 0

  async function loadComments() {
    setLoadingComments(true)
    const { data } = await supabase
      .from('review_comments')
      .select('*, profiles(username, first_name, avatar_url)')
      .eq('review_id', review.id)
      .order('created_at', { ascending: true })

    if (data) {
      let rows = data as Comment[]
      if (currentUserId) {
        const ids = data.map(c => c.id)
        const { data: likes } = await supabase
          .from('comment_likes').select('comment_id')
          .eq('user_id', currentUserId).in('comment_id', ids)
        const likedSet = new Set((likes ?? []).map(l => l.comment_id))
        rows = data.map(c => ({ ...c, liked_by_me: likedSet.has(c.id) }))
      }
      setComments(rows)
    }
    setLoadingComments(false)
  }

  function toggleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next && comments.length === 0) loadComments()
  }

  async function toggleLike(commentId: string, liked: boolean) {
    if (!currentUserId) return
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, liked_by_me: !liked, likes_count: liked ? c.likes_count - 1 : c.likes_count + 1 }
        : c
    ))
    if (liked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
    }
  }

  function startReply(id: string, username: string) {
    setReplyTo({ id, username })
    setCommentText(`@${username} `)
    inputRef.current?.focus()
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !commentText.trim() || posting) return
    setPosting(true)
    const { data: nc } = await supabase
      .from('review_comments')
      .insert({ review_id: review.id, user_id: currentUserId, parent_id: replyTo?.id ?? null, body: commentText.trim() })
      .select('*, profiles(username, first_name, avatar_url)')
      .single()

    if (nc) setComments(prev => [...prev, { ...(nc as Comment), liked_by_me: false }])
    setCommentText('')
    setReplyTo(null)
    setPosting(false)
  }

  const topLevel = comments.filter(c => !c.parent_id)
  const repliesOf = (id: string) => comments.filter(c => c.parent_id === id)

  return (
    <article className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="p-4">

        {/* Rating row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <HalfStars rating={review.rating} />
          <span className="text-[11px] text-muted flex-shrink-0">{fmtDate(review.created_at)}</span>
        </div>

        {/* Target link */}
        {target && (
          <Link href={targetPath} className="inline-flex items-center gap-1.5 mb-2.5 group">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted/60 group-hover:text-sienna/60 transition-colors">{targetTag}</span>
            <span className="text-[13px] font-semibold text-sienna group-hover:underline">{target.name}</span>
            <span className="text-[12px] text-muted">· {target.city}</span>
          </Link>
        )}

        {/* Title */}
        {review.title && (
          <p className="font-serif font-semibold text-espresso text-[15px] leading-snug mb-1.5">{review.title}</p>
        )}

        {/* Body */}
        {body && (
          <>
            <p className="text-[14px] leading-relaxed text-coffee">{bodyShown}</p>
            {isLong && (
              <button onClick={() => setShowFull(v => !v)} className="text-[12px] font-semibold text-sienna hover:underline mt-1">
                {showFull ? 'Meno' : 'Leggi tutto'}
              </button>
            )}
          </>
        )}

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <div className={cn('mt-3 grid gap-1', review.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {review.images.slice(0, 4).map((url, i) => {
              const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url)
              return (
                <div key={url} className={cn('relative rounded-xl overflow-hidden bg-cream', review.images!.length === 1 ? 'aspect-[4/3]' : 'aspect-square')}>
                  {isVideo
                    ? <video src={url} className="w-full h-full object-cover" muted playsInline controls={review.images!.length === 1} />
                    : <Image src={url} alt="" fill className="object-cover" sizes="(max-width:640px) 50vw, 280px" />
                  }
                  {isVideo && review.images!.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Play size={20} className="text-white drop-shadow" fill="white" />
                    </div>
                  )}
                  {i === 3 && review.images!.length > 4 && (
                    <div className="absolute inset-0 bg-espresso/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{review.images!.length - 4}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border/50">
          <button
            onClick={toggleExpand}
            className={cn('flex items-center gap-1.5 text-[12px] font-semibold transition-colors', expanded ? 'text-sienna' : 'text-muted hover:text-espresso')}
          >
            <MessageCircle size={14} />
            <span>{commentCount > 0 ? commentCount : ''} {expanded ? 'Chiudi' : 'Commenti'}</span>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          <button
            onClick={toggleReviewLike}
            disabled={!currentUserId}
            className={cn(
              'flex items-center gap-1 text-[12px] font-semibold transition-colors',
              reviewLiked ? 'text-sienna' : 'text-muted hover:text-sienna',
              !currentUserId && 'cursor-default'
            )}
          >
            <Heart size={13} className={reviewLiked ? 'fill-current' : ''} />
            {reviewLikes > 0 && reviewLikes}
          </button>
        </div>
      </div>

      {/* Comments */}
      {expanded && (
        <div className="border-t border-border/60 bg-cream/30 px-4 py-4 space-y-3">

          {loadingComments && (
            <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-muted" /></div>
          )}

          {!loadingComments && comments.length === 0 && (
            <p className="text-[12px] text-muted text-center py-2">Nessun commento. Sii il primo.</p>
          )}

          {!loadingComments && topLevel.map(c => (
            <div key={c.id}>
              <CommentRow comment={c} currentUserId={currentUserId} onLike={toggleLike} onReply={startReply} />
              {repliesOf(c.id).map(r => (
                <CommentRow key={r.id} comment={r} depth={1} currentUserId={currentUserId} onLike={toggleLike} onReply={startReply} />
              ))}
            </div>
          ))}

          {/* Input */}
          {currentUserId ? (
            <form onSubmit={submitComment} className="flex items-center gap-2 pt-1">
              {replyTo && (
                <button type="button" onClick={() => { setReplyTo(null); setCommentText('') }}
                  className="text-[10px] font-bold text-sienna flex-shrink-0 hover:underline whitespace-nowrap">
                  ↩ @{replyTo.username} ×
                </button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={replyTo ? `Rispondi a @${replyTo.username}…` : 'Aggiungi un commento…'}
                maxLength={500}
                className="flex-1 bg-white border border-border rounded-full px-4 py-2 text-[13px] text-espresso placeholder:text-muted focus:outline-none focus:border-sienna/40 focus:ring-2 focus:ring-sienna/10 min-w-0"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || posting}
                className="flex-shrink-0 w-8 h-8 bg-espresso text-parchment rounded-full flex items-center justify-center hover:bg-sienna transition-colors disabled:opacity-40"
              >
                {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </form>
          ) : (
            <p className="text-[12px] text-muted text-center pt-1">
              <Link href="/auth/login" className="text-sienna font-semibold hover:underline">Accedi</Link> per commentare.
            </p>
          )}
        </div>
      )}
    </article>
  )
}
