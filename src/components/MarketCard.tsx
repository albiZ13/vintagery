'use client'

import Link from 'next/link'
import { MapPin, BadgeCheck, Clock, ArrowRight, Star, RefreshCw } from 'lucide-react'
import type { Market } from '@/types'
import SaveButton from './SaveButton'
import { REGION_CONFIG, DEFAULT_CONFIG } from '@/lib/regions-config'

const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
  annuale:     'Annuale',
}

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const DAYS   = ['dom','lun','mar','mer','gio','ven','sab']

interface Props {
  market: Market
  compact?: boolean
}

export default function MarketCard({ market, compact = false }: Props) {
  const cfg    = REGION_CONFIG[market.region] ?? DEFAULT_CONFIG
  const accent = cfg.accent

  const cats = (market.categories ?? []).slice(0, 3)

  const nextDate = market.next_date
    ? new Date(market.next_date + 'T12:00:00')
    : null

  return (
    <Link
      href={`/mercatini/${market.id}`}
      className={`group relative flex bg-white border border-border rounded-xl overflow-hidden transition-all duration-150 hover:shadow-[0_4px_20px_rgba(15,32,64,0.09)] hover:border-border-strong ${
        market.is_featured ? 'ring-1 ring-gold/30' : ''
      }`}
    >
      {/* Accent bar sinistra — colore regione */}
      <div className="w-[3px] flex-shrink-0" style={{ background: accent }} />

      <div className="flex-1 p-4">

        {/* Riga 1: regione + badges */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
            {market.region}
          </span>
          <div className="flex items-center gap-1.5">
            {market.is_featured && (
              <span className="text-[10px] font-bold text-gold bg-gold/8 border border-gold/20 px-2 py-0.5 rounded-full">
                In evidenza
              </span>
            )}
            {market.is_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-espresso/60 bg-espresso/5 px-2 py-0.5 rounded-full border border-espresso/10">
                <BadgeCheck size={9} /> Verificato
              </span>
            )}
          </div>
        </div>

        {/* Titolo */}
        <h3 className={`font-serif font-bold text-espresso leading-[1.25] mb-2 group-hover:text-sienna transition-colors duration-150 ${
          compact ? 'text-[14px] line-clamp-1' : 'text-[16px] line-clamp-2'
        }`}>
          {market.name}
        </h3>

        {/* Luogo */}
        <div className="flex items-start gap-1.5 mb-2">
          <MapPin size={11} className="text-muted/60 mt-0.5 flex-shrink-0" />
          <span className="text-[12px] text-coffee leading-snug">
            <span className="font-medium">{market.city}</span>
            {market.address && (
              <span className="text-muted"> · {market.address}</span>
            )}
          </span>
        </div>

        {/* Prossima data + cadenza */}
        <div className="flex items-center gap-3 mb-3">
          {nextDate && (
            <span className="text-[11px] text-muted">
              {DAYS[nextDate.getDay()]} {nextDate.getDate()} {MONTHS[nextDate.getMonth()]}
            </span>
          )}
          {market.schedule_notes && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <Clock size={10} className="text-muted/50" />
              {market.schedule_notes}
            </span>
          )}
          {!market.schedule_notes && market.frequency && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <RefreshCw size={9} className="text-muted/50" />
              {FREQ_LABEL[market.frequency] ?? market.frequency}
            </span>
          )}
        </div>

        {/* Categorie */}
        {cats.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cats.map(c => (
              <span key={c} className="text-[10px] text-muted bg-surface-soft border border-border/60 px-2 py-0.5 rounded-full">
                {c}
              </span>
            ))}
            {(market.categories?.length ?? 0) > 3 && (
              <span className="text-[10px] text-muted/50 self-center">+{(market.categories?.length ?? 0) - 3}</span>
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
              <span className="text-[11px] text-muted/50">
                {FREQ_LABEL[market.frequency ?? ''] ?? ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
            <SaveButton type="market" targetId={market.id} />
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sienna group-hover:gap-1.5 transition-all duration-150">
              Scopri <ArrowRight size={10} />
            </span>
          </div>
        </div>

      </div>
    </Link>
  )
}
