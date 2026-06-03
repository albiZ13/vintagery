'use client'

import { MapPin, Clock, Euro, ExternalLink, RefreshCw, BadgeCheck } from 'lucide-react'
import AddToCalendar from './AddToCalendar'
import type { MarketEvent } from '@/types'

export type { MarketEvent }

interface TypeMeta {
  label: string
  emoji: string
  textColor: string
  pillBg: string
  pillText: string
  accentBar: string
}

const TYPE_META: Record<string, TypeMeta> = {
  mercatino:     { label: 'Mercatino',      emoji: '🏪', textColor: 'text-sienna',     pillBg: 'bg-sienna/10',    pillText: 'text-sienna',     accentBar: 'bg-sienna'    },
  antiquariato:  { label: 'Antiquariato',   emoji: '🏛️', textColor: 'text-espresso',   pillBg: 'bg-amber-100',    pillText: 'text-amber-800',  accentBar: 'bg-amber-700' },
  vinokilo:      { label: 'Kilo Vintage',   emoji: '⚖️', textColor: 'text-amber-700',  pillBg: 'bg-amber-50',     pillText: 'text-amber-700',  accentBar: 'bg-amber-500' },
  svuotacantina: { label: 'Svuotacantina',  emoji: '📦', textColor: 'text-stone-600',  pillBg: 'bg-stone-100',    pillText: 'text-stone-700',  accentBar: 'bg-stone-500' },
  svendita:      { label: 'Svendita',       emoji: '🏷️', textColor: 'text-red-600',    pillBg: 'bg-red-50',       pillText: 'text-red-700',    accentBar: 'bg-red-500'   },
  memorabilia:   { label: 'Memorabilia',    emoji: '🎬', textColor: 'text-purple-700', pillBg: 'bg-purple-50',    pillText: 'text-purple-700', accentBar: 'bg-purple-500'},
  collezionismo: { label: 'Collezionismo',  emoji: '🏅', textColor: 'text-blue-700',   pillBg: 'bg-blue-50',      pillText: 'text-blue-700',   accentBar: 'bg-blue-500'  },
  fumetti:       { label: 'Fumetti',        emoji: '📚', textColor: 'text-orange-700', pillBg: 'bg-orange-50',    pillText: 'text-orange-700', accentBar: 'bg-orange-500'},
  vinili:        { label: 'Vinili',         emoji: '🎵', textColor: 'text-green-700',  pillBg: 'bg-green-50',     pillText: 'text-green-700',  accentBar: 'bg-green-600' },
  fair_price:    { label: 'Fair Price',     emoji: '🏷️', textColor: 'text-violet-700', pillBg: 'bg-violet-50',    pillText: 'text-violet-700', accentBar: 'bg-violet-500'},
  brand_sale:    { label: 'Brand & Lusso',  emoji: '👗', textColor: 'text-pink-700',   pillBg: 'bg-pink-50',      pillText: 'text-pink-700',   accentBar: 'bg-pink-500'  },
}

const OFFICIAL_SOURCES = new Set([
  'scraper-recurring_fairs', 'scraper-comuni', 'scraper-eventbrite',
  'scraper-vinokilo', 'scraper-neventum', 'manual',
])

function isOfficialLink(url: string | null, source?: string | null): boolean {
  if (!url) return false
  if (source && OFFICIAL_SOURCES.has(source)) return true
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')
    return (
      /^comune\..+\.it$/.test(domain)  ||
      /turismo/.test(domain)           ||
      /\.regione\..+\.it$/.test(domain)||
      /\.provincia\..+\.it$/.test(domain) ||
      ['fieraantiquaria.org','balon.it','mercanteinfiera.it','vinokilo.events'].includes(domain) ||
      domain.endsWith('intoscana.it')  ||
      domain.endsWith('emiliaromagnaturismo.it')
    )
  } catch { return false }
}

const MONTHS_SHORT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const DAYS_SHORT   = ['DOM','LUN','MAR','MER','GIO','VEN','SAB']

