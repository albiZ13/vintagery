export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowRight, MapPin, RefreshCw } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import MarketCard from '@/components/MarketCard'
import EventCard from '@/components/EventCard'
import FeaturedMarketCard from '@/components/FeaturedMarketCard'
import FeaturedEventCard from '@/components/FeaturedEventCard'
import ShopCard from '@/components/ShopCard'
import HomeRegionHeader from '@/components/sections/home/HomeRegionHeader'
import HomeWeeklyMap from '@/components/sections/home/HomeWeeklyMap'
import HomePushBanner from '@/components/sections/home/HomePushBanner'
import { fetchWeatherForDates, type WeatherDay } from '@/lib/weather'
import type { Market, MarketEvent, Shop } from '@/types'

const MARKET_COLS = 'id,name,description,city,region,address,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,tips,start_time,end_time,price_info,active_months,tags'
const EVENT_COLS  = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,categories,tags,tips'
const SHOP_COLS   = 'id,name,description,city,region,address,categories,image_url,is_featured,is_verified,avg_rating,review_count,followers_count,website,instagram'

const DAYS_IT   = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

function featuredScore(m: Market): number {
  if (!m.review_count || !m.avg_rating) return 0
  return m.avg_rating * Math.log(m.review_count + 1)
}

function sectionLabel(earliestDate: string | null): { eyebrow: string; heading: string } {
  if (!earliestDate) return { eyebrow: 'Prossimi appuntamenti', heading: 'Nei prossimi giorni' }
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayDay = today.getDay()
  const satOffset = todayDay === 6 ? 0 : (6 - todayDay)
  const sat = new Date(today); sat.setDate(today.getDate() + satOffset)
  const sun = new Date(today); sun.setDate(today.getDate() + (todayDay === 0 ? 0 : 7 - todayDay))
  const satStr = sat.toISOString().slice(0, 10)
  const sunStr = sun.toISOString().slice(0, 10)

  if (earliestDate === todayStr) return { eyebrow: 'Prossimi appuntamenti', heading: 'Oggi' }
  const d = new Date(earliestDate + 'T12:00:00')
  const daysUntil = Math.round((new Date(earliestDate + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
  if (daysUntil === 1) return { eyebrow: 'Prossimi appuntamenti', heading: 'Domani' }

  if (earliestDate === satStr || earliestDate === sunStr) {
    const fmt = (date: Date) => `${date.getDate()} ${MONTHS_IT[date.getMonth()]}`
    return { eyebrow: 'Questo weekend', heading: `${fmt(sat)} – ${fmt(sun)}` }
  }
  if (earliestDate > todayStr && earliestDate < satStr) {
    return {
      eyebrow: 'Questa settimana',
      heading: `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`,
    }
  }
  return {
    eyebrow: 'Prossimi appuntamenti',
    heading: `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`,
  }
}

export default async function HomePage() {
  const supabase = createServerClient()

  // ── Auth ────────────────────────────────────────────────────────
  let user = null
  let profile: { first_name?: string | null; username?: string | null; region?: string | null } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
    if (user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('first_name, username, region')
        .eq('id', user.id)
        .single()
      profile = p
    }
  } catch {}

  const region   = profile?.region ?? null
  const now      = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const plus10   = new Date(now); plus10.setDate(now.getDate() + 10)
  const plus10Str = plus10.toISOString().slice(0, 10)

  // ── Mercati ricorrenti nei prossimi 10 giorni ────────────────────
  let markets: Market[] = []
  try {
    let q = supabase
      .from('markets')
      .select(MARKET_COLS)
      .gte('next_date', todayStr)
      .lte('next_date', plus10Str)
      .order('is_featured', { ascending: false })
      .order('next_date',   { ascending: true })
      .order('avg_rating',  { ascending: false })
    if (region) q = q.eq('region', region)
    const { data } = await q.limit(9)
    markets = (data ?? []) as unknown as Market[]
  } catch {}

  // ── Mercatini una-tantum nei prossimi 10 giorni ──────────────────
  let onetimeEvents: MarketEvent[] = []
  try {
    let q = supabase
      .from('market_events')
      .select(EVENT_COLS)
      .eq('is_recurring', false)
      .gte('start_date', todayStr)
      .lte('start_date', plus10Str)
      .order('is_featured', { ascending: false })
      .order('start_date',  { ascending: true })
    if (region) q = q.eq('region', region)
    const { data } = await q.limit(6)
    onetimeEvents = (data ?? []) as MarketEvent[]
  } catch {}

  // ── Combina e ordina ─────────────────────────────────────────────
  type CombinedItem =
    | { kind: 'market'; item: Market;      date: string; score: number }
    | { kind: 'event';  item: MarketEvent; date: string; score: number }

  const combined: CombinedItem[] = [
    ...markets.map(m => ({
      kind:  'market' as const,
      item:  m,
      date:  m.next_date ?? '9999-99-99',
      score: featuredScore(m) + (m.is_featured ? 100 : 0),
    })),
    ...onetimeEvents.map(e => ({
      kind:  'event' as const,
      item:  e,
      date:  e.start_date,
      score: (e.is_featured ? 100 : 0),
    })),
  ].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date)
    if (dateDiff !== 0) return dateDiff
    return b.score - a.score
  })

  // ── Stats ────────────────────────────────────────────────────────
  let totalMarkets: number | null = null
  try {
    const { count } = await supabase
      .from('markets')
      .select('id', { count: 'exact', head: true })
    totalMarkets = count
  } catch {}

  // ── Mappa settimanale: un mercato per regione ─────────────────────
  let regionMarkets: Record<string, Market | null> = {}
  try {
    const { data } = await supabase
      .from('markets')
      .select(MARKET_COLS)
      .gte('next_date', todayStr)
      .order('region')
      .order('next_date', { ascending: true })
    const byRegion: Record<string, Market> = {}
    ;((data ?? []) as unknown as Market[]).forEach(m => {
      if (!byRegion[m.region]) byRegion[m.region] = m
    })
    regionMarkets = byRegion
  } catch {}

  // ── Negozi ───────────────────────────────────────────────────────
  let shops: Shop[] = []
  try {
    let q = supabase
      .from('shops')
      .select(SHOP_COLS)
      .eq('is_verified', true)
      .order('avg_rating', { ascending: false })
    if (region) q = q.eq('region', region)
    const { data } = await q.limit(3)
    shops = (data ?? []) as Shop[]
  } catch {}

  // ── Meteo per il primo market ────────────────────────────────────
  const topMarket = combined.find(c => c.kind === 'market')?.item as Market | undefined
  let featuredWeather: WeatherDay[] = []
  if (topMarket?.next_date) {
    try {
      const daysUntil = Math.floor(
        (new Date(topMarket.next_date + 'T12:00:00').getTime() - Date.now()) / 86400000
      )
      if (daysUntil >= 0 && daysUntil <= 7) {
        featuredWeather = await Promise.race([
          fetchWeatherForDates(topMarket.city, [topMarket.next_date]),
          new Promise<[]>(resolve => setTimeout(() => resolve([]), 5000)),
        ])
      }
    } catch { featuredWeather = [] }
  }

  const earliestDate = combined[0]?.date ?? null
  const { eyebrow, heading } = sectionLabel(earliestDate)
  const firstItem = combined[0] ?? null
  const rest      = combined.slice(1)

  return (
    <>
      <HomeRegionHeader
        userId={user?.id ?? ''}
        displayName={profile?.first_name || profile?.username}
        initialRegion={region}
      />

      <HomePushBanner />

      {/* ── Prossimi appuntamenti ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sienna mb-1">
              {eyebrow}
            </p>
            <h2 className="font-serif font-bold text-espresso text-[20px] leading-tight capitalize">
              {heading}
            </h2>
            {region && (
              <p className="text-[12px] text-muted mt-0.5">in {region}</p>
            )}
          </div>
          <Link
            href={region ? `/mercatini?region=${encodeURIComponent(region)}` : '/mercatini'}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sienna hover:text-espresso transition-colors"
          >
            Tutto il calendario <ArrowRight size={11} />
          </Link>
        </div>

        {firstItem ? (
          <div className="space-y-4">
            {/* Primo in evidenza */}
            {firstItem.kind === 'market' ? (
              <FeaturedMarketCard market={firstItem.item} weather={featuredWeather} />
            ) : (
              <FeaturedEventCard event={firstItem.item} todayStr={todayStr} />
            )}

            {/* Griglia degli altri */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map(c =>
                  c.kind === 'market'
                    ? <MarketCard  key={c.item.id} market={c.item} />
                    : <EventCard   key={c.item.id} event={c.item}  todayStr={todayStr} />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-14 border border-dashed border-border/70 rounded-2xl bg-white/50">
            <RefreshCw size={24} className="text-muted/40 mx-auto mb-3" />
            <p className="font-serif text-[16px] font-semibold text-espresso mb-1">
              Nessun appuntamento in programma
            </p>
            <p className="text-muted text-[12px] mb-4">
              {region
                ? `Non ci sono mercati o eventi in ${region} nei prossimi 10 giorni.`
                : 'Nessun mercato trovato nei prossimi 10 giorni.'}
            </p>
            <Link href="/mercatini" className="text-[12px] font-semibold text-sienna hover:underline">
              Esplora tutto il calendario →
            </Link>
          </div>
        )}
      </section>

      {/* ── Mappa settimanale Italia ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <HomeWeeklyMap regionMarkets={regionMarkets} />
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-8 sm:gap-16 py-5 bg-white border border-border rounded-2xl">
          {[
            { n: totalMarkets ?? 200, label: 'mercati ricorrenti'   },
            { n: 20,                  label: 'regioni coperte'     },
            { n: 'Gratis',            label: 'per gli utenti'      },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="font-serif font-bold text-espresso text-[26px] leading-none">{n}</p>
              <p className="text-[11px] text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Negozi vintage ─────────────────────────────────────────── */}
      {shops.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sienna mb-1">
                Negozi vintage
              </p>
              <h2 className="font-serif font-bold text-espresso text-[18px]">
                {region ? `Negozi in ${region}` : 'I più apprezzati'}
              </h2>
            </div>
            <Link href="/negozi"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sienna hover:text-espresso transition-colors">
              Tutti i negozi <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {shops.map(s => <ShopCard key={s.id} shop={s as Shop} />)}
          </div>
        </section>
      )}

      {/* ── Banner proponi mercatino ────────────────────────────────── */}
      <section className="bg-espresso border-t border-black/20 py-14 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="max-w-2xl mx-auto px-4 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/15 border border-gold/25 mb-5">
            <MapPin size={20} className="text-gold" />
          </div>
          <h2 className="font-serif text-[22px] font-bold text-parchment mb-2 leading-snug">
            Conosci un mercatino che non è ancora qui?
          </h2>
          <p className="text-parchment/55 text-[13px] mb-7 max-w-sm mx-auto leading-relaxed">
            Segnalalo alla community. Lo verifichiamo e lo aggiungiamo al calendario.
          </p>
          <Link href="/proponi-mercatino"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold text-espresso font-bold px-7 py-3 text-[13px] hover:bg-[#d4a84c] transition-all shadow-md shadow-black/20">
            Proponi un mercatino <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </>
  )
}
