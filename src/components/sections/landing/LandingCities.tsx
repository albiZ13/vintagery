import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'

function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[''']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default async function LandingCities() {
  const supabase = createServerClient()
  const { data } = await supabase.from('markets').select('city, region')
  if (!data || data.length === 0) return null

  const countMap: Record<string, { region: string; count: number }> = {}
  for (const row of data) {
    if (!countMap[row.city]) countMap[row.city] = { region: row.region, count: 0 }
    countMap[row.city].count++
  }

  const all = Object.entries(countMap)
    .map(([city, { region, count }]) => ({ city, region, count, slug: cityToSlug(city) }))
    .sort((a, b) => b.count - a.count)

  const featured = all.slice(0, 6)
  const others   = all.slice(6).sort((a, b) => a.city.localeCompare(b.city, 'it'))

  return (
    <section className="bg-parchment border-b border-border py-20">
      <div className="max-w-5xl mx-auto px-4">

        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-sienna/50 mb-3">
              Esplora per città
            </p>
            <h2
              className="font-serif font-bold text-espresso leading-[1.08] tracking-[-0.015em]"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)' }}
            >
              Il vintage vicino a te.
            </h2>
          </div>
          <Link
            href="/mercatini"
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-sienna transition-colors"
          >
            Tutti i mercatini <ArrowRight size={11} />
          </Link>
        </div>

        {/* Top 6 — lista */}
        <div>
          {featured.map(({ city, region, count, slug }, i) => (
            <Link
              key={city}
              href={`/mercatini/citta/${slug}`}
              className="group block border-t border-border"
            >
              <div className="flex items-center gap-5 py-5 transition-all duration-200 group-hover:pl-1.5">
                <span className="text-[11px] font-mono tabular-nums text-muted/30 w-5 flex-shrink-0 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-serif font-bold text-espresso leading-tight group-hover:text-sienna transition-colors duration-200"
                    style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)' }}
                  >
                    {city}
                  </p>
                  <p className="text-[11px] text-muted/50 mt-0.5 font-medium">{region}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-[12px] text-muted/60 tabular-nums">
                    {count} mercatin{count === 1 ? 'o' : 'i'}
                  </span>
                  <ArrowRight
                    size={13}
                    className="text-muted/30 group-hover:text-sienna group-hover:translate-x-0.5 transition-all duration-200"
                  />
                </div>
              </div>
            </Link>
          ))}
          <div className="border-t border-border" />
        </div>

        {/* Altre città — visibili a Google, mascherate per utenti */}
        {others.length > 0 && (
          <div className="relative mt-8 overflow-hidden" style={{ maxHeight: '52px' }}>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 pointer-events-none select-none">
              {others.map(({ city, slug }) => (
                <a
                  key={city}
                  href={`/mercatini/citta/${slug}`}
                  tabIndex={-1}
                  className="text-[11px] text-muted/25 capitalize"
                >
                  {city}
                </a>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-parchment pointer-events-none" />
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/mercatini"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-sienna transition-colors"
          >
            Tutti i mercatini <ArrowRight size={11} />
          </Link>
        </div>

      </div>
    </section>
  )
}
