import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BadgeCheck, Users, ImageOff, ArrowRight } from 'lucide-react'
import { Star } from 'lucide-react'
import type { Shop } from '@/types'

const AVATAR_PLACEHOLDER = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&q=80'

interface RecentPost { image_url: string; created_at: string }

interface Props {
  shop: Shop
  recentPosts?: RecentPost[]
}

function isActiveThisWeek(posts: RecentPost[] | undefined): boolean {
  if (!posts?.length) return false
  const latest = new Date(posts[0].created_at).getTime()
  return Date.now() - latest < 7 * 24 * 60 * 60 * 1000
}

export default function ShopCard({ shop, recentPosts }: Props) {
  const posts  = recentPosts ?? []
  const active = isActiveThisWeek(posts)
  const hasAnyPost = posts.length > 0

  return (
    <Link
      href={`/negozi/${shop.id}`}
      className="group block bg-white border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_8px_32px_rgba(28,46,74,0.13)] hover:-translate-y-0.5"
    >
      {/* ── Post grid ── */}
      <div className="grid grid-cols-3 gap-px h-44 bg-border overflow-hidden">
        {[0, 1, 2].map(i => (
          <div key={i} className="relative bg-cream overflow-hidden">
            {posts[i] ? (
              <Image
                src={posts[i].image_url}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width:640px) 33vw, 160px"
              />
            ) : i === 0 && shop.image_url ? (
              <Image
                src={shop.image_url}
                alt={shop.name}
                fill
                className="object-cover opacity-30"
                sizes="160px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cream/80">
                {i === 1 && !hasAnyPost && (
                  <ImageOff size={18} className="text-muted/30" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-8 pb-4 relative">

        {/* Avatar — overlaps grid */}
        <div className="absolute -top-6 left-4 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md bg-cream flex-shrink-0">
          <Image
            src={shop.image_url ?? AVATAR_PLACEHOLDER}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>

        {/* Activity badge */}
        {active && (
          <div className="absolute -top-3 right-4">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Attivo
            </span>
          </div>
        )}

        {/* Name + verified */}
        <div className="flex items-start gap-1.5 mb-1">
          <h3 className="font-serif font-bold text-espresso text-[16px] leading-snug group-hover:text-sienna transition-colors line-clamp-1">
            {shop.name}
          </h3>
          {shop.is_verified && (
            <BadgeCheck size={15} className="text-sienna flex-shrink-0 mt-0.5" />
          )}
        </div>

        {/* Location */}
        <p className="flex items-center gap-1 text-[12px] text-muted mb-3">
          <MapPin size={11} className="text-sienna/50 flex-shrink-0" />
          <span className="font-medium text-coffee">{shop.city}</span>
          <span className="text-muted/60">· {shop.region}</span>
        </p>

        {/* Categories */}
        {shop.categories && shop.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {shop.categories.slice(0, 3).map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-cream border border-border/60 text-coffee">
                {c}
              </span>
            ))}
            {shop.categories.length > 3 && (
              <span className="text-[10px] text-muted">+{shop.categories.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats + CTA */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-3 text-[11px] text-muted">
            {shop.followers_count > 0 && (
              <span className="flex items-center gap-1">
                <Users size={10} /> {shop.followers_count}
              </span>
            )}
            {(shop.posts_count ?? 0) > 0 && (
              <span>{shop.posts_count} post</span>
            )}
            {shop.avg_rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star size={10} className="text-gold fill-gold" />
                {shop.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-sienna group-hover:gap-2 transition-all">
            Visita <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}
