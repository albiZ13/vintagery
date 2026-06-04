'use client'

import Link from 'next/link'
import { MapPin, BadgeCheck, Clock, ArrowRight, Star } from 'lucide-react'
import type { Market } from '@/types'
import SaveButton from './SaveButton'
import { REGION_CONFIG, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'

const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
  annuale:     'Annuale',
}

const MONTHS_SHORT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const DAYS_SHORT   = ['DOM','LUN','MAR','MER','GIO','VEN','SAB']

function DateBadge({ dateStr, accent }: { dateStr: string; accent: string }) {
  const d = new Date(dateStr + 'T12:00:00')
  return (
    <div className="flex-shrink-0 flex flex-col items-center rounded-xl overflow-hidden shadow-md"
      style={{ minWidth: 48 }}>
      <div className="w-full py-1 text-center" style={{ background: accent }}>
        <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/80 leading-none">
          {DAYS_SHORT[d.getDay()]}
        </span>
      </div>
      <div className="w-full py-1.5 text-center bg-white/95">
        <span className="block text-[20px] font-black text-[#0F2040] leading-none">{d.getDate()}</span>
        <span className="block text-[8px] font-bold uppercase tracking-[0.12em] mt-0.5"
          style={{ color: accent }}>
          {MONTHS_SHORT[d.getMonth()]}
        </span>
      </div>
    </div>
  )
}

interface Props {
  market: Market
  compact?: boolean
}

export default function MarketCard({ market, compact = false }: Props) {
  const cfg     = REGION_CONFIG[market.region] ?? DEFAULT_CONFIG
  const pattern = AREA_PATTERNS[cfg.area] ?? AREA_PATTERNS.default
  const [g1, g2] = cfg.gradient
  const accent  = cfg.accent

  const desc = market.description
    ? market.description.split('\n')[0].slice(0, compact ? 80 : 110)
    : null
  const cats = (market.categories ?? []).slice(0, 3)

  return (
    <Link
      href={`/mercatini/${market.id}`}
      className={`group block bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_8px_36px_rgba(15,32,64,0.12)] hover:-translate-y-0.5 ${
        market.is_featured ? 'border-gold/40 ring-1 ring-gold/20' : 'border-border'
      }`}
    >
      {/* Colored header — region gradient + area pattern */}
      <div
        className="relative h-28 flex flex-col justify-between p-4"
        style={{
          background:      `linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundImage: `${pattern}, linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundBlendMode: 'overlay, normal',
          backgroundSize: 'auto, cover',
        }}
      >
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-black/20 pointer-events-none" />

        {/* Top row: region label + badges */}
        <div className="relative flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
            {market.region}
          </span>
          <div className="flex items-center gap-1.5">
            {market.is_featured && (
              <span className="text-[9px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                In evidenza
              </span>
            )}
            {market.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                <BadgeCheck size={8} /> Verificato
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: date badge + save */}
        <div className="relative flex items-end justify-between">
          {market.next_date
            ? <DateBadge dateStr={market.next_date} accent={accent} />
            : (
              <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">
                  {FREQ_LABEL[market.frequency ?? ''] ?? 'Ricorrente'}
                </span>
              </div>
            )
          }
          <SaveButton type="market" targetId={market.id} />
        </div>
      </div>

      {/* Accent bar */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      {/* Content */}
      <div className="px-4 pt-3.5 pb-4">

        {/* Title */}
        <h3
          className="font-serif font-bold text-espresso leading-[1.25] mb-2.5 group-hover:text-sienna transition-colors duration-200 line-clamp-2"
          style={{ fontSize: compact ? '14px' : '15px' }}
        >
          {market.name}
        </h3>

        {/* Location + schedule */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-start gap-2">
            <MapPin size={11} className="text-sienna/50 flex-shrink-0 mt-0.5" />
            <span className="text-[12px] text-coffee leading-snug">
              <span className="font-medium">{market.city}</span>
              {market.address && (
                <span className="text-muted"> · {market.address}</span>
              )}
            </span>
          </div>
          {market.schedule_notes && (
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-sienna/50 flex-shrink-0" />
              <span className="text-[12px] text-coffee">{market.schedule_notes}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {desc && !compact && (
          <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2">
            {desc}{(market.description?.length ?? 0) > 110 ? '…' : ''}
          </p>
        )}

        {/* Categories */}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cats.map(c => (
              <span key={c} className="text-[10px] text-muted bg-cream border border-border/50 px-2 py-0.5 rounded-md">
                {c}
              </span>
            ))}
            {(market.categories?.length ?? 0) > 3 && (
              <span className="text-[10px] text-muted/60 px-1 self-center">
                +{(market.categories?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
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
              <span className="text-[11px] text-muted/60">
                {FREQ_LABEL[market.frequency ?? ''] ?? ''}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sienna group-hover:gap-2 transition-all duration-200">
            Scopri <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </Link>
  )
}
