export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Sparkles } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import EventCard, { type MarketEvent } from '@/components/EventCard'
import MarketCard from '@/components/MarketCard'
import EventsClient from '@/components/EventsClient'
import VicinoAMe from '@/components/VicinoAMe'
import { ITALIAN_REGIONS, MONTHS_IT } from '@/types'
import type { Market } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mercatini & Eventi vintage in Italia' }

interface Props {
  searchParams: {
    month?: string
    year?: string
    type?: string
    region?: string
  }
}

const EVENT_TYPES = [
  { value: 'all',           label: 'Tutto',         emoji: '✨' },
  { value: 'mercatino',     label: 'Mercatini',     emoji: '🏪' },
  { value: 'antiquariato',  label: 'Antiquariato',  emoji: '🏛️' },
  { value: 'vinokilo',      label: 'Kilo Vintage',  emoji: '⚖️' },
  { value: 'svuotacantina', label: 'Svuotacantina', emoji: '📦' },
  { value: 'brand_sale',    label: 'Brand & Lusso', emoji: '👗' },
  { value: 'vinili',        label: 'Vinili & Fumetti', emoji: '🎵' },
]

function getMonthYear(sp: Props['searchParams']) {
  const now   = new Date()
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1
  const year  = sp.year  ? parseInt(sp.year)  : now.getFullYear()
  return { month, year }
}

// ── Unified content: markets + events grouped by region ───────────────────────

