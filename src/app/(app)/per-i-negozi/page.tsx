import Link from 'next/link'
import { BadgeCheck, Users, ImageIcon, Star, TrendingUp, ArrowRight, ShieldCheck, Zap, Eye, Link2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apri il tuo profilo negozio — Vintagery',
  description: 'Scopri come aprire il tuo spazio espositivo su Vintagery: visibilità, follower, recensioni e nuove entrate per il tuo negozio vintage.',
}

const STEPS = [
  {
    n: '01',
    title: 'Richiedi la verifica',
    body: 'Compila il modulo con i dati del tuo negozio. Il nostro team verifica che si tratti di un negozio fisico autentico che vende vintage — non accettiamo rivenditori di massa o account falsi.',
  },
  {
    n: '02',
    title: 'Crea il tuo spazio',
    body: 'Una volta verificato, accedi alla dashboard e personalizza il profilo: foto di copertina, descrizione, orari, categorie merceologiche, contatti.',
  },
  {
    n: '03',
    title: 'Pubblica le nuove entrate',
    body: 'Carica foto dei pezzi appena arrivati con caption, prezzo e categorie. Ogni post compare nel feed dei tuoi follower e nella sezione negozi della tua regione.',
  },
  {
    n: '04',
    title: 'Costruisci la tua audience',
    body: 'Gli utenti possono seguire il tuo negozio e ricevere aggiornamenti sulle nuove entrate. Più pubblichi, più sei visibile — il ranking è basato sull\'attività reale.',
  },
]

const FEATURES = [
  {
    icon: ImageIcon,
    title: 'Spazio espositivo curato',
    body: 'Un profilo professionale con griglia foto, info complete e feed di nuove entrate. Il tuo negozio rappresentato al meglio.',
  },
  {
    icon: Users,
    title: 'Sistema di follower',
    body: 'Chi ama il tuo stile ti segue. Ogni volta che pubblichi un pezzo, i tuoi follower lo vedono. Zero algoritmo, zero pagamento per la reach.',
  },
  {
    icon: Star,
    title: 'Recensioni verificate',
    body: 'Solo da utenti che hanno visitato o acquistato. Costruisci una reputazione autentica nel tempo — la più difficile da comprare e la più facile da perdere.',
  },
  {
    icon: TrendingUp,
    title: 'Visibilità che premia l\'attività',
    body: 'Chi pubblica di più sale in cima alla listing e ottiene il badge verde "Attivo". Non è pay-to-win: l\'unico modo per essere più visibile è essere presente e aggiornato.',
  },
  {
    icon: Eye,
    title: 'Visibilità regionale',
    body: 'Gli utenti che selezionano la tua regione vedono il tuo negozio per primo. Il filtro geografico porta traffico qualificato — persone vicine a te.',
  },
  {
    icon: Link2,
    title: 'I tuoi canali, tutti insieme',
    body: 'Nel profilo puoi inserire il link al tuo sito, il profilo Instagram, il numero di telefono e l\'email. Chi ti trova su Vintagery ha subito tutti i modi per contattarti o seguirti altrove.',
  },
]

export default function PerINegoziPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-espresso relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gold/70 mb-5">
            Per i negozi vintage
          </p>
          <h1
            className="font-serif font-bold text-parchment leading-[1.05] mb-6"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
          >
            Il tuo negozio ha già una storia.<br />
            <span className="text-gold">Fa' sì che la trovino.</span>
          </h1>
          <p className="text-parchment/55 text-[15px] leading-relaxed max-w-xl mx-auto mb-10">
            Vintagery è la directory italiana dei negozi vintage verificati. Uno spazio espositivo professionale dove mostrare i tuoi pezzi, costruire una community di follower e competere per visibilità attraverso la qualità del contenuto.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gold text-espresso font-bold rounded-full px-8 py-3.5 text-[14px] hover:bg-[#d4a84c] transition-all shadow-lg shadow-black/20"
          >
            Inizia ora <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Verifica — cosa significa */}
      <section className="bg-white border-b border-border py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-start gap-5 bg-cream border border-border/60 rounded-2xl p-7">
            <div className="w-12 h-12 rounded-xl bg-sienna/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={22} className="text-sienna" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-espresso text-[18px] mb-2">Solo negozi verificati</h2>
              <p className="text-muted text-[13px] leading-relaxed">
                Non è una directory aperta a tutti. Prima di apparire su Vintagery, ogni negozio viene verificato manualmente dal nostro team. Controlliamo che si tratti di un negozio fisico reale che vende autentico vintage. Questo mantiene alto il livello per tutti — per i negozi e per gli utenti che li cercano.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="bg-parchment/40 border-b border-border py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-sienna/60 mb-2">Cosa ottieni</p>
            <h2 className="font-serif font-bold text-espresso text-[1.7rem]">
              Il tuo spazio, le tue regole
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white border border-border/60 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-sienna/8 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-sienna" />
                </div>
                <h3 className="font-serif font-semibold text-espresso text-[15px] mb-2">{title}</h3>
                <p className="text-muted text-[13px] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona — steps */}
      <section className="bg-white border-b border-border py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-sienna/60 mb-2">Il percorso</p>
            <h2 className="font-serif font-bold text-espresso text-[1.7rem]">Come si inizia</h2>
          </div>
          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-espresso text-parchment flex items-center justify-center font-bold text-[13px] flex-shrink-0">
                    {step.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="pb-6">
                  <h3 className="font-serif font-semibold text-espresso text-[16px] mb-1.5">{step.title}</h3>
                  <p className="text-muted text-[13px] leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Obiettivo competizione */}
      <section className="bg-espresso py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold/60 mb-4">L'obiettivo</p>
          <h2
            className="font-serif font-bold text-parchment leading-snug mb-5"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}
          >
            Creare lo spazio vintage più attivo d'Italia
          </h2>
          <p className="text-parchment/55 text-[14px] leading-relaxed max-w-xl mx-auto mb-4">
            Vogliamo che i negozi su Vintagery competano per visibilità pubblicando contenuto di qualità — non pagando per la reach. Il ranking premia chi è presente, chi aggiorna, chi crea interazione reale con la community.
          </p>
          <p className="text-parchment/40 text-[13px] leading-relaxed max-w-lg mx-auto">
            Per gli utenti significa trovare sempre negozi attivi, aggiornati, vivi. Per i negozi significa che l'unico modo per salire è fare bene il proprio lavoro — e mostrarlo.
          </p>
        </div>
      </section>

      {/* CTA finale */}
      <section className="bg-cream border-t border-border py-16">
        <div className="max-w-xl mx-auto px-4 text-center">
          <BadgeCheck size={32} className="text-sienna mx-auto mb-4" />
          <h2 className="font-serif text-[22px] font-bold text-espresso mb-2">Pronto a entrare?</h2>
          <p className="text-muted text-[13px] mb-7 leading-relaxed max-w-sm mx-auto">
            Accedi alla dashboard, compila i dati del tuo negozio e invia la richiesta di verifica. Il team di Vintagery ti risponde entro 48 ore.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-espresso text-parchment font-semibold px-7 py-3 text-[13px] hover:bg-sienna transition-all shadow-sm shadow-espresso/15"
            >
              Vai alla dashboard <ArrowRight size={13} />
            </Link>
            <Link
              href="/negozi"
              className="text-[13px] text-muted hover:text-sienna transition-colors inline-flex items-center gap-1 justify-center"
            >
              Esplora i negozi verificati
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
