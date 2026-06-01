'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BadgeCheck, Clock, ArrowRight, Star } from 'lucide-react'
import type { Market } from '@/types'
import SaveButton from './SaveButton'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80'

const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
  annuale:     'Annuale',
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Abbigliamento': '👗', 'Accessori': '👜', 'Scarpe': '👟', 'Borse': '👛',
  'Mobili': '🪑', 'Arte': '🖼️', 'Ceramiche': '🏺', 'Gioielli': '💍',
  'Vinili': '🎵', 'Libri': '📚', 'Fumetti': '📖', 'Fotografia': '📷',
  'Antiquariato': '🏛️', 'Collezionismo': '🏅', 'Giocattoli': '🧸',
  'Elettronica vintage': '📻', 'Oggetti da cucina': '🍳', 'Artigianato': '🎨',
}

function DateBadge({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr)
  const day = d.toLocaleDateString('it-IT', { day: 'numeric' })
  const month = d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
  const weekday = d.toLocaleDateString('it-IT', { weekday: 'short' })
  return (
    <div className="flex flex-col items-center bg-white rounded-xl px-3 py-2 shadow-md min-w-[48px]">
      <span className="text-[9px] font-bold uppercase tracking-wider text-sienna leading-none mb-0.5 capitalize">{weekday}</span>
      <span className="text-[22px] font-black text-espresso leading-none">{day}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted capitalize mt-0.5">{month}</span>
    </div>
  )
}

interface Props {
  market: Market
  compact?: boolean
}

export default function MarketCard({ market, compact = false }: Props) {
  const imgSrc    = market.poster_url ?? market.image_url ?? PLACEHOLDER
  const imgHeight = compact ? 'h-44' : 'h-56'

  const desc = market.description
    ? market.description.split('\n')[0].slice(0, compact ? 90 : 140)
    : null

  const cats = market.categories?.slice(0, compact ? 3 : 4) ?? []

  return (
    <Link
      href={`/mercatini/${market.id}`}
      className={`group block bg-white border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_8px_32px_rgba(28,46,74,0.13)] hover:-translate-y-0.5 ${
        market.is_featured ? 'ring-1 ring-gold/40' : ''
      }`}
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-cream ${imgHeight}`}>
        <Image
          src={imgSrc}
          alt={market.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {/* Date badge — bottom left */}
        <div className="absolute bottom-3 left-3">
          {market.next_date ? (
            <DateBadge dateStr={market.next_date} />
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                {FREQ_LABEL[market.frequency ?? ''] ?? 'Ricorrente'}
              </span>
            </div>
          )}
        </div>

        {/* Trust badges — bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {market.is_featured && (
            <span className="text-[9px] font-bold text-gold bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
              In evidenza
            </span>
          )}
          {market.is_verified && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
              <BadgeCheck size={9} /> Verificato
            </span>
          )}
          <SaveButton type="market" targetId={market.id} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">

        {/* Title */}
        <h3 className="font-serif font-bold text-espresso leading-snug mb-2 group-hover:text-sienna transition-colors"
          style={{ fontSize: compact ? '15px' : '17px' }}>
          {market.name}
        </h3>

        {/* Schedule + location */}
        <div className="space-y-1 mb-3">
          {market.schedule_notes && (
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-sienna/60 flex-shrink-0" />
              <span className="text-[12px] text-coffee">{market.schedule_notes}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-sienna/60 flex-shrink-0" />
            <span className="text-[12px] text-coffee">
              <span className="font-semibold">{market.city}</span>
              {market.address && <span className="text-muted"> · {market.address}</span>}
            </span>
          </div>
        </div>

        {/* Description */}
        {desc && !compact && (
          <p className="text-[12px] text-muted leading-relaxed mb-3 line-clamp-2">
            {desc}{market.description && market.description.length > 140 ? '…' : ''}
          </p>
        )}

        {/* Categories */}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cats.map(c => (
              <span key={c} className="inline-flex items-center gap-0.5 text-[10px] text-coffee bg-cream border border-border/60 px-2 py-0.5 rounded-full">
                {CATEGORY_EMOJI[c] && <span className="leading-none">{CATEGORY_EMOJI[c]}</span>}
                {c}
              </span>
            ))}
            {(market.categories?.length ?? 0) > (compact ? 3 : 4) && (
              <span className="text-[10px] text-muted px-1">+{(market.categories?.length ?? 0) - (compact ? 3 : 4)}</span>
            )}
          </div>
        )}

        {/* Footer: rating + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {market.avg_rating > 0 ? (
              <>
                <Star size={11} className="text-gold fill-gold" />
                <span className="text-[12px] font-semibold text-espresso">{market.avg_rating.toFixed(1)}</span>
                {market.review_count > 0 && (
                  <span className="text-[11px] text-muted">({market.review_count})</span>
                )}
              </>
            ) : (
              <span className="text-[11px] text-muted">{FREQ_LABEL[market.frequency ?? ''] ?? ''}</span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-sienna group-hover:gap-2 transition-all">
            Scopri <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}
