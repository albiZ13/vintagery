'use client'

import Link from 'next/link'
import { MapPin, Clock, Ticket, RefreshCw, Lightbulb, ArrowRight, BadgeCheck } from 'lucide-react'
import type { Market } from '@/types'
import SaveButton from './SaveButton'
import { REGION_CONFIG, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'
import { resolveDisplayDate } from '@/lib/cadenza'

const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
  annuale:     'Annuale',
}

function extractCadence(text: string): string {
  return text
    .replace(/\s*\([\s\S]*$/, '')
    .replace(/\.\s[\s\S]*$/, '')
    .replace(/,\s*ore\s[\s\S]*$/i, '')
    .replace(/,\s*(sabato|domenica|lunedì|martedì|mercoledì|giovedì|venerdì)[\s\S]*/i, '')
    .trim()
}

const MONTHS    = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const DAYS_LONG = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

interface Props {
  market: Market
  compact?: boolean
}

export default function MarketCard({ market, compact = false }: Props) {
  const cfg     = REGION_CONFIG[market.region] ?? DEFAULT_CONFIG
  const pattern = AREA_PATTERNS[cfg.area] ?? AREA_PATTERNS.default
  const [g1, g2] = cfg.gradient
  const accent  = cfg.accent

  const isFree   = /gratuito|gratis|free/i.test(market.price_info ?? '')
  const cats     = (market.categories ?? []).slice(0, 4)
  const cadence  = market.schedule_notes
    ? extractCadence(market.schedule_notes)
    : (market.frequency ? FREQ_LABEL[market.frequency] : null)
  const scheduleDetail = market.schedule_notes && market.schedule_notes !== cadence
    ? market.schedule_notes
    : null
  const desc     = market.description?.split('\n')[0]?.slice(0, 200) ?? null

  const { date: d, isComputed, isOffSeason } = resolveDisplayDate(market)

  return (
    <Link
      href={`/mercatini/${market.id}`}
      className={`group block bg-white border border-border/70 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_10px_48px_rgba(15,32,64,0.14)] hover:-translate-y-1 hover:border-transparent ${
        market.is_featured ? 'ring-2 ring-gold/40 shadow-[0_4px_20px_rgba(201,168,76,0.15)]' : ''
      }`}
    >
      {/* Header gradient + pattern */}
      <div
        className="relative h-[88px] flex flex-col justify-between px-5 pt-4 pb-3.5"
        style={{
          background:          `linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundImage:     `${pattern}, linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundBlendMode: 'overlay, normal',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/25 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">
            {cats[0] ?? 'Mercato ricorrente'}
          </span>
          <div className="flex items-center gap-1.5">
            {market.is_featured && (
              <span className="text-[9px] font-bold text-white/95 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                In evidenza
              </span>
            )}
            {market.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/90 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                <BadgeCheck size={8} /> Verificato
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 bg-white/18 backdrop-blur-sm border border-white/25 rounded-full px-2.5 py-1">
            <RefreshCw size={9} className="text-white/75" />
            <span className="text-[10px] font-semibold text-white leading-none">
              {cadence ?? 'Ricorrente'}
            </span>
          </span>
        </div>
      </div>

      {/* Accent bar */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}cc, transparent)` }} />

      <div className="px-5 pt-4 pb-5">

        {isOffSeason ? (
          <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.14em] text-muted/70 bg-muted/8 border border-border px-2.5 py-1 rounded-full mb-2.5">
            Fuori stagione
          </span>
        ) : d ? (
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="font-serif font-bold leading-none" style={{ color: isComputed ? `${accent}99` : accent, fontSize: '22px' }}>
              {d.getDate()}
            </span>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] leading-none"
                style={{ color: isComputed ? `${accent}99` : accent }}>
                {DAYS_LONG[d.getDay()].slice(0, 3)}
              </p>
              <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-muted mt-0.5">
                {MONTHS[d.getMonth()]} {d.getFullYear()}
                {isComputed && <span className="ml-1 text-muted/50">~</span>}
              </p>
            </div>
          </div>
        ) : null}

        <h3 className={`font-serif font-bold text-espresso leading-[1.2] mb-3 group-hover:text-sienna transition-colors duration-150 ${
          compact ? 'text-[15px] line-clamp-2' : 'text-[18px]'
        }`}>
          {market.name}
        </h3>

        <div className="flex items-start gap-2 mb-2">
          <MapPin size={12} className="mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-coffee">{market.city}</span>
            <span className="text-[12px] text-muted"> · {market.region}</span>
            {market.address && (
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{market.address}</p>
            )}
          </div>
        </div>

        {(market.start_time || market.price_info) && (
          <div className="flex items-center gap-4 mb-3">
            {market.start_time && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-coffee font-medium">
                <Clock size={11} className="text-muted/70" />
                {market.start_time}{market.end_time ? `–${market.end_time}` : ''}
              </span>
            )}
            {market.price_info && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${isFree ? 'text-emerald-700' : 'text-coffee'}`}>
                <Ticket size={11} className="opacity-60" />
                {market.price_info}
              </span>
            )}
          </div>
        )}

        {!compact && scheduleDetail && (
          <p className="text-[12px] text-muted leading-[1.65] mb-2 line-clamp-2">{scheduleDetail}</p>
        )}
        {!compact && desc && (
          <p className="text-[12px] text-muted leading-[1.65] mb-3.5 line-clamp-3">{desc}</p>
        )}

        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {cats.map(c => (
              <span key={c} className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                style={{ color: accent, borderColor: `${accent}40`, background: `${accent}10` }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {!compact && market.tips && (
          <div className="flex items-start gap-2.5 bg-[#fdf8ee] border border-[#e8d69a] rounded-xl px-4 py-3 mb-4">
            <Lightbulb size={13} className="text-[#b8960a] flex-shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-[#5a4a00]/80 leading-[1.6] line-clamp-3">{market.tips}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3.5 border-t border-border/50">
          <div>
            {isFree && market.price_info ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Ingresso gratuito
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
            <SaveButton type="market" targetId={market.id} />
            <span className="inline-flex items-center gap-1 text-[12px] font-bold group-hover:gap-2 transition-all duration-150" style={{ color: accent }}>
              Scopri di più <ArrowRight size={12} />
            </span>
          </div>
        </div>

      </div>
    </Link>
  )
}
