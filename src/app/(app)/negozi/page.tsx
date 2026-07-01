export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import ShopCard from '@/components/ShopCard'
import SearchBar from '@/components/SearchBar'
import HomeRegionHeader from '@/components/sections/home/HomeRegionHeader'
import type { Shop } from '@/types'

interface Props {
  searchParams: { region?: string; q?: string; city?: string }
}

async function ShopList({ region, q, city }: { region: string | null; q?: string; city?: string }) {
  const supabase = createServerClient()

  const SHOP_COLS = 'id,name,city,region,image_url,plan,is_featured,is_verified,avg_rating,review_count,followers_count,categories,posts_count'

  let query = supabase
    .from('shops')
    .select(SHOP_COLS)
    .eq('is_verified', true)
    .eq('is_demo', false)
    .order('visibility_score', { ascending: false })
    .order('posts_count',      { ascending: false })
    .limit(60)

  if (region) query = query.eq('region', region)
  if (q)      query = query.ilike('name', `%${q}%`)
  if (city)   query = query.ilike('city', `%${city}%`)

  const { data: shops } = await query

  if (!shops?.length) {
    return (
      <div className="text-center py-20 border border-dashed border-border/70 rounded-2xl bg-white/50">
        <div className="w-12 h-12 rounded-2xl bg-cream border border-border/60 flex items-center justify-center mx-auto mb-4">
          <span className="text-[22px] leading-none select-none" aria-hidden>✦</span>
        </div>
        <p className="font-serif text-[18px] font-semibold text-espresso mb-1.5">
          {region ? `Nessun negozio verificato in ${region}` : 'Nessun negozio trovato'}
        </p>
        <p className="text-muted text-[13px] mb-4">
          {region ? 'Scopri quelli nelle regioni vicine.' : 'Prova con criteri diversi.'}
        </p>
        {region && (
          <Link href="/negozi" className="text-[13px] font-semibold text-sienna hover:underline">
            Vedi tutti i negozi →
          </Link>
        )}
      </div>
    )
  }

  const shopIds = shops.map(s => s.id)
  const { data: allPosts } = await supabase
    .from('shop_posts')
    .select('shop_id, image_url, created_at')
    .in('shop_id', shopIds)
    .order('created_at', { ascending: false })
    .limit(shopIds.length * 3)

  const postsByShop: Record<string, { image_url: string; created_at: string }[]> = {}
  allPosts?.forEach(p => {
    if (!postsByShop[p.shop_id]) postsByShop[p.shop_id] = []
    if (postsByShop[p.shop_id].length < 3) postsByShop[p.shop_id].push(p)
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {(shops as Shop[]).map(s => (
        <ShopCard key={s.id} shop={s} recentPosts={postsByShop[s.id]} />
      ))}
    </div>
  )
}

export default async function NegoziPage({ searchParams }: Props) {
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

  // URL param overrides profile region for browsing without changing preference
  const activeRegion = searchParams.region ?? profile?.region ?? null

  return (
    <>
      <HomeRegionHeader
        userId={user?.id ?? ''}
        displayName={profile?.first_name || profile?.username}
        initialRegion={profile?.region ?? null}
        cta={null}
      />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Banner in elaborazione */}
        <div className="mb-10 rounded-2xl border border-espresso/12 bg-espresso/[0.03] px-6 py-5 flex gap-4 items-start">
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-espresso/8 flex items-center justify-center flex-shrink-0">
            <Clock size={16} className="text-espresso/60" />
          </div>
          <div>
            <p className="font-serif font-bold text-espresso text-[15px] leading-snug mb-1">
              Questa sezione è in lavorazione
            </p>
            <p className="text-[13px] text-muted leading-relaxed">
              Stiamo costruendo prima la community dei mercatini — chi cerca, chi va, chi scopre.
              I negozi arriveranno quando ci sarà già un pubblico interessato che li aspetta.
            </p>
          </div>
        </div>

        {/* Section title */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-sienna/60 mb-1">
            Spazio espositivo
          </p>
          <h1 className="font-serif text-[1.8rem] font-bold text-espresso leading-tight">
            {activeRegion ? `Negozi verificati in ${activeRegion}` : 'Negozi vintage verificati'}
          </h1>
          <p className="text-muted text-[13px] mt-1">
            {activeRegion
              ? `Solo negozi selezionati e verificati in ${activeRegion}`
              : 'Solo negozi selezionati e verificati. Ogni spazio è curato dal negozio stesso.'}
          </p>
        </div>

        <div className="mb-6">
          <SearchBar
            basePath="/negozi"
            placeholder="Cerca un negozio…"
            defaultQuery={searchParams.q}
            defaultCity={searchParams.city}
          />
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-cream" />
                <div className="p-4 pt-8 space-y-2">
                  <div className="h-4 bg-cream rounded w-3/4" />
                  <div className="h-3 bg-cream rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        }>
          <ShopList region={activeRegion} q={searchParams.q} city={searchParams.city} />
        </Suspense>

      </div>

      {/* CTA banner — full width, same style as home */}
      <section className="bg-cream border-t border-border py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-serif text-[22px] font-bold text-espresso mb-2">Hai un negozio vintage?</h2>
          <p className="text-muted text-[13px] mb-6 max-w-sm mx-auto leading-relaxed">
            Richiedi la verifica, crea il tuo spazio espositivo e raggiungi chi cerca vintage in Italia.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-espresso text-parchment font-semibold px-6 py-3 text-[13px] hover:bg-sienna transition-all shadow-sm shadow-espresso/15"
            >
              Apri il tuo spazio →
            </Link>
            <Link href="/per-i-negozi" className="text-[13px] text-muted hover:text-sienna transition-colors inline-flex items-center gap-1 justify-center">
              Scopri come funziona
            </Link>
          </div>
        </div>
      </section>

    </>
  )
}
