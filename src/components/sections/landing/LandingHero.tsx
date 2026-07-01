import Link from 'next/link'
import { ArrowRight, LogIn } from 'lucide-react'

const PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

export default function LandingHero() {
  return (
    <section className="relative bg-espresso text-parchment overflow-hidden min-h-screen flex flex-col justify-center">

      {/* Texture */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.032, backgroundImage: PATTERN }} />

      {/* Radial glow top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%', left: '-5%',
          width: '60vw', height: '60vw',
          maxWidth: 800, maxHeight: 800,
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-espresso to-transparent pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative max-w-4xl mx-auto px-6 pt-[100px] pb-24 text-center flex flex-col items-center">

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-10 bg-gold/40" />
          <p className="text-[10px] font-bold tracking-[0.35em] uppercase text-gold/65">
            Directory del vintage italiano
          </p>
          <div className="h-px w-10 bg-gold/40" />
        </div>

        {/* Headline */}
        <h1
          className="font-serif font-bold text-parchment leading-[1.02] tracking-[-0.025em] mb-8"
          style={{ fontSize: 'clamp(3rem, 8vw, 5.8rem)' }}
        >
          Il punto di<br />riferimento del<br />
          <em className="not-italic text-gold">vintage italiano.</em>
        </h1>

        {/* Gold rule */}
        <div className="flex items-center gap-4 mb-8 w-full max-w-xs">
          <div className="flex-1 h-px bg-gold/25" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
          <div className="flex-1 h-px bg-gold/25" />
        </div>

        {/* Sub */}
        <p
          className="text-parchment/50 leading-[1.9] mb-10 max-w-lg"
          style={{ fontSize: 'clamp(.95rem, 1.8vw, 1.1rem)' }}
        >
          Mercatini, fiere di antiquariato e negozi vintage in tutte e 20 le regioni.
          Date sempre aggiornate, filtro per città e tipo, aggiunta al calendario in un clic.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-gold text-espresso font-bold rounded-full hover:bg-[#d4a84c] transition-all hover:-translate-y-px active:scale-[0.98]"
            style={{ fontSize: '14px', padding: '14px 32px', boxShadow: '0 4px 28px rgba(201,145,58,0.38)' }}
          >
            Inizia gratis <ArrowRight size={13} />
          </Link>
          <Link
            href="/mercatini"
            className="inline-flex items-center gap-2 border border-parchment/20 text-parchment/65 hover:text-parchment hover:border-parchment/40 rounded-full font-medium transition-colors"
            style={{ fontSize: '14px', padding: '14px 32px' }}
          >
            Esplora i mercatini
          </Link>
        </div>

      </div>
    </section>
  )
}
