import Link from 'next/link'
import { ArrowRight, Store } from 'lucide-react'

export default function LandingCTA() {
  return (
    <section className="py-28 px-4 bg-parchment">
      <div className="max-w-xl mx-auto text-center">

        {/* Decorative rule + dot */}
        <div className="flex items-center gap-4 justify-center mb-12">
          <div className="h-px flex-1 bg-border" style={{ maxWidth: '72px' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          <div className="h-px flex-1 bg-border" style={{ maxWidth: '72px' }} />
        </div>

        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-sienna/60 mb-5">
          Inizia adesso
        </p>
        <h2
          className="font-serif font-bold text-espresso leading-[1.06] tracking-[-0.015em] mb-5"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}
        >
          Tutto il vintage d'Italia, in un clic.
        </h2>
        <p className="text-muted leading-relaxed mb-10" style={{ fontSize: '15px' }}>
          Gratis per gli utenti. Per sempre.<br />
          Nessuna carta di credito. Nessun abbonamento.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 bg-espresso text-parchment font-bold rounded-full hover:bg-coffee transition-all hover:-translate-y-px"
            style={{ fontSize: '14px', padding: '15px 36px' }}
          >
            Iscriviti — è gratis <ArrowRight size={14} />
          </Link>
          <Link
            href="/auth/register?type=shop"
            className="inline-flex items-center justify-center gap-2 border-2 border-espresso text-espresso font-bold rounded-full hover:bg-espresso hover:text-parchment transition-all"
            style={{ fontSize: '14px', padding: '15px 36px' }}
          >
            <Store size={14} /> Ho un negozio
          </Link>
        </div>

        <p className="text-muted text-[12px] mt-8">
          Hai già un account?{' '}
          <Link href="/auth/login" className="text-sienna hover:underline font-medium">
            Accedi
          </Link>
        </p>
      </div>
    </section>
  )
}
