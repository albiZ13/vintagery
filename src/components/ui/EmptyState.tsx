import Link from 'next/link'
import { type LucideIcon, SearchX, MapPin, Store, Calendar, Heart } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
}

export default function EmptyState({ icon: Icon = SearchX, title, description, action, secondaryAction }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-border/70 rounded-2xl bg-white/50">
      <div className="w-14 h-14 rounded-2xl bg-cream border border-border flex items-center justify-center mb-5">
        <Icon size={24} className="text-muted/50" />
      </div>
      <p className="font-serif text-[17px] font-semibold text-espresso mb-2 leading-snug">
        {title}
      </p>
      <p className="text-muted text-[13px] leading-relaxed max-w-xs mb-6">
        {description}
      </p>
      {action && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link
            href={action.href}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-espresso text-parchment font-semibold px-6 py-2.5 text-[13px] hover:bg-sienna transition-all"
          >
            {action.label}
          </Link>
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="text-[12px] font-medium text-sienna hover:text-espresso transition-colors"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured variants
export function EmptyMarkets({ region }: { region?: string | null }) {
  return (
    <EmptyState
      icon={Calendar}
      title="Nessun mercato in programma"
      description={region
        ? `Non ci sono mercati o eventi in ${region} nei prossimi 10 giorni.`
        : 'Nessun mercato trovato nei prossimi 10 giorni.'}
      action={{ label: 'Esplora tutto il calendario', href: '/mercatini' }}
    />
  )
}

export function EmptyShops({ region }: { region?: string | null }) {
  return (
    <EmptyState
      icon={Store}
      title="Nessun negozio trovato"
      description={region
        ? `Non ci sono negozi verificati in ${region} con questi filtri.`
        : 'Nessun negozio trovato con i filtri selezionati.'}
      action={{ label: 'Vedi tutti i negozi', href: '/negozi' }}
      secondaryAction={{ label: 'Esplora i mercatini', href: '/mercatini' }}
    />
  )
}

export function EmptyFollowedShops() {
  return (
    <EmptyState
      icon={Heart}
      title="Non segui ancora nessun negozio"
      description="Esplora la directory e inizia a seguire le botteghe che ti piacciono."
      action={{ label: 'Scopri i negozi', href: '/negozi' }}
    />
  )
}

export function EmptySearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`Nessun risultato per "${query}"`}
      description="Prova con un termine diverso o sfoglia le categorie disponibili."
      action={{ label: 'Rimuovi il filtro', href: '/negozi' }}
    />
  )
}
