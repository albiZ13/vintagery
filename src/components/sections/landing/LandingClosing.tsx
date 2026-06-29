import Link from 'next/link'
import { ArrowRight, Store } from 'lucide-react'

export default function LandingClosing() {
  return (
    <section className="bg-espresso text-parchment relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />

      <div className="max-w-2xl mx-auto px-4 py-28 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gold/55 mb-7">
          Inizia adesso
        </p>
        <h2
          className="font-serif font-bold text-parchment leading-[1.06] tracking-[-0.02em] mb-6"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}
        >
          Il vintage italiano<br />ti aspetta.
        </h2>
        <p className="text-parchment/40 leading-relaxed mb-12" style={{ fontSize: '15px' }}>
          Gratis per gli utenti.<br />
          Nessuna carta di credito.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-sienna text-parchment font-bold rounded-full hover:bg-rust transition-all hover:-translate-y-px"
            style={{ fontSize: '14px', padding: '15px 36px', boxShadow: '0 4px 24px rgba(181,58,30,0.30)' }}
          >
            Iscriviti — è gratis <ArrowRight size={13} />
          </Link>
          <Link
            href="/per-i-negozi"
            className="inline-flex items-center gap-2 border border-parchment/20 text-parchment/60 hover:text-parchment hover:border-parchment/40 rounded-full font-medium transition-colors"
            style={{ fontSize: '14px', padding: '15px 28px' }}
          >
            <Store size={13} /> Hai un negozio?
          </Link>
        </div>
      </div>
    </section>
  )
}
