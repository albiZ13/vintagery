import { Search, Bookmark, Bell } from 'lucide-react'

const STEPS = [
  {
    n: '01',
    icon: Search,
    title: 'Cerca e filtra',
    desc: 'Cerca per regione, città o mese. Filtra per tipo — antiquariato, kilo vintage, vinili, svuotacantine.',
    accentCls: 'text-sienna',
    bgCls:     'bg-sienna/8',
    numCls:    'text-sienna',
  },
  {
    n: '02',
    icon: Bookmark,
    title: 'Salva e pianifica',
    desc: 'Aggiungi al calendario Google o Apple con un clic. Salva i preferiti e consultali quando vuoi.',
    accentCls: 'text-gold',
    bgCls:     'bg-gold/8',
    numCls:    'text-gold',
  },
  {
    n: '03',
    icon: Bell,
    title: 'Segui i negozi',
    desc: 'Iscriviti ai negozi che ami. Ricevi un avviso quando pubblicano nuove entrate o hanno un evento.',
    accentCls: 'text-coffee',
    bgCls:     'bg-coffee/8',
    numCls:    'text-coffee',
  },
]

export default function LandingHowItWorks() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-5xl mx-auto px-4">

        <div className="mb-16">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-sienna/60 mb-4">
            Come funziona
          </p>
          <h2
            className="font-serif font-bold text-espresso leading-[1.08] tracking-[-0.015em]"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}
          >
            Semplice da subito.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ n, icon: Icon, title, desc, accentCls, bgCls, numCls }) => (
            <div
              key={n}
              className="relative p-8 rounded-2xl border border-border bg-white hover:shadow-[0_8px_32px_rgba(28,46,74,0.09)] hover:border-sienna/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              <span
                className={`absolute top-6 right-7 font-serif font-black ${numCls} opacity-[0.07] leading-none select-none pointer-events-none`}
                style={{ fontSize: '5.5rem' }}
                aria-hidden
              >
                {n}
              </span>

              <div className={`w-11 h-11 rounded-xl ${bgCls} flex items-center justify-center mb-6`}>
                <Icon size={20} className={accentCls} />
              </div>

              <p className={`text-[10px] font-bold tracking-[0.25em] uppercase ${accentCls} mb-3`}>
                Passo {n}
              </p>

              <h3 className="font-serif font-semibold text-espresso text-[18px] mb-3 leading-snug">
                {title}
              </h3>
              <p className="text-muted text-[13px] leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
