'use client'

import Link from 'next/link'
import { MapPin, Clock, Ticket, RefreshCw, Lightbulb, ArrowRight, BadgeCheck, ExternalLink } from 'lucide-react'
import type { MarketEvent } from '@/types'
import { REGION_CONFIG, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'

const TYPE_LABEL: Record<string, string> = {
  mercatino:    'Mercatino',
  antiquariato: 'Antiquariato',
  vinokilo:     'Kilo Vintage',
  collezionismo:'Collezionismo',
  vinile:       'Vinili & Dischi',
  fumetti:      'Fumetti',
  brand_sale:   'Brand Sale',
  svendita:     'Svendita',
}

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const DAYS_LONG = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

function scheduleFromDescription(desc: string | null): string | null {
  if (!desc) return null
  const m = desc.match(/Cadenza:\s*(.+?)(?:\n|$)/i)
  return m?.[1]?.trim() ?? null
}

function cleanDescription(desc: string | null): string | null {
  if (!desc) return null
  return desc
    .split('\n')[0]
    .replace(/\s*Cadenza:.*$/i, '')
    .replace(/\s*Fonte:.*$/i, '')
    .trim()
}

interface Props {
  event: MarketEvent
  compact?: boolean
}

export default function RecurringMarketCard({ event, compact = false }: Props) {
  const cfg     = REGION_CONFIG[event.region] ?? DEFAULT_CONFIG
  const pattern = AREA_PATTERNS[cfg.area] ?? AREA_PATTERNS.default
  const [g1, g2] = cfg.gradient
  const accent  = cfg.accent

  const isFree    = /gratuito|gratis|free/i.test(event.price_info ?? '')
  const schedule  = scheduleFromDescription(event.description)
  const desc      = cleanDescription(event.description)
  const cats      = (event.categories ?? []).slice(0, 4)
  const label     = TYPE_LABEL[event.event_type] ?? 'Mercatino'

  const d     = event.start_date ? new Date(event.start_date + 'T12:00:00') : null
  const hasEnd = event.end_date && event.end_date !== event.start_date

  return (
    <Link
      href={`/mercatini/eventi/${event.id}`}
      className={`group block bg-white border border-border/70 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_10px_48px_rgba(15,32,64,0.14)] hover:-translate-y-1 hover:border-transparent ${
        event.is_featured ? 'ring-2 ring-gold/40 shadow-[0_4px_20px_rgba(201,168,76,0.15)]' : ''
      }`}
    >
      {/* ── Header gradient — regione + pattern ─── */}
      <div
        className="relative h-[88px] flex flex-col justify-between px-5 pt-4 pb-3.5"
        style={{
          background:      `linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundImage: `${pattern}, linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundBlendMode: 'overlay, normal',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/25 pointer-events-none" />

        {/* Top row */}
        <div className="relative flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            {event.is_featured && (
              <span className="text-[9px] font-bold text-white/95 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                In evidenza
              </span>
            )}
            {event.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/90 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                <BadgeCheck size={8} /> Verificato
              </span>
            )}
          </div>
        </div>

        {/* Bottom row — schedule chip */}
        <div className="relative">
          {schedule ? (
            <span className="inline-flex items-center gap-1.5 bg-white/18 backdrop-blur-sm border border-white/25 rounded-full px-2.5 py-1">
              <RefreshCw size={9} className="text-white/75" />
              <span className="text-[10px] font-semibold text-white leading-none">{schedule}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-white/18 border border-white/25 rounded-full px-2.5 py-1">
              <RefreshCw size={9} className="text-white/75" />
              <span className="text-[10px] font-semibold text-white">Ricorrente</span>
            </span>
          )}
        </div>
      </div>

      {/* Accent bar */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}cc, transparent)` }} />

      {/* ── Contenuto ─────────────────────────────── */}
      <div className="px-5 pt-4 pb-5">

        {/* Data prossima edizione */}
        {d && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5" style={{ color: accent }}>
            {DAYS_LONG[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()].toUpperCase()}
            {hasEnd && (() => {
              const e2 = new Date(event.end_date! + 'T12:00:00')
              return ` – ${e2.getDate()} ${MONTHS[e2.getMonth()].toUpperCase()}`
            })()}
          </p>
        )}

        {/* Titolo */}
        <h3 className={`font-serif font-bold text-espresso leading-[1.2] mb-3 group-hover:text-sienna transition-colors duration-150 ${
          compact ? 'text-[15px] line-clamp-2' : 'text-[18px]'
        }`}>
          {event.name}
        </h3>

        {/* Luogo */}
        <div className="flex items-start gap-2 mb-2">
          <MapPin size={12} className="mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-coffee">
              {event.city}
            </span>
            <span className="text-[12px] text-muted"> · {event.region}</span>
            {event.address && (
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{event.address}</p>
            )}
          </div>
        </div>

        {/* Orari + ingresso */}
        {(event.start_time || event.price_info) && (
          <div className="flex items-center gap-4 mb-3">
            {event.start_time && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-coffee font-medium">
                <Clock size={11} className="text-muted/70" />
                {event.start_time}{event.end_time ? `–${event.end_time}` : ''}
              </span>
            )}
            {event.price_info && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                isFree ? 'text-emerald-700' : 'text-coffee'
              }`}>
                <Ticket size={11} className="opacity-60" />
                {event.price_info}
              </span>
            )}
          </div>
        )}

        {/* Descrizione */}
        {!compact && desc && (
          <p className="text-[12px] text-muted leading-[1.65] mb-3.5 line-clamp-3">
            {desc}
          </p>
        )}

        {/* Categorie */}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {cats.map(c => (
              <span
                key={c}
                className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                style={{ color: accent, borderColor: `${accent}40`, background: `${accent}10` }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Tip */}
        {!compact && event.tips && (
          <div className="flex items-start gap-2.5 bg-[#fdf8ee] border border-[#e8d69a] rounded-xl px-4 py-3 mb-4">
            <Lightbulb size={13} className="text-[#b8960a] flex-shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-[#5a4a00]/80 leading-[1.6]">
              {event.tips}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {isFree ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Ingresso gratuito
              </span>
            ) : (
              event.price_info && (
                <span className="text-[11px] text-muted">{event.price_info}</span>
              )
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold group-hover:gap-2 transition-all duration-150"
            style={{ color: accent }}>
            Scopri di più <ArrowRight size={12} />
          </span>
        </div>

      </div>
    </Link>
  )
}
