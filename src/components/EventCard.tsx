'use client'

import { MapPin, Clock, ExternalLink, RefreshCw, BadgeCheck, Ticket, Lightbulb, CalendarPlus } from 'lucide-react'
import AddToCalendar from './AddToCalendar'
import type { MarketEvent } from '@/types'

export type { MarketEvent }

const TYPE_LABEL: Record<string, string> = {
  mercatino:     'Mercatino',
  antiquariato:  'Antiquariato',
  vinokilo:      'Kilo Vintage',
  svuotacantina: 'Svuotacantina',
  svendita:      'Svendita',
  collezionismo: 'Collezionismo',
  fumetti:       'Fumetti',
  vinile:        'Vinili',
  vinili:        'Vinili',
  fair_price:    'Fair Price',
  brand_sale:    'Brand & Lusso',
  memorabilia:   'Memorabilia',
}

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const DAYS   = ['dom','lun','mar','mer','gio','ven','sab']

const OFFICIAL_SOURCES = new Set([
  'scraper-recurring_fairs','scraper-comuni','scraper-eventbrite',
  'scraper-vinokilo','scraper-neventum','scraper-aggregators','manual',
])

function isOfficial(url: string | null, source?: string | null) {
  if (source && OFFICIAL_SOURCES.has(source)) return true
  if (!url) return false
  try {
    const d = new URL(url).hostname.replace(/^www\./, '')
    return /comune\..+\.it$|\.regione\..+\.it$|fieraantiquaria\.org|balon\.it|vinokilo\.events/.test(d)
  } catch { return false }
}

function recurringLabel(tags: string[] | null): string | null {
  if (!tags) return null
  const t = tags.join(' ').toLowerCase()
  if (t.includes('settimanale') || t.includes('ogni martedì') || t.includes('ogni domenica') || t.includes('ogni sabato')) return 'Settimanale'
  if (t.includes('mensile') || t.includes('ogni mese')) return 'Mensile'
  if (t.includes('bimestrale')) return 'Bimestrale'
  return 'Ricorrente'
}

interface Props { event: MarketEvent; compact?: boolean }

export default function EventCard({ event, compact = false }: Props) {
  const label    = TYPE_LABEL[event.event_type] ?? 'Mercatino'
  const official = isOfficial(event.website, event.source)
  const isFree   = /gratuito|gratis|free|libero/i.test(event.price_info ?? '')
  const recLabel = event.is_recurring ? recurringLabel(event.tags) : null

  const d        = event.start_date ? new Date(event.start_date + 'T12:00:00') : null
  const hasEnd   = event.end_date && event.end_date !== event.start_date

  const desc = event.description
    ? event.description.split('\n')[0].replace(/\s*Fonte:.*$/i, '').trim()
    : null

  return (
    <div className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-150 hover:shadow-[0_4px_20px_rgba(15,32,64,0.09)] ${
      event.is_recurring
        ? 'border-espresso/15 hover:border-espresso/30'
        : 'border-border hover:border-sienna/30'
    } ${event.is_featured ? 'ring-1 ring-gold/30' : ''}`}>

      {/* Top bar — verde per ricorrenti, sienna per one-time */}
      <div className={`h-[3px] w-full ${
        event.is_recurring ? 'bg-emerald-600' :
        event.event_type === 'antiquariato'  ? 'bg-espresso' :
        event.event_type === 'vinokilo'      ? 'bg-coffee' :
        event.event_type === 'vinile'        ? 'bg-sienna' :
        event.event_type === 'svuotacantina' ? 'bg-muted' :
        event.event_type === 'fumetti'       ? 'bg-gold' :
        event.event_type === 'brand_sale'    ? 'bg-gold' :
        'bg-sienna'
      }`} />

      <div className="p-4">

        {/* Riga 1: tipo + badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {label}
            </span>
            {/* Badge ricorrente — verde, prominente */}
            {event.is_recurring && recLabel && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <RefreshCw size={8} /> {recLabel}
              </span>
            )}
            {/* Badge solo questo mese */}
            {!event.is_recurring && (
              <span className="inline-flex items-center text-[10px] font-medium text-sienna/80 bg-sienna/5 border border-sienna/15 px-2 py-0.5 rounded-full">
                Solo questo mese
              </span>
            )}
          </div>
          {event.is_verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-espresso/60 bg-espresso/5 px-2 py-0.5 rounded-full border border-espresso/10">
              <BadgeCheck size={9} /> Verificato
            </span>
          )}
        </div>

        {/* Riga 2: data + titolo */}
        <div className="mb-3">
          {d && (
            <p className="text-[11px] text-muted mb-1 font-medium">
              {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]}
              {hasEnd && (() => {
                const e2 = new Date(event.end_date! + 'T12:00:00')
                return ` – ${e2.getDate()} ${MONTHS[e2.getMonth()]}`
              })()}
            </p>
          )}
          <h3 className={`font-serif font-bold text-espresso leading-[1.25] group-hover:text-sienna transition-colors duration-150 ${
            compact ? 'text-[14px]' : 'text-[16px]'
          }`}>
            {event.name}
          </h3>
        </div>

        {/* Riga 3: luogo + orario */}
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

        {/* Descrizione */}
        {!compact && desc && desc.length > 20 && (
          <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2">
            {desc}
          </p>
        )}

        {/* 💡 Consiglio */}
        {!compact && event.tips && (
          <div className="flex items-start gap-2 mb-3 bg-gold/6 border border-gold/15 rounded-lg px-3 py-2">
            <Lightbulb size={11} className="text-gold flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-espresso/75 leading-relaxed">{event.tips}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40"
          onClick={e => e.stopPropagation()}>
          <AddToCalendar event={event} />
          {official && event.website && (
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sienna hover:text-espresso transition-colors"
            >
              Scopri <ExternalLink size={10} />
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
