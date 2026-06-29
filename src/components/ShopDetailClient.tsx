'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MessageCircle, Heart, PenLine, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import NewReviewModal, { HalfStars } from '@/components/NewReviewModal'
import TrustBadge from '@/components/TrustBadge'
import { avatarColor, cn } from '@/lib/utils'
import type { TrustTier } from '@/types'

interface ReviewProfile {
  username: string | null
  full_name: string | null
  avatar_url: string | null
  trust_tier: string | null
  trust_score: number | null
}

export interface ShopReview {
  id: string
  user_id: string
  rating: number
  title: string | null
  body: string | null
  images: string[] | null
  likes_count: number
  comment_count: number
  created_at: string
  profiles: ReviewProfile | ReviewProfile[] | null
}

interface Props {
  shopId: string
  shopName: string
  shopCity: string
  initialReviews: ShopReview[]
  currentUserId: string | null
}


function ReviewCard({ review, currentUserId }: { review: ShopReview; currentUserId: string | null }) {
  const sbRef   = useRef(createClient())
  const [expanded,    setExpanded]    = useState(false)
  const [liked,       setLiked]       = useState(false)
  const [likesCount,  setLikesCount]  = useState(review.likes_count)
  const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles
  const name    = profile?.full_name ?? profile?.username ?? 'Utente'
  const color   = avatarColor(profile?.username ?? review.user_id)
  const initial = name[0]?.toUpperCase() ?? 'U'
  const href    = profile?.username ? `/profilo/${profile.username}` : null

  useEffect(() => {
    if (!currentUserId) return
    sbRef.current
      .from('review_likes').select('user_id')
      .eq('review_id', review.id).eq('user_id', currentUserId)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [currentUserId, review.id])

  async function toggleLike() {
    if (!currentUserId) return
    const sb = sbRef.current
    if (liked) {
      setLiked(false); setLikesCount(l => l - 1)
      await sb.from('review_likes').delete().eq('review_id', review.id).eq('user_id', currentUserId)
    } else {
      setLiked(true); setLikesCount(l => l + 1)
      await sb.from('review_likes').insert({ review_id: review.id, user_id: currentUserId })
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        {href
          ? <Link href={href} className="flex-shrink-0">
              <Avatar profile={profile} name={name} color={color} initial={initial} />
            </Link>
          : <div className="flex-shrink-0"><Avatar profile={profile} name={name} color={color} initial={initial} /></div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {href
              ? <Link href={href} className="text-[13px] font-semibold text-espresso hover:text-sienna transition-colors">{name}</Link>
              : <span className="text-[13px] font-semibold text-espresso">{name}</span>
            }
            {profile?.trust_tier && profile.trust_tier !== 'nuovo' && (
              <TrustBadge tier={profile.trust_tier as TrustTier} size="sm" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <HalfStars rating={review.rating} />
            <span className="text-[10px] text-muted">
              {new Date(review.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {review.title && (
        <p className="text-[14px] font-semibold text-espresso">{review.title}</p>
      )}

      {review.body && (
        <p className="text-[13px] text-coffee leading-relaxed">
          {!expanded && review.body.length > 220
            ? <>{review.body.slice(0, 220)}&hellip;{' '}
                <button onClick={() => setExpanded(true)} className="text-sienna font-medium hover:underline">Leggi tutto</button>
              </>
            : review.body
          }
        </p>
      )}

      {review.images && review.images.length > 0 && (
        <div className={`grid gap-1 rounded-xl overflow-hidden ${review.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {review.images.slice(0, 4).map((url, i) => {
            const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url)
            return (
              <div key={i} className={`relative bg-cream ${review.images!.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                {isVideo
                  ? <video src={url} className="w-full h-full object-cover" muted playsInline controls={review.images!.length === 1} />
                  : <Image src={url} alt="" fill className="object-cover" sizes="300px" />
                }
                {isVideo && review.images!.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Play size={20} className="text-white drop-shadow" fill="white" />
                  </div>
                )}
                {i === 3 && review.images!.length > 4 && (
                  <div className="absolute inset-0 bg-espresso/50 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">+{review.images!.length - 4}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-4 pt-1 text-[12px] text-muted border-t border-border/40">
        <span className="flex items-center gap-1.5">
          <MessageCircle size={13} />
          {review.comment_count > 0 ? review.comment_count : 'Commenta'}
        </span>
        <button
          onClick={toggleLike}
          disabled={!currentUserId}
          className={cn(
            'flex items-center gap-1.5 font-semibold transition-colors',
            liked ? 'text-sienna' : 'text-muted hover:text-sienna',
            !currentUserId && 'cursor-default'
          )}
        >
          <Heart size={13} className={liked ? 'fill-current' : ''} />
          {likesCount > 0 ? likesCount : 'Utile'}
        </button>
      </div>
    </div>
  )
}

function Avatar({ profile, name, color, initial }: { profile: ReviewProfile | null; name: string; color: string; initial: string }) {
  return (
    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
      {profile?.avatar_url
        ? <Image src={profile.avatar_url} alt={name} width={36} height={36} className="object-cover w-full h-full" />
        : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>{initial}</div>
      }
    </div>
  )
}

export default function ShopDetailClient({ shopId, shopName, shopCity, initialReviews, currentUserId }: Props) {
  const [reviews,   setReviews]   = useState<ShopReview[]>(initialReviews)
  const [showModal, setShowModal] = useState(false)

  const prefilledTarget = { id: shopId, name: shopName, city: shopCity, type: 'shop' as const }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-serif font-semibold text-espresso text-[19px]">Recensioni</h2>
          <p className="text-[12px] text-muted mt-0.5">
            {reviews.length
              ? `${reviews.length} recension${reviews.length === 1 ? 'e' : 'i'}`
              : 'Ancora nessuna recensione — sii il primo'}
          </p>
        </div>
        {currentUserId && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-[13px] font-semibold bg-espresso text-parchment rounded-full px-4 py-2 hover:bg-sienna transition-colors"
          >
            <PenLine size={13} />
            Scrivi
          </button>
        )}
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-2xl border border-border/60">
            <Star size={24} className="text-border mx-auto mb-3" />
            <p className="text-[13px] text-muted">Nessuna recensione ancora.</p>
            {currentUserId && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-[13px] font-semibold text-sienna hover:underline"
              >
                Scrivi la prima →
              </button>
            )}
          </div>
        ) : (
          reviews.map(r => <ReviewCard key={r.id} review={r} currentUserId={currentUserId} />)
        )}
      </div>

      {showModal && currentUserId && (
        <NewReviewModal
          userId={currentUserId}
          prefilledTarget={prefilledTarget}
          onClose={() => setShowModal(false)}
          onPublished={() => {
            setShowModal(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
