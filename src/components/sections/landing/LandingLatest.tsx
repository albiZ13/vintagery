import Link from 'next/link'
import { ArrowRight, RefreshCw, Store } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import { PUBLIC_MARKET_FILTER } from '@/lib/queries'

type MarketRow = { id: string; name: string; city: string; region: string; frequency: string | null }
type ShopRow   = { id: string; name: string; city: string; region: string }

const FREQ_IT: Record<string, string> = {
  settimanale:   'Ogni settimana',
  bisettimanale: '2× al mese',
  mensile:       'Ogni mese',
  giornaliero:   'Quotidiano',
}

function MarketPill({ m }: { m: MarketRow }) {
  const freq = m.frequency ? FREQ_IT[m.frequency] : null

  return (
    <Link
      href={`/mercatini/${m.id}`}
      className="group inline-flex items-center gap-2.5 bg-white border border-border/70 rounded-full px-4 py-2 flex-shrink-0 hover:border-sienna/25 hover:shadow-[0_4px_16px_rgba(15,32,64,0.08)] transition-all duration-200"
    >
      <span className="font-serif font-semibold text-espresso text-[13px] leading-none group-hover:text-sienna transition-colors whitespace-nowrap">
        {m.name}
      </span>
      <span className="text-muted/45 text-[11px] whitespace-nowrap">{m.city}</span>
      {freq && (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted/40 whitespace-nowrap">
          <RefreshCw size={7} /> {freq}
        </span>
      )}
    </Link>
  )
}

function ShopPill({ s }: { s: ShopRow }) {
  return (
    <Link
      href={`/negozi/${s.id}`}
      className="group inline-flex items-center gap-2.5 bg-white border border-border/70 rounded-full px-4 py-2 flex-shrink-0 hover:border-sienna/25 hover:shadow-[0_4px_16px_rgba(15,32,64,0.08)] transition-all duration-200"
    >
      <Store size={11} className="text-muted/35 flex-shrink-0" />
      <span className="font-serif font-semibold text-espresso text-[13px] leading-none group-hover:text-sienna transition-colors whitespace-nowrap">
        {s.name}
      </span>
      <span className="text-muted/45 text-[11px] whitespace-nowrap">{s.city}</span>
    </Link>
  )
}

export default async function LandingLatest() {
  const supabase = createServerClient()

  const [{ data: latestMarkets }, { data: latestShops }] = await Promise.all([
    supabase.from('markets').select('id,name,city,region,frequency').or(PUBLIC_MARKET_FILTER).order('created_at', { ascending: false }).limit(10),
    supabase.from('shops').select('id,name,city,region').order('created_at', { ascending: false }).limit(8),
  ])

  const markets = (latestMarkets ?? []) as MarketRow[]
  const shops   = (latestShops   ?? []) as ShopRow[]
  if (markets.length === 0 && shops.length === 0) return null

  const mRow = markets.length >= 4 ? markets : [...markets, ...markets, ...markets, ...markets].slice(0, Math.max(markets.length * 2, 8))
  const sRow = shops.length   >= 4 ? shops   : [...shops,   ...shops,   ...shops,   ...shops  ].slice(0, Math.max(shops.length   * 2, 8))

  return (
    <section className="bg-parchment border-b border-border py-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[0.42em] uppercase text-sienna/45 mb-4">
              Aggiornato ogni mese
            </p>
            <h2
              className="font-serif font-black text-espresso leading-[1.02] tracking-[-0.025em]"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)' }}
            >
              Il vintage italiano,<br />
              <span className="text-sienna">tutto qui.</span>
            </h2>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2 pb-1">
            <Link href="/mercatini" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-espresso/45 hover:text-sienna transition-colors">
              Tutti i mercatini <ArrowRight size={11} />
            </Link>
            <Link href="/negozi" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-espresso/25 hover:text-sienna transition-colors">
              Tutti i negozi <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* Ticker mercatini → */}
      <div className="relative mb-3">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-parchment to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-parchment to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee-left gap-2.5 w-max">
          {[...mRow, ...mRow].map((m, i) => (
            <MarketPill key={`${m.id}-${i}`} m={m} />
          ))}
        </div>
      </div>

      {/* Ticker negozi ← */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-parchment to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-parchment to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee-right gap-2.5 w-max">
          {[...sRow, ...sRow].map((s, i) => (
            <ShopPill key={`${s.id}-${i}`} s={s} />
          ))}
        </div>
      </div>

      <div className="mt-10 flex gap-5 justify-center sm:hidden px-4">
        <Link href="/mercatini" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-espresso/55 hover:text-sienna transition-colors">
          Mercatini <ArrowRight size={11} />
        </Link>
        <Link href="/negozi" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-espresso/35 hover:text-sienna transition-colors">
          Negozi <ArrowRight size={11} />
        </Link>
      </div>
    </section>
  )
}
