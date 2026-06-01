export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import MarketCard from '@/components/MarketCard'
import HomeRegionHeader from '@/components/sections/home/HomeRegionHeader'
import SectionHeader from '@/components/sections/shared/SectionHeader'
import type { Market } from '@/types'

const MARKET_COLS = 'id,name,description,city,region,address,lat,lng,website,instagram,phone,email,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,event_dates,organizer_id,organizer_name,created_at'

export default async function HomePage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  let profile: { first_name?: string | null; username?: string | null; region?: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, username, region')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const region = profile?.region ?? null

  let marketsQ = supabase.from('markets').select(MARKET_COLS).limit(6)
  if (region) {
    marketsQ = marketsQ
      .eq('region', region)
      .not('next_date', 'is', null)
      .gte('next_date', new Date().toISOString().slice(0, 10))
      .order('next_date', { ascending: true })
  } else {
    marketsQ = marketsQ
      .order('is_featured', { ascending: false })
      .order('avg_rating',  { ascending: false })
  }

  const { data: markets } = await marketsQ

  const hasMarkets = (markets?.length ?? 0) > 0

  const marketLabel = region
    ? `Mercatini in ${region}`
    : markets?.some(m => m.is_featured) ? 'Mercatini in evidenza' : 'Mercatini consigliati'

  return (
    <>
      <HomeRegionHeader
        userId={user?.id ?? ''}
        displayName={profile?.first_name || profile?.username}
        initialRegion={region}
      />

      {/* Mercatini */}
      {hasMarkets && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <SectionHeader
            eyebrow={region ?? undefined}
            title={marketLabel}
            subtitle={region ? `I prossimi in ${region}` : 'I più apprezzati dalla community'}
            href="/mercatini"
            hrefLabel="Calendario completo"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {markets!.map(m => <MarketCard key={m.id} market={m as Market} />)}
          </div>
        </section>
      )}

      {!hasMarkets && region && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <SectionHeader eyebrow={region} title={`Mercatini in ${region}`} href="/mercatini" />
          <div className="text-center py-16 px-6 border border-dashed border-border/70 rounded-2xl bg-white/50">
            <div className="w-12 h-12 rounded-2xl bg-cream border border-border/60 flex items-center justify-center mx-auto mb-4">
              <span className="text-[22px] leading-none select-none" aria-hidden>✦</span>
            </div>
            <p className="font-serif text-[18px] font-semibold text-espresso mb-1.5">
              Nessun mercatino in programma in {region}
            </p>
            <p className="text-muted text-[13px] max-w-sm mx-auto leading-relaxed mb-5">
              Stiamo aggiungendo nuovi mercatini ogni mese.
            </p>
            <Link href="/mercatini" className="text-[13px] font-semibold text-sienna hover:underline">
              Esplora tutta Italia →
            </Link>
          </div>
        </section>
      )}

      {/* Banner proponi mercatino */}
      <section className="bg-espresso border-t border-black/20 py-14 relative overflow-hidden">
        {/* Decorative rule */}
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
