import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <MapPin size={40} className="text-sienna opacity-40 mb-6" aria-hidden />
      <h1 className="font-serif text-4xl font-bold text-espresso mb-2">404</h1>
      <p className="font-serif text-xl text-coffee mb-2">Pagina non trovata</p>
      <p className="text-muted text-sm mb-8 max-w-xs">
        La pagina che stai cercando non esiste o è stata spostata.
      </p>
      <div className="flex gap-4">
        <Link href="/home" className="btn-primary px-6 py-2">
          Torna alla home
        </Link>
        <Link href="/mercatini" className="btn-outline px-6 py-2">
          Esplora mercatini
        </Link>
      </div>
    </div>
  )
}
