export const revalidate = 300

import React, { Suspense } from 'react'
import Link from 'next/link'
import { MapPin, Sparkles } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import EventCard, { type MarketEvent } from '@/components/EventCard'
import MarketCard from '@/components/MarketCard'
import RecurringMarketCard from '@/components/RecurringMarketCard'
import EventsClient from '@/components/EventsClient'
import SubscribeWidget from '@/components/SubscribeWidget'
import RegionDropdown from '@/components/RegionDropdown'
import { MONTHS_IT } from '@/types'
import type { Market } from '@/types'
import type { Metadata } from 'next'

export function generateMetadata({ searchParams }: Props): Metadata {
  const { month, year } = getMonthYear(searchParams)
  const regionFilter = searchParams.region ?? 'all'
  const monthName    = MONTHS_IT[month - 1]
  const regionSuffix = regionFilter !== 'all' ? ` in ${regionFilter}` : ' in Italia'
  return {
    title:       `Mercatini vintage${regionSuffix} — ${monthName} ${year} | Vintagery`,
    description: `Mercatini dell'usato, antiquariato e fiere vintage${regionSuffix} per ${monthName} ${year}. Date, orari e info aggiornati.`,
    alternates:  { canonical: 'https://vintagery.it/mercatini' },
  }
}

interface Props {
  searchParams: {
    month?: string
    year?: string
    type?: string
    region?: string
  }
}


function getMonthYear(sp: Props['searchParams']) {
  const now   = new Date()
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1
  const year  = sp.year  ? parseInt(sp.year)  : now.getFullYear()
  return { month, year }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ icon, title, subtitle, count }: {
  icon: React.ReactNode; title: string; subtitle: string; count: number
}) {
  return (
    <div className="flex items-end gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h2 className="font-serif font-bold text-espresso text-[18px]">{title}</h2>
          <span className="text-[11px] font-medium text-muted bg-cream border border-border px-2 py-0.5 rounded-full ml-1">
            {count}
          </span>
        </div>
        <p className="text-[12px] text-muted">{subtitle}</p>
      </div>
      <div className="flex-1 h-px bg-border mb-1" />
    </div>
  )
}

function RegionLabel({ region, count }: { region: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <MapPin size={11} className="text-sienna/50 flex-shrink-0" />
      <span className="text-[12px] font-semibold text-espresso/70">{region}</span>
      <span className="text-[10px] text-muted">({count})</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  )
}

// ── Main content component ────────────────────────────────────────────────────

