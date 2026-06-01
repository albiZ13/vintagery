import { createServerClient } from '@/lib/supabase-server'

export default async function LandingStats() {
  const supabase = createServerClient()

  const [
    { count: marketsCount },
    { count: shopsCount },
    { count: eventsCount },
  ] = await Promise.all([
    supabase.from('markets').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('market_events').select('*', { count: 'exact', head: true }),
  ])

  function fmt(n: number | null): string {
    if (!n) return '—'
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k+`
    if (n >= 100)  return `${Math.floor(n / 10) * 10}+`
    if (n >= 10)   return `${Math.floor(n / 5) * 5}+`
    return `${n}`
  }

  const stats = [
    { value: fmt(eventsCount),  label: 'eventi ogni mese'  },
    { value: fmt(marketsCount), label: 'mercatini fissi'   },
    { value: fmt(shopsCount),   label: 'negozi vintage'    },
    { value: '20',              label: 'regioni d\'Italia' },
  ]

  return (
    <section className="bg-parchment border-b border-border py-16">
      <div className="max-w-4xl mx-auto px-4">
        <p className="text-center text-[10px] font-bold tracking-[0.3em] uppercase text-sienna/50 mb-12">
          Il vintage italiano in numeri
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }, i) => (
            <div key={label} className={`text-center ${i < 3 ? 'md:border-r border-border' : ''}`}>
              <span
                className="block font-serif font-bold text-espresso tracking-tight leading-none mb-2"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)' }}
              >
                {value}
              </span>
              <span className="text-[11px] font-medium text-muted uppercase tracking-[0.14em]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
