'use client'

import Link from 'next/link'
import { MapPin, Clock, ExternalLink, RefreshCw, BadgeCheck, Ticket, Lightbulb, Sparkles, Tag, ArrowRight } from 'lucide-react'
import AddToCalendar from './AddToCalendar'
import type { MarketEvent } from '@/types'

export type { MarketEvent }

const TYPE_LABEL: Record<string, string> = {
  mercatino:      'Mercatino',
  antiquariato:   'Antiquariato',
  vinokilo:       'Kilo Vintage',
  svuotacantina:  'Svuotacantina',
  svendita:       'Svendita',
  collezionismo:  'Collezionismo',
  fumetti:        'Fumetti',
  vinile:         'Vinili',
  vinili:         'Vinili',
  fair_price:     'Fair Price',
  brand_sale:     'Brand & Lusso',
  memorabilia:    'Memorabilia',
  private_sale:   'Private Sale',
  vintage_market: 'Mercato Vintage',
}

const TYPE_HEADER: Record<string, { g1: string; g2: string; accent: string }> = {
  private_sale:   { g1: '#0d1f3c', g2: '#1a3560', accent: '#c9a84c' },
  vintage_market: { g1: '#1a0e06', g2: '#2e1a0e', accent: '#9b6a1e' },
  antiquariato:   { g1: '#0f0806', g2: '#2a1508', accent: '#c9a84c' },
  vinokilo:       { g1: '#150a28', g2: '#2d1855', accent: '#9b59b6' },
  fair_price:     { g1: '#061a10', g2: '#0e3020', accent: '#27ae60' },
  svuotacantina:  { g1: '#101010', g2: '#242424', accent: '#8a8a8a' },
  mercatino:      { g1: '#1a0a08', g2: '#3a1810', accent: '#b44c35' },
  brand_sale:     { g1: '#1a1400', g2: '#2e2300', accent: '#c9a84c' },
}
const DEFAULT_HDR = { g1: '#1C2E4A', g2: '#2d3f5a', accent: '#c9a84c' }

const MONTHS      = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const MONTHS_LONG = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DAYS        = ['dom','lun','mar','mer','gio','ven','sab']

const SKIP_TAGS = new Set(['itinerante','second-hand','eco-friendly','luxury','pop-up','annuale','mostra-mercato'])

function recurringLabel(tags: string[] | null): string | null {
  if (!tags) return null
  const t = tags.join(' ').toLowerCase()
  if (t.includes('settimanale') || t.includes('ogni martedì') || t.includes('ogni domenica') || t.includes('ogni sabato')) return 'Settimanale'
  if (t.includes('mensile') || t.includes('ogni mese')) return 'Mensile'
  if (t.includes('bimestrale')) return 'Bimestrale'
  return 'Ricorrente'
}

