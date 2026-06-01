import Link from 'next/link'
import { ArrowRight, BadgeCheck, ImageIcon, Star, Users } from 'lucide-react'

const FEATURES = [
  {
    icon: ImageIcon,
    label: 'Profilo completo',
    desc: 'Foto, descrizione, orari, categorie. Un punto di riferimento per i tuoi clienti.',
  },
  {
    icon: Star,
    label: 'Recensioni reali',
    desc: 'Solo da utenti verificati. Costruisci reputazione autentica nel tempo.',
  },
  {
    icon: BadgeCheck,
    label: 'Feed nuove entrate',
    desc: 'Pubblica arrivi, pezzi speciali, svendite — come su Instagram, ma sul posto giusto.',
  },
  {
    icon: Users,
    label: 'Follower organici',
    desc: 'Chi ti segue riceve aggiornamenti sulle tue nuove entrate. Zero algoritmo, zero ads.',
  },
]

export default function LandingForShops() {
  return (
    <section className="bg-espresso text-parchment py-24 relative overflow-hidden">
      {/* Top rule */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />

      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-16 items-start">

          {/* ── Copy ── */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gold/60 mb-6">
              Per i negozi vintage
            </p>
            <h2
              className="font-serif font-bold text-parchment leading-[1.07] tracking-[-0.015em] mb-6"
              style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}
            >
              Il tuo negozio ha già una storia.<br />
              <span className="text-gold">Fa' sì che la trovino.</span>
            </h2>
            <p className="text-parchment/55 leading-[1.8] mb-10" style={{ fontSize: '15px', maxWidth: '440px' }}>
              Crea il profilo, pubblica le nuove entrate, costruisci follower organici.
            </p>

            <ul className="space-y-3.5 mb-10">
              {[
                'Profilo con foto, categorie e contatti',
                'Feed di nuove entrate come su Instagram',
                'Recensioni verificate da clienti reali',
                'Statistiche di visite e follower',
              ].map(f => (
                <li key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                    <BadgeCheck size={11} className="text-gold" />
                  </div>
                  <span className="text-parchment/75 text-[13px]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/auth/register?type=shop"
              className="inline-flex items-center gap-2 bg-gold text-espresso font-bold rounded-full hover:bg-[#d4a84c] transition-all hover:-translate-y-px"
              style={{
                fontSize: '14px',
                padding: '14px 32px',
                boxShadow: '0 4px 20px rgba(201,145,58,0.3)',
              }}
            >
              Crea il profilo negozio <ArrowRight size={14} />
            </Link>
          </div>

          {/* ── Feature grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="bg-parchment/[0.04] border border-parchment/[0.08] rounded-2xl p-5 hover:bg-parchment/[0.07] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gold/12 flex items-center justify-center mb-4">
                  <Icon size={16} className="text-gold" />
                </div>
                <p className="font-semibold text-parchment text-[13px] mb-1.5 leading-snug">{label}</p>
                <p className="text-parchment/40 text-[12px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
