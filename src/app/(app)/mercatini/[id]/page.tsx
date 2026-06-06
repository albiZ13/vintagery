export const revalidate = 86400

import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Clock, Ticket, RefreshCw, Lightbulb, BadgeCheck,
  ArrowLeft, Globe, Instagram, Tag,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import MarketCard from '@/components/MarketCard'
import AddToCalendar from '@/components/AddToCalendar'
import { REGION_CONFIG, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'
import type { Market } from '@/types'
import type { Metadata } from 'next'

interface Props { params: { id: string } }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

const MARKET_COLS = 'id,name,description,address,city,region,website,instagram,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,organizer_name,tips,start_time,end_time,price_info,active_months,tags'

const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
  annuale:     'Annuale',
}

const MONTHS_LONG = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const DAYS_LONG = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data } = await supabase.from('markets').select('name,city,region,description').eq('id', params.id).single()
  if (!data) return {}
  return {
    title: `${data.name} — ${data.city} | Vintagery`,
    description: data.description?.split('\n')[0]?.slice(0, 155) ?? `Mercato ricorrente a ${data.city}`,
    alternates: { canonical: `${SITE_URL}/mercatini/${params.id}` },
  }
}

export default async function MercatinoPage({ params }: Props) {
  const supabase = createServerClient()

  const [{ data: market }, { data: related }] = await Promise.all([
    supabase.from('markets').select(MARKET_COLS).eq('id', params.id).single(),
    supabase.from('markets').select(MARKET_COLS).neq('id', params.id).limit(3),
  ])

  if (!market) notFound()

  const cfg     = REGION_CONFIG[market.region] ?? DEFAULT_CONFIG
  const pattern = AREA_PATTERNS[cfg.area] ?? AREA_PATTERNS.default
  const [g1, g2] = cfg.gradient
  const accent  = cfg.accent

  const isFree    = /gratuito|gratis|free/i.test(market.price_info ?? '')
  const cats      = (market.categories ?? []) as string[]
  const schedule  = market.schedule_notes ?? (market.frequency ? FREQ_LABEL[market.frequency] : null)

  const d = market.next_date ? new Date(market.next_date + 'T12:00:00') : null
  const dateLabel = d ? `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}` : null

  return (
    <div className="min-h-screen bg-parchment">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:          `linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundImage:     `${pattern}, linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundBlendMode: 'overlay, normal',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />

        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-10">

          <Link
            href="/mercatini"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={14} /> Tutti i mercatini
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
              {cats[0] ?? 'Mercato ricorrente'}
            </span>
            {schedule && (
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <RefreshCw size={10} className="text-white/80" />
                <span className="text-[11px] font-semibold text-white">{schedule}</span>
              </span>
            )}
            {market.is_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/90 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
                <BadgeCheck size={10} /> Verificato
              </span>
            )}
          </div>

          <h1 className="font-serif font-bold text-white leading-[1.1] mb-3"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 2.8rem)' }}>
            {market.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-white/80 text-[13px]">
              <MapPin size={13} /> {market.city}, {market.region}
            </span>
            {dateLabel && (
              <span className="inline-flex items-center gap-1.5 text-white/80 text-[13px]">
                <Clock size={13} /> {dateLabel}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── CORPO ───────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Scheda info rapida */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {market.start_time && (
            <div className="bg-white border border-border rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Orario</p>
              <p className="text-[14px] font-bold text-espresso flex items-center gap-1.5">
                <Clock size={13} className="text-muted/60" />
                {market.start_time}{market.end_time ? `–${market.end_time}` : ''}
              </p>
            </div>
          )}
          {market.price_info && (
            <div className="bg-white border border-border rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Ingresso</p>
              <p className={`text-[14px] font-bold flex items-center gap-1.5 ${isFree ? 'text-emerald-700' : 'text-espresso'}`}>
                <Ticket size={13} className="opacity-60" />
                {isFree ? 'Gratuito' : market.price_info}
              </p>
            </div>
          )}
          {market.address && (
            <div className="bg-white border border-border rounded-xl px-4 py-3 col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Dove</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(market.address + ', ' + market.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-espresso flex items-start gap-1.5 hover:text-sienna transition-colors group"
              >
                <MapPin size={13} className="text-muted/60 mt-0.5 flex-shrink-0 group-hover:text-sienna transition-colors" />
                {market.address}, {market.city}
              </a>
            </div>
          )}
          {market.organizer_name && (
            <div className="bg-white border border-border rounded-xl px-4 py-3 col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Organizzatore</p>
              <p className="text-[13px] font-semibold text-espresso">{market.organizer_name}</p>
            </div>
          )}
        </div>

        {/* Descrizione */}
        {market.description && (
          <div className="bg-white border border-border rounded-2xl px-6 py-5">
            <h2 className="font-serif font-bold text-espresso text-[16px] mb-3">Il mercato</h2>
            <p className="text-[13.5px] text-coffee leading-[1.75]">
              {market.description.split('\n')[0]}
            </p>
          </div>
        )}

        {/* Tip */}
        {market.tips && (
          <div className="flex items-start gap-4 bg-[#fdf8ee] border border-[#e8d69a] rounded-2xl px-6 py-5">
            <div className="w-9 h-9 rounded-xl bg-[#b8960a]/15 flex items-center justify-center flex-shrink-0">
              <Lightbulb size={18} className="text-[#b8960a]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8a7000] mb-1.5">Consiglio pratico</p>
              <p className="text-[13.5px] text-[#5a4a00]/80 leading-[1.7]">{market.tips}</p>
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

        {/* Azioni: calendario + link */}
        <div className="flex flex-wrap gap-3">
          {market.next_date && (
            <AddToCalendar event={{
              id:          market.id,
              name:        market.name,
              start_date:  market.next_date,
              start_time:  market.start_time ?? undefined,
              end_time:    market.end_time ?? undefined,
              address:     market.address ?? undefined,
              city:        market.city,
              region:      market.region,
              description: market.description ?? undefined,
              price_info:  market.price_info ?? undefined,
              organizer:   market.organizer_name ?? undefined,
            }} />
          )}
          {market.website && (
            <a
              href={market.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border bg-white text-coffee font-semibold text-[12px] px-4 py-2.5 rounded-xl hover:border-sienna hover:text-sienna transition-colors"
            >
              <Globe size={14} /> Sito ufficiale
            </a>
          )}
          {market.instagram && (
            <a
              href={`https://instagram.com/${market.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border bg-white text-coffee font-semibold text-[12px] px-4 py-2.5 rounded-xl hover:border-sienna hover:text-sienna transition-colors"
            >
              <Instagram size={14} /> @{market.instagram.replace('@', '')}
            </a>
          )}
        </div>

        {/* Altri mercati */}
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
              {(related as unknown as Market[]).map(r => (
                <MarketCard key={r.id} market={r} compact />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
