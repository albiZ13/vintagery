import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-espresso text-parchment/70 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-serif font-bold text-parchment text-lg mb-3">
            <MapPin size={16} className="text-gold" /> Vintagery
          </Link>
          <p className="text-caption leading-relaxed mb-4">
            La directory dei mercatini e negozi vintage in Italia.
          </p>
          <a
            href="mailto:ciao@vintagery.it"
            className="text-caption text-gold hover:text-gold/80 transition-colors"
          >
            ciao@vintagery.it
          </a>
        </div>
        <div>
          <p className="text-eyebrow text-parchment/40 uppercase mb-3">Esplora</p>
          <ul className="space-y-2 text-body-sm">
            <li><Link href="/mercatini"          className="hover:text-parchment transition-colors">Mercatini</Link></li>
            <li><Link href="/negozi"             className="hover:text-parchment transition-colors">Negozi</Link></li>
            <li><Link href="/proponi-mercatino"  className="hover:text-parchment transition-colors">Proponi un evento</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-eyebrow text-parchment/40 uppercase mb-3">Il mio spazio</p>
          <ul className="space-y-2 text-body-sm">
            <li><Link href="/dashboard"    className="hover:text-parchment transition-colors">Dashboard negozio</Link></li>
            <li><Link href="/impostazioni" className="hover:text-parchment transition-colors">Impostazioni</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-eyebrow text-parchment/40 uppercase mb-3">Info</p>
          <ul className="space-y-2 text-body-sm">
            <li><Link href="/about"   className="hover:text-parchment transition-colors">Chi siamo</Link></li>
            <li><Link href="/termini" className="hover:text-parchment transition-colors">Termini di servizio</Link></li>
            <li><Link href="/privacy" className="hover:text-parchment transition-colors">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-parchment/10 max-w-5xl mx-auto px-4 py-4 flex justify-between items-center text-caption">
        <span>© {new Date().getFullYear()} Vintagery</span>
        <span className="text-parchment/30">Italia</span>
      </div>
    </footer>
  )
}
