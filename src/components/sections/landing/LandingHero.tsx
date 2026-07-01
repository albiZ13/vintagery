import Link from 'next/link'
import { ArrowRight, LogIn } from 'lucide-react'

const PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`

const CITIES = [
  'Milano', 'Roma', 'Firenze', 'Torino', 'Bologna', 'Napoli',
  'Venezia', 'Arezzo', 'Palermo', 'Genova', 'Bari', 'Verona',
  'Brescia', 'Parma', 'Padova', 'Trieste', 'Prato', 'Bergamo',
]

const STATS = [
  { n: '200+', label: 'mercatini ricorrenti' },
  { n: '20',   label: 'regioni coperte'      },
  { n: '∞',    label: 'gratis per te'        },
]

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
      <div className="relative max-w-4xl mx-auto px-6 pt-[100px] pb-20 text-center flex flex-col items-center">

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
          Mercatini, fiere e negozi aggiornati ogni mese in tutte e 20 le regioni.
          Filtra per città, data e tipo. Aggiungi al calendario in un clic.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-gold text-espresso font-bold rounded-full hover:bg-[#d4a84c] transition-all hover:-translate-y-px active:scale-[0.98]"
            style={{ fontSize: '14px', padding: '14px 32px', boxShadow: '0 4px 28px rgba(201,145,58,0.38)' }}
          >
            Iscriviti — è gratis <ArrowRight size={13} />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 border border-parchment/20 text-parchment/65 hover:text-parchment hover:border-parchment/40 rounded-full font-medium transition-colors"
            style={{ fontSize: '14px', padding: '14px 32px' }}
          >
            <LogIn size={13} /> Accedi
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-10 sm:gap-16 mb-14">
          {STATS.map(({ n, label }, i) => (
            <div key={label} className="text-center relative">
              {i > 0 && (
                <div className="absolute -left-5 sm:-left-8 top-1/2 -translate-y-1/2 h-8 w-px bg-parchment/10" />
              )}
              <p className="font-serif font-black text-gold leading-none mb-1" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)' }}>{n}</p>
              <p className="text-[11px] text-parchment/35 tracking-[0.08em] uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* City pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xl">
          {CITIES.map(city => (
            <span
              key={city}
              className="text-[11px] text-parchment/30 border border-parchment/10 rounded-full px-3 py-1 tracking-wide"
            >
              {city}
            </span>
          ))}
          <span className="text-[11px] text-gold/40 border border-gold/15 rounded-full px-3 py-1 tracking-wide">
            e altre 200+ città
          </span>
        </div>

      </div>
    </section>
  )
}