function durationLabel(start: string, end: string | null): string | null {
  if (!end || end === start) return null
  const diff = Math.round(
    (new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86400000
  ) + 1
  if (diff <= 1) return null
  return diff === 7 ? '1 settimana' : `${diff} giorni`
}

interface Props { event: MarketEvent; compact?: boolean; todayStr?: string }

export default function EventCard({ event, compact = false, todayStr }: Props) {
  const isPast = todayStr ? event.start_date < todayStr : false
  const label    = TYPE_LABEL[event.event_type] ?? 'Mercatino'
  const isFree   = /gratuito|gratis|free|libero/i.test(event.price_info ?? '')
  const recLabel = event.is_recurring ? recurringLabel(event.tags) : null
  const hdr      = TYPE_HEADER[event.event_type] ?? DEFAULT_HDR

  const d      = event.start_date ? new Date(event.start_date + 'T12:00:00') : null
  const hasEnd = event.end_date && event.end_date !== event.start_date
  const e2     = hasEnd ? new Date(event.end_date! + 'T12:00:00') : null
  const dur    = durationLabel(event.start_date, event.end_date)

  const desc = event.description
    ? event.description.split('\n')[0].replace(/\s*Fonte:.*$/i, '').trim()
    : null

  const cats        = (event.categories ?? []).slice(0, 4)
  const visibleTags = (event.tags ?? []).filter(t => !SKIP_TAGS.has(t)).slice(0, 3)

  // ─── ONE-TIME ITINERANT EVENT ───────────────────────────────────────────
  if (!event.is_recurring) {
    const dateLabel = d
      ? (hasEnd && e2
          ? `${d.getDate()}–${e2.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}`
          : `${DAYS[d.getDay()].toUpperCase()} ${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}`)
      : null

    return (
      <div className="relative">
        {isPast && (
          <span className="absolute top-3 right-3 pointer-events-none z-10 text-[9px] font-bold uppercase tracking-[0.12em] bg-white/95 text-muted/80 border border-border px-2 py-0.5 rounded-full shadow-sm">
            Già passato
          </span>
        )}
      <a
        href={`/mercatini/eventi/${event.id}`}
        className={`group block bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_10px_48px_rgba(15,32,64,0.14)] hover:-translate-y-1 hover:border-transparent ${
          event.is_featured
            ? 'ring-2 ring-gold/40 shadow-[0_4px_20px_rgba(201,168,76,0.15)] border-transparent'
            : 'border-border/70'
        }${isPast ? ' opacity-55' : ''}`}
      >
        {/* Gradient header */}
        <div
          className="relative h-[96px] flex flex-col justify-between px-5 pt-4 pb-3.5"
          style={{ background: `linear-gradient(135deg, ${hdr.g1}, ${hdr.g2})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/30 pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">{label}</span>
              {dur && (
                <span className="text-[9px] font-semibold text-white/70 bg-white/10 border border-white/15 px-1.5 py-0.5 rounded-full">
                  {dur}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {event.is_featured && (
                <span className="text-[9px] font-bold text-white/95 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">In evidenza</span>
              )}
              {event.is_verified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/90 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={8} /> Verificato
                </span>
              )}
            </div>
          </div>

          <div className="relative flex items-end justify-between">
            {dateLabel && (
              <span className="text-[14px] font-bold text-white/95 tracking-tight font-mono">{dateLabel}</span>
            )}
            <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white">
              <Sparkles size={8} className="text-white/70" />
              {d ? `Solo a ${MONTHS_LONG[d.getMonth()]}` : 'Evento unico'}
            </span>
          </div>
        </div>

        {/* Accent bar */}
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${hdr.accent}cc, transparent)` }} />

        {/* Body */}
        <div className="px-4 pt-4 pb-4">
          <h3 className={`font-serif font-bold text-espresso leading-[1.25] group-hover:text-sienna transition-colors duration-150 mb-2 ${
            compact ? 'text-[14px]' : 'text-[17px]'
          }`}>
            {event.name}
          </h3>

          {event.organizer && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{ color: hdr.accent }}>
              {event.organizer}
            </p>
          )}

          <div className="space-y-1.5 mb-3">
            <div className="flex items-start gap-1.5">
              <MapPin size={11} className="mt-0.5 flex-shrink-0" style={{ color: hdr.accent }} />
              <span className="text-[12px] text-coffee leading-snug">
                <span className="font-semibold">{event.city}</span>
                {event.region && event.region !== event.city && (
                  <span className="text-muted"> · {event.region}</span>
                )}
              </span>
            </div>
            {event.address && (
              <p className="text-[11px] text-muted leading-snug pl-[19px]">{event.address}</p>
            )}
            {(event.start_time || event.price_info) && (
              <div className="flex items-center gap-3 pl-[19px]">
                {event.start_time && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                    <Clock size={10} className="text-muted/50" />
                    {event.start_time}{event.end_time ? `–${event.end_time}` : ''}
                  </span>
                )}
                {event.price_info && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isFree ? 'text-emerald-700' : 'text-coffee'}`}>
                    <Ticket size={10} className="opacity-60" />
                    {event.price_info}
                  </span>
                )}
              </div>
            )}
          </div>

          {!compact && desc && desc.length > 20 && (
            <p className="text-[11.5px] text-coffee/80 leading-[1.7] mb-3 line-clamp-3">{desc}</p>
          )}

          {!compact && cats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {cats.map(c => (
                <span key={c} className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{ color: hdr.accent, borderColor: `${hdr.accent}40`, background: `${hdr.accent}12` }}>
                  {c}
                </span>
              ))}
            </div>
          )}

          {!compact && visibleTags.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <Tag size={9} className="text-muted/50 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {visibleTags.map(t => (
                  <span key={t} className="text-[10px] text-muted/70 font-medium">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {!compact && event.tips && (
            <div className="flex items-start gap-2 mb-3 bg-gold/6 border border-gold/15 rounded-lg px-3 py-2">
              <Lightbulb size={11} className="text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-espresso/75 leading-relaxed">{event.tips}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3.5 border-t border-border/50">
            <div onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
              <AddToCalendar event={event} />
            </div>
            <div className="flex items-center gap-3">
              {event.website && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(event.website!, '_blank', 'noopener noreferrer'); }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors hover:opacity-75"
                  style={{ color: hdr.accent }}
                >
                  Sito ufficiale <ExternalLink size={10} />
                </button>
              )}
              <span className="inline-flex items-center gap-1 text-[12px] font-bold group-hover:gap-2 transition-all duration-150" style={{ color: hdr.accent }}>
                Scopri <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </a>
      </div>
    )
  }

  // ─── RECURRING EVENT ────────────────────────────────────────────────────
  return (
    <Link
      href={`/mercatini/eventi/${event.id}`}
      className={`group block bg-white border rounded-xl overflow-hidden transition-all duration-150 hover:shadow-[0_4px_20px_rgba(15,32,64,0.09)] hover:border-espresso/30 border-espresso/15 ${
        event.is_featured ? 'ring-1 ring-gold/30' : ''
      }`}
    >
      <div className="h-[3px] w-full bg-emerald-600" />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
            {recLabel && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <RefreshCw size={8} /> {recLabel}
              </span>
            )}
          </div>
          {event.is_verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-espresso/60 bg-espresso/5 px-2 py-0.5 rounded-full border border-espresso/10">
              <BadgeCheck size={9} /> Verificato
            </span>
          )}
        </div>

        <div className="mb-3">
          {d && (
            <p className="text-[11px] text-muted mb-1 font-medium">
              {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]}
              {hasEnd && e2 ? ` – ${e2.getDate()} ${MONTHS[e2.getMonth()]}` : ''}
            </p>
          )}
          <h3 className={`font-serif font-bold text-espresso leading-[1.25] group-hover:text-sienna transition-colors duration-150 ${
            compact ? 'text-[14px]' : 'text-[16px]'
          }`}>
            {event.name}
          </h3>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-start gap-1.5">
            <MapPin size={11} className="text-muted/60 mt-0.5 flex-shrink-0" />
            <span className="text-[12px] text-coffee leading-snug">
              <span className="font-medium">{event.city}</span>
              {event.region && event.region !== event.city && (
                <span className="text-muted"> · {event.region}</span>
              )}
              {event.address && (
                <span className="text-muted block text-[11px] mt-0.5 leading-snug">{event.address}</span>
              )}
            </span>
          </div>
          {(event.start_time || event.price_info) && (
            <div className="flex items-center gap-3">
              {event.start_time && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                  <Clock size={10} className="text-muted/50" />
                  {event.start_time}{event.end_time ? `–${event.end_time}` : ''}
                </span>
              )}
              {event.price_info && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isFree ? 'text-emerald-700' : 'text-coffee'}`}>
                  <Ticket size={10} className="opacity-60" />
                  {event.price_info}
                </span>
              )}
            </div>
          )}
        </div>

        {!compact && desc && desc.length > 20 && (
          <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2">{desc}</p>
        )}

        {!compact && event.tips && (
          <div className="flex items-start gap-2 mb-3 bg-gold/6 border border-gold/15 rounded-lg px-3 py-2">
            <Lightbulb size={11} className="text-gold flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-espresso/75 leading-relaxed">{event.tips}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div onClick={e => e.preventDefault()}>
            <AddToCalendar event={event} />
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-sienna group-hover:gap-2 transition-all duration-150">
            Scopri <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}
