import type { Metadata } from 'next'
import { MapPin, Heart, Map, Star } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Chi siamo',
  description: 'Vintagery è la directory italiana di mercatini vintage, fiere di antiquariato e negozi second hand. Scopri la storia del progetto.',
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-14">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={22} className="text-sienna" aria-hidden />
          <span className="text-sm font-semibold text-muted uppercase tracking-widest">Il progetto</span>
        </div>
        <h1 className="font-serif text-4xl font-bold text-espresso mb-4 leading-tight">
          Chi siamo
        </h1>
        <p className="text-coffee text-lg leading-relaxed">
          Vintagery nasce dalla convinzione che il mondo del vintage italiano meriti una casa digitale.
          Un posto dove trovare mercatini, fiere di antiquariato e negozi second hand senza doversi districare tra
          decine di pagine Facebook, gruppi Telegram e siti datati.
        </p>
      </div>

      {/* Valori */}
      <div className="grid gap-6 mb-12">
        {[
          {
            icon: <Map size={20} className="text-sienna" />,
            title: 'Una mappa reale',
            body: 'Ogni mercatino e ogni negozio ha coordinate geografiche verificate, categorie accurate, date aggiornate. Non aggregazione automatica: cura editoriale.',
          },
          {
            icon: <Star size={20} className="text-gold" />,
            title: 'Reputazione autentica',
            body: 'Le recensioni vengono da utenti registrati con un profilo pubblico. Il Trust Score premia chi contribuisce con serietà alla community.',
          },
          {
            icon: <Heart size={20} className="text-sienna" />,
            title: 'Per gli appassionati',
            body: 'Non un marketplace, non una piattaforma pubblicitaria. Un posto per chi ama il vintage e vuole condividerlo.',
          },
        ].map(({ icon, title, body }) => (
          <div key={title} className="flex gap-4 p-5 bg-white border border-border rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cream flex items-center justify-center" aria-hidden>
              {icon}
            </div>
            <div>
              <h2 className="font-serif font-semibold text-espresso mb-1">{title}</h2>
              <p className="text-coffee text-sm leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-espresso text-parchment rounded-2xl p-8 text-center">
        <h2 className="font-serif text-2xl font-bold mb-3">Hai un negozio o un mercatino?</h2>
        <p className="text-parchment/70 text-sm mb-6 max-w-sm mx-auto">
          Aggiungi il tuo spazio su Vintagery. Profilo gratuito, visibilità immediata.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/auth/register?type=shop" className="bg-gold text-espresso font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-gold/90 transition-colors">
            Registra il tuo negozio
          </Link>
          <Link href="/mercatini" className="border border-parchment/30 text-parchment px-6 py-2.5 rounded-lg text-sm hover:bg-parchment/10 transition-colors">
            Esplora mercatini
          </Link>
        </div>
      </div>

      {/* Contatti */}
      <p className="text-muted text-sm text-center mt-8">
        Vuoi segnalare un mercatino o collaborare?{' '}
        <a href="mailto:ciao@vintagery.it" className="text-sienna hover:underline">ciao@vintagery.it</a>
      </p>
    </div>
  )
}
