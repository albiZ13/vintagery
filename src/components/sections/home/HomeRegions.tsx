import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const FEATURED_REGIONS = [
  'Lombardia', 'Toscana', 'Lazio', 'Piemonte',
  'Veneto', 'Emilia-Romagna', 'Sicilia', 'Campania',
]

interface Props {
  userRegion?: string | null
}

export default function HomeRegions({ userRegion }: Props) {
  const regions = userRegion && !FEATURED_REGIONS.includes(userRegion)
    ? [userRegion, ...FEATURED_REGIONS].slice(0, 9)
    : FEATURED_REGIONS

  return (
    <section className="bg-cream border-b border-border py-4">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mr-1">Regioni</span>
          {regions.map(r => (
            <Link
              key={r}
              href={`/mercatini?region=${encodeURIComponent(r)}`}
              className={`text-xs px-3.5 py-1.5 border rounded-full transition-colors ${
                userRegion === r
                  ? 'bg-sienna text-parchment border-sienna'
                  : 'bg-white text-coffee border-border hover:bg-sienna hover:text-parchment hover:border-sienna'
              }`}
            >
              {r}
            </Link>
          ))}
          <Link href="/mercatini" className="text-xs text-muted hover:text-sienna transition-colors flex items-center gap-1 ml-1">
            Tutte <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  )
}
