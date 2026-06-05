export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Clock, Ticket, RefreshCw, Lightbulb, BadgeCheck,
  ArrowLeft, Globe, Instagram, Calendar, ExternalLink, Tag,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import AddToCalendar from '@/components/AddToCalendar'
import RecurringMarketCard from '@/components/RecurringMarketCard'
import { REGION_CONFIG, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'
import type { MarketEvent } from '@/types'
import type { Metadata } from 'next'

interface Props { params: { id: string } }

const MONTHS_LONG = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const DAYS_LONG = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

const EVENT_COLS = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,categories,tags,tips'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data } = await supabase.from('market_events').select('name,city,region,description').eq('id', params.id).single()
  if (!data) return {}
  return {
    title: `${data.name} — ${data.city} | Vintagery`,
    description: data.description?.split('\n')[0]?.slice(0, 155) ?? `Mercato ricorrente a ${data.city}`,
  }
}

function cleanDescription(desc: string | null): { main: string | null; schedule: string | null } {
  if (!desc) return { main: null, schedule: null }
  const scheduleMatch = desc.match(/Cadenza:\s*(.+?)(?:\n|$)/i)
  const schedule = scheduleMatch?.[1]?.trim() ?? null
  const main = desc.split('\n')[0].replace(/\s*Cadenza:.*$/i, '').replace(/\s*Fonte:.*$/i, '').trim()
  return { main: main || null, schedule }
}

export default async function EventoDetailPage({ params }: Props) {
  const supabase = createServerClient()

  const [{ data: ev }, { data: related }] = await Promise.all([
    supabase.from('market_events').select(EVENT_COLS).eq('id', params.id).single(),
    supabase.from('market_events').select(EVENT_COLS).neq('id', params.id).eq('is_recurring', true).limit(3),
  ])

  if (!ev) notFound()
  const event = ev as MarketEvent

  const cfg     = REGION_CONFIG[event.region] ?? DEFAULT_CONFIG
  const pattern = AREA_PATTERNS[cfg.area] ?? AREA_PATTERNS.default
  const [g1, g2] = cfg.gradient
  const accent  = cfg.accent

  const { main: desc, schedule } = cleanDescription(event.description)
  const isFree = /gratuito|gratis|free/i.test(event.price_info ?? '')
  const cats   = event.categories ?? []

  const d     = event.start_date ? new Date(event.start_date + 'T12:00:00') : null
  const d2    = event.end_date && event.end_date !== event.start_date
    ? new Date(event.end_date + 'T12:00:00')
    : null

  const dateLabel = d
    ? `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`
    : null

  return (
    <div className="min-h-screen bg-parchment">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:      `linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundImage: `${pattern}, linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundBlendMode: 'overlay, normal',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />

        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-10">

          {/* Back */}
          <Link
            href="/mercatini"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={14} /> Tutti i mercatini
          </Link>

          {/* Tipo + schedule */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
              {event.event_type === 'antiquariato' ? 'Antiquariato' : event.event_type === 'vinile' ? 'Vinili' : 'Mercatino'}
            </span>
            {schedule && (
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <RefreshCw size={10} className="text-white/80" />
                <span className="text-[11px] font-semibold text-white">{schedule}</span>
              </span>
            )}
            {event.is_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/90 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
                <BadgeCheck size={10} /> Verificato
              </span>
            )}
          </div>

          {/* Nome */}
          <h1 className="font-serif font-bold text-white leading-[1.1] mb-3"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 2.8rem)' }}>
            {event.name}
          </h1>

          {/* Città + data */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-white/80 text-[13px]">
              <MapPin size={13} /> {event.city}, {event.region}
            </span>
            {dateLabel && (
              <span className="inline-flex items-center gap-1.5 text-white/80 text-[13px]">
                <Calendar size={13} />
                {dateLabel}
                {d2 && ` – ${DAYS_LONG[d2.getDay()]} ${d2.getDate()}`}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── CORPO ─────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Scheda info rapida */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {event.start_time && (
            <div className="bg-white border border-border rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Orario</p>
              <p className="text-[14px] font-bold text-espresso flex items-center gap-1.5">
                <Clock size={13} className="text-muted/60" />
                {event.start_time}{event.end_time ? `–${event.end_time}` : ''}
              </p>
            </div>
          )}
          {event.price_info && (
            <div className="bg-white border border-border rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Ingresso</p>
              <p className={`text-[14px] font-bold flex items-center gap-1.5 ${isFree ? 'text-emerald-700' : 'text-espresso'}`}>
                <Ticket size={13} className="opacity-60" />
                {isFree ? 'Gratuito' : event.price_info}
              </p>
            </div>
          )}
          {event.address && (
            <div className="bg-white border border-border rounded-xl px-4 py-3 col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Dove</p>
              <p className="text-[13px] font-semibold text-espresso flex items-start gap-1.5">
                <MapPin size={13} className="text-muted/60 mt-0.5 flex-shrink-0" />
                {event.address}
              </p>
            </div>
          )}
          {event.organizer && (
            <div className="bg-white border border-border rounded-xl px-4 py-3 col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Organizzatore</p>
              <p className="text-[13px] font-semibold text-espresso">{event.organizer}</p>
            </div>
          )}
        </div>

        {/* Descrizione */}
        {desc && (
          <div className="bg-white border border-border rounded-2xl px-6 py-5">
            <h2 className="font-serif font-bold text-espresso text-[16px] mb-3">Il mercato</h2>
            <p className="text-[13.5px] text-coffee leading-[1.75]">{desc}</p>
          </div>
        )}

        {/* Tip */}
        {event.tips && (
          <div className="flex items-start gap-4 bg-[#fdf8ee] border border-[#e8d69a] rounded-2xl px-6 py-5">
            <div className="w-9 h-9 rounded-xl bg-[#b8960a]/15 flex items-center justify-center flex-shrink-0">
              <Lightbulb size={18} className="text-[#b8960a]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8a7000] mb-1.5">Consiglio pratico</p>
              <p className="text-[13.5px] text-[#5a4a00]/80 leading-[1.7]">{event.tips}</p>
            </div>
          </div>
        )}

        {/* Categorie */}
        {cats.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={12} className="text-muted" />
            {cats.map(c => (
              <span
                key={c}
                className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                style={{ color: accent, borderColor: `${accent}50`, background: `${accent}12` }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Link + Azioni */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <AddToCalendar event={event} />
          </div>
          {event.website && (
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border bg-white text-coffee font-semibold text-[12px] px-4 py-2.5 rounded-xl hover:border-sienna hover:text-sienna transition-colors"
            >
              <Globe size={14} /> Sito ufficiale
            </a>
          )}
          {event.instagram && (
            <a
              href={`https://instagram.com/${event.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border bg-white text-coffee font-semibold text-[12px] px-4 py-2.5 rounded-xl hover:border-sienna hover:text-sienna transition-colors"
            >
              <Instagram size={14} /> @{event.instagram}
            </a>
          )}
        </div>

        {/* Altri mercati ricorrenti */}
        {related && related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-bold text-espresso text-[16px]">
                Altri mercati ricorrenti
              </h2>
              <Link href="/mercatini" className="text-[12px] font-semibold text-sienna hover:underline">
                Vedi tutti →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(related as MarketEvent[]).map(r => (
                <RecurringMarketCard key={r.id} event={r} compact />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