async function TuttiIContenuti({ searchParams }: Props) {
  const supabase = createServerClient()
  const { month, year } = getMonthYear(searchParams)
  const typeFilter   = searchParams.type   ?? 'all'
  const regionFilter = searchParams.region ?? 'all'

  const startOfMonth = `${year}-${String(month).padStart(2,'0')}-01`
  const endOfMonth   = new Date(year, month, 0).toISOString().split('T')[0]

  const MARKET_COLS = 'id,name,description,city,region,address,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,tips,start_time,end_time,price_info,active_months,tags'
  const EVENT_COLS  = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,categories,tags,tips'

  let marketsQuery = supabase
    .from('markets')
    .select(MARKET_COLS)
    .or(`frequency.in.(settimanale,mensile),and(next_date.gte.${startOfMonth},next_date.lte.${endOfMonth})`)
    .order('is_featured', { ascending: false })
    .order('avg_rating',  { ascending: false })
  if (regionFilter !== 'all') marketsQuery = marketsQuery.eq('region', regionFilter)

  let eventsQuery = supabase
    .from('market_events')
    .select(EVENT_COLS)
    .gte('start_date', startOfMonth)
    .lte('start_date', endOfMonth)
    .order('is_recurring', { ascending: false })
    .order('start_date',   { ascending: true })
  if (typeFilter === 'gratuiti') {
    eventsQuery = eventsQuery.or('price_info.ilike.%gratuito%,price_info.ilike.%gratis%,price_info.ilike.%free%')
  } else if (typeFilter !== 'all') {
    eventsQuery = eventsQuery.eq('event_type', typeFilter)
  }
  if (regionFilter !== 'all') eventsQuery = eventsQuery.eq('region', regionFilter)

  const [{ data: markets }, { data: events }] = await Promise.all([
    typeFilter === 'all' || typeFilter === 'mercatino' || typeFilter === 'antiquariato' || typeFilter === 'gratuiti'
      ? marketsQuery.limit(500)
      : Promise.resolve({ data: [] as Market[] }),
    eventsQuery.limit(500),
  ])

  const allMarkets   = (markets ?? []) as Market[]
  const allEvents    = (events  ?? []) as MarketEvent[]

  // Separa eventi ricorrenti da una-tantum
  const recurringEvents = allEvents.filter(e => e.is_recurring)
  const onetimeEvents   = allEvents.filter(e => !e.is_recurring)

  const todayStr = new Date().toISOString().split('T')[0]

  const totalItems = allMarkets.length + allEvents.length

  if (totalItems === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-white">
        <Sparkles size={32} className="text-muted mx-auto mb-3" />
        <h3 className="font-serif text-lg font-semibold text-espresso mb-1">Nessun contenuto trovato</h3>
        <p className="text-muted text-sm mb-5 max-w-sm mx-auto">
          Per {MONTHS_IT[month - 1]} {year} non ci sono ancora eventi con questi filtri.
        </p>
        <EventsClient month={month} year={year} asButton />
      </div>
    )
  }

  // Group by region helper
  function groupByRegion<T extends { region: string }>(items: T[]) {
    const m: Record<string, T[]> = {}
    items.forEach(i => { if (!m[i.region]) m[i.region] = []; m[i.region].push(i) })
    return m
  }

  const marketsByRegion   = groupByRegion(allMarkets)
  const recurringByRegion = groupByRegion(recurringEvents)
  const onetimeByRegion   = groupByRegion(onetimeEvents)

  // Regioni con almeno un mercato fisso o ricorrente
  const regionsWithRecurring = Array.from(new Set([
    ...Object.keys(marketsByRegion),
    ...Object.keys(recurringByRegion),
  ])).sort()
  const regionsWithOnetime = Object.keys(onetimeByRegion).sort()

  const totalRecurring = allMarkets.length + recurringEvents.length

  return (
    <div className="space-y-10">

      {/* ── Mercati — unico gruppo ────────────────────────────────────── */}
      {totalRecurring > 0 && (
        <section>
          {regionsWithRecurring.map(region => {
            const fixed   = marketsByRegion[region]   ?? []
            const monthly = recurringByRegion[region] ?? []
            return (
              <div key={region}>
                <RegionLabel region={region} count={fixed.length + monthly.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fixed.map((m: Market) => (
                    <MarketCard key={m.id} market={m} compact />
                  ))}
                  {monthly.map((e: MarketEvent) => (
                    <RecurringMarketCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* ── Solo a [mese] — eventi una-tantum ─────────────────────────── */}
      {onetimeEvents.length > 0 && (
        <section>
          <SectionHeading
            icon={<span className="text-[14px] select-none">✦</span>}
            title={`Solo a ${MONTHS_IT[month - 1]}`}
            subtitle="Svuotacantine, eventi speciali, fiere una-tantum — non perderli"
            count={onetimeEvents.length}
          />
          {regionsWithOnetime.map(region => (
            <div key={region}>
              <RegionLabel region={region} count={onetimeByRegion[region].length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {onetimeByRegion[region].map((e: MarketEvent) => {
                  const isPast = !!e.start_date && e.start_date < todayStr
                  return (
                    <div key={e.id} className={`relative${isPast ? ' opacity-60' : ''}`}>
                      <EventCard event={e} />
                      {isPast && (
                        <span className="absolute top-3 right-3 pointer-events-none z-10 text-[9px] font-bold uppercase tracking-[0.12em] bg-white/95 text-muted/80 border border-border px-2 py-0.5 rounded-full shadow-sm">
                          Già passato
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}

    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MercatiniPage({ searchParams }: Props) {
  const { month, year } = getMonthYear(searchParams)
  const regionFilter = searchParams.region ?? 'all'

  const prevMonth = month === 1  ? 12 : month - 1
  const nextMonth = month === 12 ? 1  : month + 1
  const prevYear  = month === 1  ? year - 1 : year
  const nextYear  = month === 12 ? year + 1 : year

  return (
    <div className="min-h-screen bg-parchment">

      {/* Page header — dark band */}
      <div className="bg-espresso border-b border-black/20">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sienna mb-3">
            Directory del vintage italiano
          </p>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="font-serif font-bold text-parchment leading-[1.1]"
                style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}>
                Mercatini & Antiquariato
              </h1>
              <p className="text-parchment/45 text-[13px] mt-1.5">
                Fiere, svuotacantine, vinile, fumetti — tutte le regioni.
              </p>
            </div>
            {/* Month navigation */}
            <div className="flex items-center gap-1 bg-white/8 border border-white/12 rounded-xl px-1 py-1">
              <Link
                href={`/mercatini?month=${prevMonth}&year=${prevYear}&region=${regionFilter}`}
                className="w-8 h-8 flex items-center justify-center text-parchment/50 hover:text-parchment hover:bg-white/10 rounded-lg transition-all font-bold text-lg leading-none"
              >‹</Link>
              <span className="font-serif font-bold text-parchment text-[15px] px-3 min-w-[130px] text-center capitalize">
                {MONTHS_IT[month - 1]} {year}
              </span>
              <Link
                href={`/mercatini?month=${nextMonth}&year=${nextYear}&region=${regionFilter}`}
                className="w-8 h-8 flex items-center justify-center text-parchment/50 hover:text-parchment hover:bg-white/10 rounded-lg transition-all font-bold text-lg leading-none"
              >›</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Filters row */}
        <div className="flex items-center gap-2 mb-8 pb-6 border-b border-border">
          <RegionDropdown value={regionFilter} month={month} year={year} />
          <SubscribeWidget initialRegion={regionFilter !== 'all' ? regionFilter : undefined} />
          <EventsClient month={month} year={year} />
        </div>

        {/* Content */}
        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_,i) => (
              <div key={i} className="bg-white/70 animate-pulse rounded-2xl h-72 border border-border" />
            ))}
          </div>
        }>
          <TuttiIContenuti searchParams={searchParams} />
        </Suspense>

      </div>
    </div>
  )
}