async function TuttiIContenuti({ searchParams }: Props) {
  const supabase = createServerClient()
  const { month, year } = getMonthYear(searchParams)
  const typeFilter   = searchParams.type   ?? 'all'
  const regionFilter = searchParams.region ?? 'all'

  const startOfMonth = `${year}-${String(month).padStart(2,'0')}-01`
  const endOfMonth   = new Date(year, month, 0).toISOString().split('T')[0]

  const MARKET_COLS = 'id,name,description,city,region,address,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count'
  const EVENT_COLS  = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,categories,tags'

  // Fetch markets (recurring always + occasionale if date in month)
  let marketsQuery = supabase
    .from('markets')
    .select(MARKET_COLS)
    .or(
      `frequency.in.(settimanale,mensile),` +
      `and(next_date.gte.${startOfMonth},next_date.lte.${endOfMonth})`
    )
    .order('is_featured', { ascending: false })
    .order('avg_rating',  { ascending: false })

  if (regionFilter !== 'all') marketsQuery = marketsQuery.eq('region', regionFilter)

  // Fetch dated events — skip if type filter is active (markets don't have event_type)
  let eventsQuery = supabase
    .from('market_events')
    .select(EVENT_COLS)
    .gte('start_date', startOfMonth)
    .lte('start_date', endOfMonth)
    .order('is_featured', { ascending: false })
    .order('start_date',  { ascending: true })

  if (typeFilter   !== 'all') eventsQuery = eventsQuery.eq('event_type', typeFilter)
  if (regionFilter !== 'all') eventsQuery = eventsQuery.eq('region', regionFilter)

  const [{ data: markets }, { data: events }] = await Promise.all([
    // Skip markets when a specific (non-mercatino) type filter is active
    typeFilter === 'all' || typeFilter === 'mercatino' || typeFilter === 'antiquariato'
      ? marketsQuery.limit(30)
      : Promise.resolve({ data: [] as Market[] }),
    eventsQuery.limit(200),
  ])

  // Group by region
  const byRegion: Record<string, { markets: Market[]; events: MarketEvent[] }> = {}

  ;((markets ?? []) as Market[]).forEach((m: Market) => {
    if (!byRegion[m.region]) byRegion[m.region] = { markets: [], events: [] }
    byRegion[m.region].markets.push(m)
  })
  ;(events ?? []).forEach((e: MarketEvent) => {
    if (!byRegion[e.region]) byRegion[e.region] = { markets: [], events: [] }
    byRegion[e.region].events.push(e)
  })

  const sortedRegions = Object.keys(byRegion).sort()
  const totalItems = (markets?.length ?? 0) + (events?.length ?? 0)

  if (totalItems === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
        <Sparkles size={32} className="text-muted mx-auto mb-3" />
        <h3 className="font-serif text-lg font-semibold text-espresso mb-1">Nessun contenuto trovato</h3>
        <p className="text-muted text-sm mb-5 max-w-sm mx-auto">
          Per {MONTHS_IT[month - 1]} {year} non ci sono ancora eventi con questi filtri.
        </p>
        <EventsClient month={month} year={year} asButton />
      </div>
    )
  }

  return (
    <>
      {sortedRegions.map(region => {
        const { markets: rMarkets, events: rEvents } = byRegion[region]
        const total = rMarkets.length + rEvents.length
        return (
          <div key={region} className="mb-12">
            {/* Region header */}
            <div className="flex items-center gap-3 mb-5">
              <MapPin size={14} className="text-sienna flex-shrink-0" />
              <h2 className="font-serif text-lg font-semibold text-espresso">{region}</h2>
              <span className="text-muted text-[12px]">
                {rMarkets.length > 0 && (
                  <>{rMarkets.length} fisso{rMarkets.length !== 1 ? 'i' : ''}{rEvents.length > 0 ? ' · ' : ''}</>
                )}
                {rEvents.length > 0 && (
                  <>{rEvents.length} event{rEvents.length !== 1 ? 'i' : 'o'}</>
                )}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Unified grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Recurring markets first */}
              {rMarkets.map((m: Market) => (
                <MarketCard key={`m-${m.id}`} market={m} compact />
              ))}
              {/* Dated events after */}
              {rEvents.map((e: MarketEvent) => (
                <EventCard key={`e-${e.id}`} event={e} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MercatiniPage({ searchParams }: Props) {
  const { month, year } = getMonthYear(searchParams)
  const typeFilter   = searchParams.type   ?? 'all'
  const regionFilter = searchParams.region ?? 'all'

  const prevMonth = month === 1  ? 12 : month - 1
  const nextMonth = month === 12 ? 1  : month + 1
  const prevYear  = month === 1  ? year - 1 : year
  const nextYear  = month === 12 ? year + 1 : year

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sienna text-sm font-medium mb-2">
          <Sparkles size={14} /> Aggiornato automaticamente ogni mese
        </div>
        <h1 className="font-serif text-display-md text-espresso mb-2">
          Vintage & Antiquariato in Italia
        </h1>
        <p className="text-muted text-body-sm max-w-xl leading-relaxed">
          Mercatini fissi, fiere di antiquariato, Vinokilo, svuotacantine, svendite brand,
          fumetti e vinili — tutte le regioni italiane.
        </p>
      </div>

      {/* Month nav + sync */}
      <div className="flex items-center justify-between bg-white border border-border rounded-xl px-5 py-3 mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/mercatini?month=${prevMonth}&year=${prevYear}&type=${typeFilter}&region=${regionFilter}`}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-coffee hover:border-sienna hover:text-sienna transition-colors font-bold"
          >‹</Link>
          <div className="text-center min-w-[150px]">
            <span className="font-serif font-bold text-espresso text-lg">
              {MONTHS_IT[month - 1]} {year}
            </span>
          </div>
          <Link
            href={`/mercatini?month=${nextMonth}&year=${nextYear}&type=${typeFilter}&region=${regionFilter}`}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-coffee hover:border-sienna hover:text-sienna transition-colors font-bold"
          >›</Link>
        </div>
        <div className="flex items-center gap-2">
          <VicinoAMe currentRegion={regionFilter} month={month} year={year} type={typeFilter} />
          <EventsClient month={month} year={year} />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EVENT_TYPES.map(t => (
          <Link
            key={t.value}
            href={`/mercatini?month=${month}&year=${year}&type=${t.value}&region=${regionFilter}`}
            className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
              typeFilter === t.value
                ? 'bg-espresso text-parchment border-espresso'
                : 'bg-white text-coffee border-border hover:border-sienna'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </Link>
        ))}
      </div>

      {/* Region filter — tutte le 20 regioni */}
      <div className="flex flex-wrap gap-1.5 mb-10">
        <Link
          href={`/mercatini?month=${month}&year=${year}&type=${typeFilter}&region=all`}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
            regionFilter === 'all' ? 'bg-sienna text-parchment border-sienna' : 'bg-white text-muted border-border hover:border-sienna'
          }`}
        >Tutte</Link>
        {ITALIAN_REGIONS.map(r => (
          <Link
            key={r}
            href={`/mercatini?month=${month}&year=${year}&type=${typeFilter}&region=${encodeURIComponent(r)}`}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              regionFilter === r ? 'bg-sienna text-parchment border-sienna' : 'bg-white text-muted border-border hover:border-sienna'
            }`}
          >{r}</Link>
        ))}
      </div>

      {/* Unified content */}
      <Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_,i) => (
            <div key={i} className="bg-cream animate-pulse rounded-2xl h-72" />
          ))}
        </div>
      }>
        <TuttiIContenuti searchParams={searchParams} />
      </Suspense>

    </div>
  )
}
