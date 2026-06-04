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

const MONTHS_SHORT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const DAYS_SHORT   = ['DOM','LUN','MAR','MER','GIO','VEN','SAB']

function DateBadge({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + 'T12:00:00')
  return (
    <div className="flex flex-col items-center bg-espresso/90 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[48px] shadow-lg">
      <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-parchment/60 leading-none mb-0.5">
        {DAYS_SHORT[d.getDay()]}
      </span>
      <span className="text-[22px] font-black text-parchment leading-none">
        {d.getDate()}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-sienna mt-0.5">
        {MONTHS_SHORT[d.getMonth()]}
      </span>
    </div>
  )
}

interface Props {
  market: Market
  compact?: boolean
}

export default function MarketCard({ market, compact = false }: Props) {
  const imgSrc = market.poster_url ?? market.image_url ?? PLACEHOLDER
  const desc   = market.description
    ? market.description.split('\n')[0].slice(0, compact ? 80 : 120)
    : null
  const cats   = (market.categories ?? []).slice(0, 3)

  return (
    <Link
      href={`/mercatini/${market.id}`}
      className={`group block bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_8px_36px_rgba(15,32,64,0.12)] hover:-translate-y-0.5 ${
        market.is_featured ? 'border-gold/40 ring-1 ring-gold/20' : 'border-border'
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-cream h-48">
        <Image
          src={imgSrc}
          alt={market.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Date badge */}
        <div className="absolute bottom-3 left-3">
          {market.next_date ? (
            <DateBadge dateStr={market.next_date} />
          ) : (
            <div className="bg-espresso/80 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <span className="text-[9px] font-bold text-parchment/70 uppercase tracking-wider">
                {FREQ_LABEL[market.frequency ?? ''] ?? 'Ricorrente'}
              </span>
            </div>
          )}
        </div>

        {/* Badges top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {market.is_featured && (
            <span className="text-[9px] font-bold text-gold bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full border border-gold/30">
              In evidenza
            </span>
          )}
          {market.is_verified && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              <BadgeCheck size={9} /> Verificato
            </span>
          )}
        </div>

        {/* Save button bottom right */}
        <div className="absolute bottom-3 right-3">
          <SaveButton type="market" targetId={market.id} />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-4">

        {/* Title */}
        <h3
          className="font-serif font-bold text-espresso leading-[1.25] mb-2 group-hover:text-sienna transition-colors duration-200"
          style={{ fontSize: compact ? '15px' : '16px' }}
        >
          {market.name}
        </h3>

        {/* Location + schedule */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2">
            <MapPin size={11} className="text-sienna/60 flex-shrink-0" />
            <span className="text-[12px] text-coffee">
              <span className="font-semibold">{market.city}</span>
              {market.address && <span className="text-muted"> · {market.address}</span>}
            </span>
          </div>
          {market.schedule_notes && (
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-sienna/60 flex-shrink-0" />
              <span className="text-[12px] text-coffee">{market.schedule_notes}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {desc && !compact && (
          <p className="text-[12px] text-muted leading-relaxed mb-3 line-clamp-2">
            {desc}{(market.description?.length ?? 0) > 120 ? '…' : ''}
          </p>
        )}

        {/* Categories */}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cats.map(c => (
              <span
                key={c}
                className="text-[10px] text-muted bg-cream border border-border/60 px-2 py-0.5 rounded-md"
              >
                {c}
              </span>
            ))}
            {(market.categories?.length ?? 0) > 3 && (
              <span className="text-[10px] text-muted px-1">
                +{(market.categories?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
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
              <span className="text-[11px] text-muted/70">
                {FREQ_LABEL[market.frequency ?? ''] ?? ''}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-sienna group-hover:gap-2 transition-all duration-200">
            Scopri <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}