function DateBlock({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr)
  return (
    <div className="flex-shrink-0 w-11 text-center select-none">
      <div className="bg-sienna rounded-t-lg px-1 py-0.5">
        <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest">
          {DAYS_SHORT[d.getDay()]}
        </span>
      </div>
      <div className="bg-white border border-t-0 border-sienna/30 rounded-b-lg px-1 py-1">
        <span className="block text-[18px] font-bold text-espresso leading-none">{d.getDate()}</span>
        <span className="block text-[8px] font-bold text-sienna uppercase tracking-widest mt-0.5">
          {MONTHS_SHORT[d.getMonth()]}
        </span>
      </div>
    </div>
  )
}

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start)
  if (!end || end === start) {
    return s.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const e = new Date(end)
  return `${s.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

interface Props {
  event: MarketEvent
  compact?: boolean
}

export default function EventCard({ event, compact = false }: Props) {
  const meta      = TYPE_META[event.event_type] ?? TYPE_META.mercatino
  const showLink  = isOfficialLink(event.website, event.source)
  const Wrapper   = event.website ? 'a' : 'div'
  const wrapProps = event.website
    ? { href: event.website, target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <Wrapper
      {...wrapProps}
      className={`relative bg-white border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_4px_20px_rgba(28,46,74,0.10)] hover:-translate-y-0.5 group block ${
        event.is_featured ? 'ring-1 ring-[#c9a84c]/50' : ''
      }`}
    >

      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] ${meta.accentBar}`} />

      <div className="pl-5 pr-4 pt-4 pb-4">

        {/* Top row: type pill + badges */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${meta.pillBg} ${meta.pillText}`}>
            <span role="img" aria-hidden>{meta.emoji}</span> {meta.label}
          </span>
          <div className="flex items-center gap-1.5">
            {event.is_recurring && (
              <span title="Evento ricorrente">
                <RefreshCw size={10} className="text-muted" />
              </span>
            )}
            {event.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                <BadgeCheck size={9} /> Verificato
              </span>
            )}
            {event.is_featured && (
              <span className="text-[9px] font-bold text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/30 px-1.5 py-0.5 rounded-full">
                In evidenza
              </span>
            )}
          </div>
        </div>

        {/* Main: date block + content */}
        <div className="flex gap-3 mb-3">
          <DateBlock dateStr={event.start_date} />
          <div className="flex-1 min-w-0">
            <h3 className={`font-serif font-semibold text-espresso text-[15px] leading-snug mb-1.5 transition-colors group-hover:${meta.textColor}`}>
              {event.name}
            </h3>
            {event.end_date && event.end_date !== event.start_date && (
              <p className="text-[11px] text-muted mb-1">
                fino al {new Date(event.end_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-1 mb-3 text-[12px]">
          {(event.start_time || event.end_time) && (
            <div className="flex items-center gap-1.5 text-muted">
              <Clock size={11} className="text-sienna/70 flex-shrink-0" />
              <span className="text-coffee">
                {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
              </span>
            </div>
          )}
          <div className="flex items-start gap-1.5 text-muted">
            <MapPin size={11} className="text-sienna/70 flex-shrink-0 mt-0.5" />
            <span className="text-coffee leading-snug">
              <span className="font-medium">{event.city}</span>
              {event.address && (
                <span className="text-muted font-normal"> · {event.address}</span>
              )}
            </span>
          </div>
          {event.price_info && (
            <div className="flex items-center gap-1.5">
              <Euro size={11} className="text-sienna/70 flex-shrink-0" />
              <span className={`font-medium ${
                /gratuito|gratis|free|libero/i.test(event.price_info)
                  ? 'text-green-700'
                  : 'text-coffee'
              }`}>
                {event.price_info}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {!compact && event.description && (
          <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2 border-l-2 border-border pl-2.5">
            {event.description.split('\n')[0]}
          </p>
        )}

        {/* Organizer */}
        {event.organizer && (
          <p className="text-[11px] text-muted mb-3">
            Organizzatore: <span className="text-coffee font-medium">{event.organizer}</span>
          </p>
        )}

        {/* Separator */}
        <div
          className="border-t border-border/60 pt-3 flex items-center justify-between gap-2 flex-wrap"
          onClick={e => e.stopPropagation()}
        >
          <AddToCalendar event={event} />
          {showLink && (
            <a
              href={event.website!}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.textColor} hover:underline`}
            >
              Scopri <ExternalLink size={10} />
            </a>
          )}
        </div>

      </div>
    </Wrapper>
  )
}
