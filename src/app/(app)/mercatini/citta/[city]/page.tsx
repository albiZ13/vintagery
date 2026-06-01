export const dynamic    = 'force-dynamic'
export const revalidate = 3600

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, ArrowLeft, Sparkles } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import MarketCard from '@/components/MarketCard'
import EventCard, { type MarketEvent } from '@/components/EventCard'
import type { Metadata } from 'next'
import type { Market } from '@/types'

interface Props { params: { city: string } }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

// Decodes slug: "firenze" → "Firenze", "reggio-emilia" → "Reggio Emilia"
function slugToCity(slug: string) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = slugToCity(decodeURIComponent(params.city))
  return {
    title:       `Mercatini vintage a ${city} — Vintagery`,
    description: `Mercatini dell'usato, fiere di antiquariato e eventi vintage a ${city}. Date, orari e info su Vintagery.`,
    openGraph: {
      title:       `Mercatini vintage a ${city}`,
      description: `Tutti i mercatini e gli eventi vintage a ${city} — aggiornati ogni mese.`,
      url:         `${SITE_URL}/mercatini/citta/${params.city}`,
    },
    alternates: { canonical: `${SITE_URL}/mercatini/citta/${params.city}` },
  }
}


const MARKET_COLS = 'id,name,description,city,region,address,lat,lng,website,instagram,phone,email,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,event_dates,organizer_id,organizer_name,created_at'
const EVENT_COLS  = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,categories,tags'

export default async function CityPage({ params }: Props) {
  const cityName = slugToCity(decodeURIComponent(params.city))
  const supabase = createServerClient()

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const startOfMonth = `${year}-${String(month).padStart(2,'0')}-01`
  const endOfMonth   = new Date(year, month, 0).toISOString().split('T')[0]

  const [{ data: markets }, { data: events }] = await Promise.all([
    supabase
      .from('markets')
      .select(MARKET_COLS)
      .ilike('city', cityName)
      .or('frequency.in.(settimanale,mensile),next_date.not.is.null')
      .order('is_featured', { ascending: false })
      .limit(20),
    supabase
      .from('market_events')
      .select(EVENT_COLS)
      .ilike('city', cityName)
      .gte('start_date', startOfMonth)
      .lte('start_date', endOfMonth)
      .order('start_date', { ascending: true })
      .limit(50),
  ])

  const totalItems = (markets?.length ?? 0) + (events?.length ?? 0)

  if (totalItems === 0) {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Back */}
      <Link href="/mercatini" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-sienna transition-colors mb-6">
        <ArrowLeft size={14} /> Tutti i mercatini
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sienna text-sm font-medium mb-2">
          <MapPin size={14} /> {cityName}
        </div>
        <h1 className="font-serif text-display-md text-espresso mb-2">
          Mercatini vintage a {cityName}
        </h1>
        <p className="text-muted text-body-sm max-w-xl leading-relaxed">
          {totalItems} contenut{totalItems !== 1 ? 'i' : 'o'} tra mercatini fissi ed eventi in programma per {cityName}.
        </p>
      </div>

      {/* Markets */}
      {(markets?.length ?? 0) > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-lg font-semibold text-espresso mb-5 flex items-center gap-2">
            <Calendar size={16} className="text-sienna" />
            Mercatini fissi
            <span className="text-muted text-sm font-normal">({markets!.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets!.map((m: Market) => (
              <MarketCard key={m.id} market={m} compact />
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      {(events?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-espresso mb-5 flex items-center gap-2">
            <Sparkles size={16} className="text-sienna" />
            Prossimi eventi
            <span className="text-muted text-sm font-normal">({events!.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events!.map((e: MarketEvent) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="mt-12 text-center border-2 border-dashed border-border rounded-2xl py-8 px-4">
        <p className="text-muted text-sm mb-3">Conosci un mercatino a {cityName} non ancora su Vintagery?</p>
        <Link href="/proponi-mercatino" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
          Segnalacelo
        </Link>
      </div>

    </div>
  )
}
