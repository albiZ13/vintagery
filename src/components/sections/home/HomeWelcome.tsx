import Link from 'next/link'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'

interface Props {
  firstName?: string | null
  marketCount: number
  shopCount: number
  userRegion?: string | null
}

function greeting(name?: string | null): string {
  const h = new Date().getHours()
  const saluto = h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
  return name ? `${saluto}, ${name}.` : `${saluto}.`
}

export default function HomeWelcome({ firstName, marketCount, shopCount, userRegion }: Props) {
  const now       = new Date()
  const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  return (
    <section className="border-b border-border bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">

        <div>
          <p className="text-[11px] font-semibold text-muted/70 uppercase tracking-[0.12em] capitalize mb-1">
            {monthName}
          </p>
          <h1 className="font-serif font-bold text-espresso leading-tight" style={{ fontSize: 'clamp(1.5rem, 3vw, 1.9rem)' }}>
            {greeting(firstName)}
          </h1>
          {userRegion ? (
            <p className="text-muted text-[13px] mt-1.5 flex items-center gap-1.5">
              <MapPin size={12} className="text-sienna flex-shrink-0" />
              Risultati per{' '}
              <span className="font-semibold text-espresso">{userRegion}</span>
            </p>
          ) : (
            <p className="text-muted text-[13px] mt-1.5">
              {marketCount > 0 ? `${marketCount} mercatini` : 'Mercatini'} e {shopCount > 0 ? `${shopCount} negozi` : 'negozi'} in tutta Italia
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/mercatini"
            className="inline-flex items-center gap-2 rounded-full bg-espresso text-parchment font-semibold px-5 py-2.5 text-[13px] hover:bg-sienna transition-all duration-200 shadow-sm shadow-espresso/15"
          >
            <Calendar size={13} /> Mercatini del mese
          </Link>
          <Link
            href="/proponi-mercatino"
            className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-sienna transition-colors"
          >
            Proponi <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </section>
  )
}
