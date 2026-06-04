'use client'

import { MapPin, Clock, ExternalLink, RefreshCw, BadgeCheck, Ticket } from 'lucide-react'
import AddToCalendar from './AddToCalendar'
import type { MarketEvent } from '@/types'

export type { MarketEvent }

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  mercatino:     { label: 'Mercatino',      color: 'text-sienna',     bg: 'bg-sienna/8'     },
  antiquariato:  { label: 'Antiquariato',   color: 'text-espresso',   bg: 'bg-espresso/8'   },
  vinokilo:      { label: 'Kilo Vintage',   color: 'text-coffee',     bg: 'bg-coffee/8'     },
  svuotacantina: { label: 'Svuotacantina',  color: 'text-muted',      bg: 'bg-muted/8'      },
  svendita:      { label: 'Svendita',       color: 'text-sienna',     bg: 'bg-sienna/8'     },
  collezionismo: { label: 'Collezionismo',  color: 'text-coffee',     bg: 'bg-coffee/8'     },
  fumetti:       { label: 'Fumetti',        color: 'text-coffee',     bg: 'bg-coffee/8'     },
  vinile:        { label: 'Vinili',         color: 'text-espresso',   bg: 'bg-espresso/8'   },
  vinili:        { label: 'Vinili',         color: 'text-espresso',   bg: 'bg-espresso/8'   },
  fair_price:    { label: 'Fair Price',     color: 'text-gold',       bg: 'bg-gold/8'       },
  brand_sale:    { label: 'Brand & Lusso',  color: 'text-sienna',     bg: 'bg-sienna/8'     },
  memorabilia:   { label: 'Memorabilia',    color: 'text-coffee',     bg: 'bg-coffee/8'     },
}

const MONTHS_SHORT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const DAYS_FULL    = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

function DateBlock({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + 'T12:00:00')
  return (
    <div className="flex-shrink-0 flex flex-col items-center w-[52px]">
      <div className="w-full bg-espresso rounded-t-lg py-1 text-center">
        <span className="text-[8px] font-bold text-parchment/60 uppercase tracking-[0.15em]">
          {DAYS_FULL[d.getDay()].slice(0, 3)}
        </span>
      </div>
      <div className="w-full bg-parchment border-x border-b border-espresso/15 rounded-b-lg py-1.5 text-center">
        <span className="block text-[22px] font-black text-espresso leading-none">{d.getDate()}</span>
        <span className="block text-[8px] font-bold text-sienna uppercase tracking-[0.12em] mt-0.5">
          {MONTHS_SHORT[d.getMonth()]}
        </span>
      </div>
    </div>
  )
}

const OFFICIAL_SOURCES = new Set([
  'scraper-recurring_fairs', 'scraper-comuni', 'scraper-eventbrite',
  'scraper-vinokilo', 'scraper-neventum', 'scraper-aggregators', 'manual',
])

function isOfficial(url: string | null, source?: string | null): boolean {
  if (!url) return false
  if (source && OFFICIAL_SOURCES.has(source)) return true
  try {
    const d = new URL(url).hostname.replace(/^www\./, '')
    return /comune\..+\.it$|\.regione\..+\.it$|fieraantiquaria\.org|balon\.it|vinokilo\.events/.test(d)
  } catch { return false }
}

interface Props { event: MarketEvent; compact?: boolean }

export default function EventCard({ event, compact = false }: Props) {
  const meta    = TYPE_META[event.event_type] ?? TYPE_META.mercatino
  const official = isOfficial(event.website, event.source)
  const isFree  = /gratuito|gratis|free|libero/i.test(event.price_info ?? '')

  return (
    <div className={`group relative bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_6px_28px_rgba(15,32,64,0.10)] hover:-translate-y-px ${
      event.is_featured ? 'border-gold/40 ring-1 ring-gold/20' : 'border-border'
    }`}>

      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-espresso via-sienna to-transparent" />

      <div className="px-5 pt-4 pb-4">

        {/* Row 1: type + badges */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-md ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
          <div className="flex items-center gap-2">
            {event.is_recurring && (
              <span className="text-[10px] text-muted flex items-center gap-0.5">
                <RefreshCw size={9} /> Ricorrente
              </span>
            )}
            {event.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-espresso/70 bg-espresso/6 border border-espresso/15 px-2 py-0.5 rounded-full">
                <BadgeCheck size={9} /> Verificato
              </span>
            )}
          </div>
        </div>

        {/* Row 2: date + name */}
        <div className="flex gap-4 mb-4">
          {event.start_date && <DateBlock dateStr={event.start_date} />}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-serif font-semibold text-espresso text-[15px] leading-[1.3] group-hover:text-sienna transition-colors duration-200 line-clamp-2">
              {event.name}
            </h3>
            {event.end_date && event.end_date !== event.start_date && (
              <p className="text-[11px] text-muted mt-1">
                fino al {new Date(event.end_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: details */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-start gap-2">
            <MapPin size={11} className="text-sienna/60 mt-0.5 flex-shrink-0" />
            <span className="text-[12px] text-coffee leading-snug">
              <span className="font-medium">{event.city}</span>
              {event.region && event.region !== event.city && (
                <span className="text-muted"> · {event.region}</span>
              )}
              {event.address && (
                <span className="text-muted block text-[11px] mt-0.5">{event.address}</span>
              )}
            </span>
          </div>
          {event.start_time && (
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-sienna/60 flex-shrink-0" />
              <span className="text-[12px] text-coffee">
                {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
              </span>
            </div>
          )}
          {event.price_info && (
            <div className="flex items-center gap-2">
              <Ticket size={11} className="text-sienna/60 flex-shrink-0" />
              <span className={`text-[12px] font-medium ${isFree ? 'text-green-700' : 'text-coffee'}`}>
                {event.price_info}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {!compact && event.description && (() => {
          const line = event.description.split('\n')[0].trim()
          return line.length > 20 ? (
            <p className="text-[11px] text-muted leading-relaxed mb-4 line-clamp-2 pl-3 border-l border-border">
              {line}
            </p>
          ) : null
        })()}

        {/* Organizer */}
        {event.organizer && (
          <p className="text-[11px] text-muted mb-4">
            <span className="text-muted/60">Organizzatore — </span>
            <span className="text-coffee font-medium">{event.organizer}</span>
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50"
          onClick={e => e.stopPropagation()}>
          <AddToCalendar event={event} />
          {official && event.website && (
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sienna hover:text-espresso transition-colors"
            >
              Scopri <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
