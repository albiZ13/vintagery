'use client'

import { MapPin, Clock, Ticket, BadgeCheck, ArrowRight, RefreshCw, CalendarX2, Lightbulb, Star } from 'lucide-react'
import { REGION_GRADIENT, DEFAULT_GRADIENT } from '@/lib/city-visual'
import { REGION_CONFIG, DEFAULT_CONFIG } from '@/lib/regions-config'
import AddToCalendar from './AddToCalendar'
import type { MarketEvent } from '@/types'

const MONTHS_LONG  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const DAYS_FULL    = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const DAYS_SHORT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

const FREQ_LABEL: Record<string, string> = {
  settimanale:   'Ogni settimana',
  bisettimanale: '2× al mese',
  mensile:       'Ogni mese',
  bimestrale:    'Bimestrale',
}
function recurringLabel(tags: string[] | null): string {
  if (!tags) return 'Ricorrente'
  const t = tags.join(' ').toLowerCase()
  for (const [k, v] of Object.entries(FREQ_LABEL)) {
    if (t.includes(k)) return v
  }
  return 'Ricorrente'
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

interface Props { event: MarketEvent; todayStr?: string }

export default function FeaturedEventCard({ event, todayStr }: Props) {
  const isPast  = todayStr ? event.start_date < todayStr : false
  const isFree  = /gratuito|gratis|free|libero/i.test(event.price_info ?? '')
  const cats    = (event.categories ?? []).slice(0, 4)

  const bg     = REGION_GRADIENT[event.region] ?? DEFAULT_GRADIENT
  const cfg    = REGION_CONFIG[event.region]   ?? DEFAULT_CONFIG
  const accent = cfg.accent

  const d  = event.start_date ? new Date(event.start_date + 'T12:00:00') : null
  const d2 = event.end_date && event.end_date !== event.start_date
    ? new Date(event.end_date + 'T12:00:00')
    : null
  const duration = d && d2 ? daysBetween(d, d2) + 1 : 1

  const mapsUrl = event.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address + ', ' + event.city)}`
    : null

  const desc = event.description?.split('\n').filter(Boolean)[0] ?? null

  return (
    <a
      href={`/mercatini/eventi/${event.id}`}
      className="group block bg-white border border-border/60 rounded-2xl overflow-hidden shadow-[0_4px_28px_rgba(15,32,64,0.12)] hover:shadow-[0_8px_40px_rgba(15,32,64,0.16)] hover:-translate-y-0.5 transition-all duration-300"
      style={isPast ? { opacity: 0.65 } : undefined}
    >

      {/* ── HERO GRADIENT ─────────────────────────────────────────── */}
      <div className="relative px-5 pt-5 pb-6 sm:px-7 sm:pt-6" style={{ background: bg }}>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/20 to-black/50 pointer-events-none" />

        {/* City watermark */}
        <div
          className="absolute inset-0 flex items-center justify-end pr-6 select-none pointer-events-none overflow-hidden"
          aria-hidden
        >
          <span
            className="font-serif font-black text-white/[0.05] leading-none tracking-[-0.04em] whitespace-nowrap"
            style={{ fontSize: 'clamp(5rem, 18vw, 10rem)' }}
          >
            {event.city}
          </span>
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">

          {/* Sinistra: badge, data, titolo, location */}
          <div className="flex-1 min-w-0">

            {/* Badge row */}
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/50">
                {event.event_type ?? 'Evento'}
              </span>
              {event.is_verified && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/90 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={8} /> Verificato
                </span>
              )}
              {event.is_recurring ? (
                <span className="inline-flex items-center gap-1.5 bg-white/18 border border-white/25 rounded-full px-2.5 py-0.5">
                  <RefreshCw size={8} className="text-white/70" />
                  <span className="text-[9px] font-semibold text-white">{recurringLabel(event.tags)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/80 bg-black/25 border border-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <CalendarX2 size={8} /> Solo questa data
                </span>
              )}
              {event.is_featured && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gold bg-gold/20 border border-gold/30 px-2 py-0.5 rounded-full">
                  In evidenza
                </span>
              )}
              {event.avg_rating && event.review_count > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/80 bg-white/12 border border-white/20 px-2 py-0.5 rounded-full">
                  <Star size={8} className="fill-gold text-gold" />
                  {event.avg_rating.toFixed(1)} ({event.review_count})
                </span>
              )}
            </div>

            {/* Data */}
            {d && !isPast && (
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                  {DAYS_FULL[d.getDay()]} {d.getDate()} {MONTHS_LONG[d.getMonth()]}
                  {d2 && (
                    <span className="text-white/40 font-normal normal-case tracking-normal">
                      {' '}→ {DAYS_SHORT[d2.getDay()]} {d2.getDate()} {MONTHS_SHORT[d2.getMonth()]}
                      <span className="ml-1 text-white/30">({duration} giorni)</span>
                    </span>
                  )}
                </p>
              </div>
            )}
            {isPast && (
              <span className="inline-flex text-[9px] font-bold uppercase tracking-[0.14em] text-white/50 bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full mb-3">
                Già passato
              </span>
            )}

            {/* Nome */}
            <h2
              className="font-serif font-bold text-white leading-[1.1] mb-3 group-hover:text-gold/90 transition-colors duration-200"
              style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2rem)' }}
            >
              {event.name}
            </h2>

            {/* Location */}
            <p className="flex items-center gap-1.5 text-white/70 text-[13px] font-medium">
              <MapPin size={12} className="text-white/50 flex-shrink-0" />
              {event.city}, {event.region}
            </p>
          </div>

          {/* Destra: blocco data calendario */}
          {d && !isPast && (
            <div
              className="flex-shrink-0 self-start rounded-2xl overflow-hidden shadow-xl"
              style={{ minWidth: '68px' }}
            >
              <div className="px-3 py-1 text-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/80 leading-none">
                  {DAYS_SHORT[d.getDay()]}
                </p>
              </div>
              <div className="px-3 pt-1.5 pb-2 text-center bg-white">
                <p className="font-serif font-black leading-none text-espresso" style={{ fontSize: '32px' }}>
                  {d.getDate()}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] leading-none pb-0.5 text-sienna">
                  {MONTHS_SHORT[d.getMonth()]}
                </p>
              </div>
              {d2 && (
                <div className="px-3 pb-1.5 pt-1 text-center bg-white border-t border-border/40">
                  <p className="text-[8px] text-muted font-medium leading-none">→ {d2.getDate()} {MONTHS_SHORT[d2.getMonth()]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Accent line */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}cc, transparent)` }} />

      {/* ── INFO ROW ─────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-7 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-border/50 bg-cream/30">
        {event.start_time && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-coffee font-medium">
            <Clock size={12} className="text-muted/60" />
            {event.start_time}{event.end_time ? `–${event.end_time}` : ''}
          </span>
        )}
        {event.price_info && (
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${isFree ? 'text-emerald-700' : 'text-coffee'}`}>
            <Ticket size={12} className="opacity-60" />
            {isFree ? 'Ingresso gratuito' : event.price_info}
          </span>
        )}
        {mapsUrl && event.address && (
          <a
            href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-sienna transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <MapPin size={11} className="opacity-60" />
            {event.address}
          </a>
        )}
        {event.organizer && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            <span className="text-muted/40">—</span> {event.organizer}
          </span>
        )}
      </div>

      {/* ── DESCRIZIONE ──────────────────────────────────────────────── */}
      {desc && (
        <div className="px-5 sm:px-7 py-4 border-b border-border/50">
          <p className="text-[13px] text-coffee leading-[1.75] line-clamp-2">{desc}</p>
        </div>
      )}

      {/* ── TIP ──────────────────────────────────────────────────────── */}
      {event.tips && (
        <div className="mx-5 sm:mx-7 my-4 flex items-start gap-3 bg-[#fdf8ee] border border-[#e8d69a] rounded-xl px-4 py-3">
          <Lightbulb size={13} className="text-[#b8960a] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#5a4a00]/80 leading-[1.65] line-clamp-2">{event.tips}</p>
        </div>
      )}

      {/* ── CATEGORIE + AZIONI ───────────────────────────────────────── */}
      <div className="px-5 sm:px-7 pb-5 pt-3 flex flex-wrap items-center gap-3">
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 flex-1">
            {cats.map(c => (
              <span key={c} className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-border bg-cream text-muted">
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div onClick={e => { e.stopPropagation(); e.preventDefault() }}>
            <AddToCalendar event={event} />
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold border border-border px-3 py-1.5 rounded-lg text-muted hover:text-espresso hover:border-espresso/30 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <MapPin size={11} /> Maps
            </a>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-[13px] font-bold group-hover:gap-2.5 transition-all duration-200"
            style={{ color: accent }}
          >
            Scopri <ArrowRight size={13} />
          </span>
        </div>
      </div>

    </a>
  )
}
