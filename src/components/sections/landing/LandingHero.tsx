import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, LogIn } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'

const FALLBACK: { src: string; name: string; city: string }[] = [
  { src: 'https://images.unsplash.com/photo-1481595357459-84468f6eeaac?w=800&q=80', name: "Fiera dell'Antiquariato", city: 'Arezzo, Toscana'  },
  { src: 'https://images.unsplash.com/photo-1543353071-087092ec393a?w=800&q=80',    name: 'Gran Mercato Vintage',   city: 'Torino, Piemonte' },
]

export default async function LandingHero() {
  const supabase = createServerClient()
  const { data: featured } = await supabase
    .from('markets')
    .select('name, city, region, image_url')
    .eq('is_featured', true)
    .not('image_url', 'is', null)
    .limit(2)

  const imgs = featured?.length
    ? featured.map(m => ({ src: m.image_url!, name: m.name, city: `${m.city}, ${m.region}` }))
    : FALLBACK

  return (
    <section className="relative bg-espresso text-parchment overflow-hidden min-h-screen">
      {/* Subtle cross-hatch texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9913a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-espresso to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 pt-[112px] pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">

          {/* ── Text ── */}
          <div>
            {/* Eyebrow */}
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gold/65 mb-7">
              Directory del vintage italiano
            </p>

            {/* Headline */}
            <h1
              className="font-serif font-bold text-parchment leading-[1.04] tracking-[-0.02em] mb-7"
              style={{ fontSize: 'clamp(2.8rem, 6.5vw, 4.8rem)' }}
            >
              Il punto di<br />riferimento del<br />
              <span className="text-gold">vintage italiano.</span>
            </h1>

            {/* Sub */}
            <p
              className="text-parchment/55 leading-[1.8] mb-10"
              style={{ fontSize: 'clamp(.95rem, 1.8vw, 1.08rem)', maxWidth: '480px' }}
            >
              Mercatini, fiere e negozi aggiornati ogni mese in tutte e 20 le regioni.
              Filtra per città, data e tipo. Aggiungi al calendario in un clic.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-gold text-espresso font-bold rounded-full hover:bg-[#d4a84c] transition-all hover:-translate-y-px"
                style={{
                  fontSize: '14px',
                  padding: '14px 32px',
                  boxShadow: '0 4px 24px rgba(201,145,58,0.38)',
                }}
              >
                Iscriviti — è gratis <ArrowRight size={13} />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 border border-parchment/20 text-parchment/70 hover:text-parchment hover:border-parchment/45 rounded-full font-medium transition-colors"
                style={{ fontSize: '14px', padding: '14px 32px' }}
              >
                <LogIn size={13} /> Accedi
              </Link>
            </div>
          </div>

          {/* ── Image stack (desktop) ── */}
          <div className="hidden lg:block relative h-[500px] select-none pointer-events-none">
            {/* Back */}
            <div
              className="absolute top-0 right-4 w-[252px] h-[310px] rounded-[22px] overflow-hidden border border-parchment/10"
              style={{ rotate: '3.5deg', boxShadow: '0 28px 80px rgba(0,0,0,0.55)' }}
            >
              <Image src={imgs[1]?.src ?? FALLBACK[1].src} alt={imgs[1]?.name ?? ''} fill className="object-cover" sizes="252px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-[12px] font-semibold text-white leading-snug">{imgs[1]?.name}</p>
                <p className="text-[10px] text-white/55 mt-0.5">{imgs[1]?.city}</p>
              </div>
            </div>

            {/* Front */}
            <div
              className="absolute bottom-0 left-4 w-[252px] h-[295px] rounded-[22px] overflow-hidden border border-parchment/10"
              style={{ rotate: '-2.5deg', boxShadow: '0 28px 80px rgba(0,0,0,0.6)' }}
            >
              <Image src={imgs[0]?.src ?? FALLBACK[0].src} alt={imgs[0]?.name ?? ''} fill className="object-cover" sizes="252px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-[12px] font-semibold text-white leading-snug">{imgs[0]?.name}</p>
                <p className="text-[10px] text-white/55 mt-0.5">{imgs[0]?.city}</p>
              </div>
            </div>

            {/* Floating gold badge */}
            <div
              className="absolute top-[100px] right-[-8px] bg-gold text-espresso rounded-2xl px-4 py-3"
              style={{ rotate: '-1.5deg', boxShadow: '0 8px 32px rgba(201,145,58,0.45)' }}
            >
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-60 mb-0.5">Aggiornato</p>
              <p className="font-black leading-none" style={{ fontSize: '15px' }}>Ogni mese</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
