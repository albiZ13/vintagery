export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowRight, MapPin, RefreshCw } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import EventCard from '@/components/EventCard'
import FeaturedMarketCard from '@/components/FeaturedMarketCard'
import ShopCard from '@/components/ShopCard'
import HomeRegionHeader from '@/components/sections/home/HomeRegionHeader'
import { fetchWeatherForDates, type WeatherDay } from '@/lib/weather'
import type { MarketEvent, Shop } from '@/types'

const EVENT_COLS = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,categories,tags,tips,avg_rating,review_count'
const SHOP_COLS  = 'id,name,description,city,region,address,categories,image_url,is_featured,is_verified,avg_rating,review_count,followers_count,website,instagram'


function getWeekend(): { sat: string; sun: string; label: string } {
  const today = new Date()
  const day   = today.getDay()
  const sat   = new Date(today)
  const sun   = new Date(today)
  sat.setDate(today.getDate() + (day === 6 ? 0 : 6 - day))
  sun.setDate(today.getDate() + (day === 0 ? 0 : 7 - day))
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
  return {
    sat:   sat.toISOString().slice(0, 10),
    sun:   sun.toISOString().slice(0, 10),
    label: `${fmt(sat)} – ${fmt(sun)}`,
  }
}

function featuredScore(e: MarketEvent): number {
  if (!e.review_count || !e.avg_rating) return 0
  return e.avg_rating * Math.log(e.review_count + 1)
}

export default async function HomePage() {
  const supabase = createServerClient()

  // ── Auth ──────────────────────────────────────────────────────────
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
  } catch { /* auth error → render page without personalization */ }

  const region  = profile?.region ?? null
  const weekend = getWeekend()

  // ── Weekend events ─────────────────────────────────────────────────
  let events: MarketEvent[] = []
  try {
    let q = supabase
      .from('market_events')
      .select(EVENT_COLS)
      .in('start_date', [weekend.sat, weekend.sun])
      .order('start_date', { ascending: true })
    if (region) q = q.eq('region', region)
    const { data } = await q.limit(9)
    events = (data ?? []) as MarketEvent[]
  } catch { /* fallback a lista vuota */ }

  const hasWeekend = events.length > 0

  // ── Fallback: prossimi 14 giorni ──────────────────────────────────
  let upcomingEvents: MarketEvent[] = []
  if (!hasWeekend) {
    try {
      const now   = new Date()
      const plus14 = new Date(now)
      plus14.setDate(now.getDate() + 14)
      let q = supabase
        .from('market_events')
        .select(EVENT_COLS)
        .gte('start_date', now.toISOString().slice(0, 10))
        .lte('start_date', plus14.toISOString().slice(0, 10))
        .order('start_date', { ascending: true })
      if (region) q = q.eq('region', region)
      const { data } = await q.limit(6)
      upcomingEvents = (data ?? []) as MarketEvent[]
    } catch { /* fallback a lista vuota */ }
  }

  // ── Stats ──────────────────────────────────────────────────────────
  let totalMarkets: number | null = null
  try {
    const { count } = await supabase
      .from('market_events')
      .select('id', { count: 'exact', head: true })
      .eq('is_recurring', true)
    totalMarkets = count
  } catch { /* stats opzionali */ }

  // ── Negozi ─────────────────────────────────────────────────────────
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
  } catch { /* negozi opzionali */ }

  const hasShops = shops.length > 0

  // ── Ordina per score (entra in gioco quando ci sono recensioni) ────
  const rawEvents = hasWeekend ? events : upcomingEvents
  const anyReviews = rawEvents.some(e => (e.review_count ?? 0) > 0)
  const displayEvents = anyReviews
    ? [...rawEvents].sort((a, b) => {
        const diff = featuredScore(b) - featuredScore(a)
        if (diff !== 0) return diff
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
      })
    : rawEvents

  // ── Meteo: solo entro 7 giorni, timeout 5s totali ─────────────────
  const featuredEvent = displayEvents[0] ?? null
  let featuredWeather: WeatherDay[] = []
  if (featuredEvent) {
    try {
      const eventDate = new Date(featuredEvent.start_date + 'T12:00:00')
      const daysUntil = Math.floor((eventDate.getTime() - Date.now()) / 86400000)
      if (daysUntil >= 0 && daysUntil <= 7) {
        const dates = [
          featuredEvent.start_date,
          ...(featuredEvent.end_date && featuredEvent.end_date !== featuredEvent.start_date
            ? [featuredEvent.end_date] : []),
        ]
        featuredWeather = await Promise.race([
          fetchWeatherForDates(featuredEvent.city, dates),
          new Promise<[]>(resolve => setTimeout(() => resolve([]), 5000)),
        ])
      }
    } catch {
      featuredWeather = []
    }
  }

  return (
    <>
      <HomeRegionHeader
        userId={user?.id ?? ''}
        displayName={profile?.first_name || profile?.username}
        initialRegion={region}
      />

      {/* ── Questo weekend ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sienna mb-1">
              {hasWeekend ? 'Questo weekend' : 'Prossimi appuntamenti'}
            </p>
            <h2 className="font-serif font-bold text-espresso text-[20px] leading-tight">
              {hasWeekend ? weekend.label : 'Nei prossimi 14 giorni'}
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

        {displayEvents.length > 0 ? (
          <div className="space-y-4">
            <FeaturedMarketCard event={displayEvents[0]} weather={featuredWeather} />
            {displayEvents.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayEvents.slice(1).map(e => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-14 border border-dashed border-border/70 rounded-2xl bg-white/50">
            <RefreshCw size={24} className="text-muted/40 mx-auto mb-3" />
            <p className="font-serif text-[16px] font-semibold text-espresso mb-1">
              Nessun mercato in programma
            </p>
            <p className="text-muted text-[12px] mb-4">
              {region
                ? `Non ci sono mercati in ${region} questo weekend.`
                : 'Nessun mercato trovato per questo weekend.'}
            </p>
            <Link href="/mercatini" className="text-[12px] font-semibold text-sienna hover:underline">
              Esplora tutto il calendario →
            </Link>
          </div>
        )}
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-8 sm:gap-16 py-5 bg-white border border-border rounded-2xl">
          {[
            { n: totalMarkets ?? 58, label: 'mercati ricorrenti' },
            { n: 20,                 label: 'regioni coperte'    },
            { n: '100%',             label: 'ad ingresso gratuito' },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="font-serif font-bold text-espresso text-[26px] leading-none">{n}</p>
              <p className="text-[11px] text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

{/* ── Negozi vintage ────────────────────────────────────────── */}
      {hasShops && (
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
            <Link
              href="/negozi"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sienna hover:text-espresso transition-colors"
            >
              Tutti i negozi <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {shops.map(s => <ShopCard key={s.id} shop={s as Shop} />)}
          </div>
        </section>
      )}

      {/* ── Banner proponi mercatino ──────────────────────────────── */}
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
          <Link
            href="/proponi-mercatino"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold text-espresso font-bold px-7 py-3 text-[13px] hover:bg-[#d4a84c] transition-all shadow-md shadow-black/20"
          >
            Proponi un mercatino <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </>
  )
}
