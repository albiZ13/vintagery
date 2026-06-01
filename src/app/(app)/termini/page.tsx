import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termini di servizio — Vintagery',
  description: 'Termini e condizioni di utilizzo della piattaforma Vintagery.',
  robots: { index: true, follow: false },
}

const LAST_UPDATE = '26 maggio 2026'
const EMAIL       = 'info@vintagery.it'

export default function TerminiPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-14">
      <h1 className="font-serif text-3xl font-bold text-espresso mb-2">Termini di servizio</h1>
      <p className="text-muted text-sm mb-10">Ultimo aggiornamento: {LAST_UPDATE}</p>

      <div className="prose prose-sm max-w-none text-coffee leading-relaxed space-y-8">

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">1. Accettazione</h2>
          <p>
            Utilizzando Vintagery accetti i presenti Termini di servizio. Se non li accetti,
            non puoi usare la piattaforma. I termini possono essere aggiornati: le modifiche
            sostanziali verranno comunicate via email.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">2. Il servizio</h2>
          <p>
            Vintagery è una piattaforma italiana che raccoglie mercatini vintage, fiere di antiquariato,
            negozi dell'usato ed eventi del settore. I contenuti provengono da fonti pubbliche, da partner
            e da proposte degli utenti. Non siamo organizzatori degli eventi elencati.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">3. Account utente</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Devi avere almeno 16 anni per registrarti.</li>
            <li>Sei responsabile della riservatezza della tua password.</li>
            <li>Ogni account è personale e non trasferibile.</li>
            <li>Ti impegni a fornire informazioni accurate e aggiornate.</li>
            <li>Puoi cancellare il tuo account in qualsiasi momento dalle impostazioni.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">4. Contenuti degli utenti</h2>
          <p>
            Caricando contenuti (foto, recensioni, proposte di mercatino) dichiari di avere i diritti
            necessari e concedi a Vintagery una licenza non esclusiva per visualizzarli sulla piattaforma.
            Ci riserviamo il diritto di rimuovere contenuti che violino questi termini o la normativa vigente.
          </p>
          <p className="mt-2">È vietato pubblicare contenuti:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Falsi, fuorvianti o fraudolenti.</li>
            <li>Offensivi, discriminatori o che incitino all'odio.</li>
            <li>Che violino diritti di terzi (copyright, marchi, privacy).</li>
            <li>Spam o contenuti promozionali non autorizzati.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">5. Negozi e organizzatori</h2>
          <p>
            I titolari di negozi e gli organizzatori di mercatini possono richiedere un profilo verificato.
            La verifica avviene su richiesta ed è soggetta ad approvazione. I dati pubblicati devono essere
            accurati e aggiornati: sei responsabile delle informazioni relative alla tua attività.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">6. Limitazione di responsabilità</h2>
          <p>
            Vintagery aggrega informazioni da fonti pubbliche. Non garantiamo l'accuratezza, la completezza
            o l'aggiornamento delle informazioni sugli eventi. Prima di partecipare a un evento, verifica
            sempre le informazioni direttamente con l'organizzatore.
          </p>
          <p className="mt-2">
            Il servizio è fornito <em>as is</em>. Non siamo responsabili per danni derivanti dall'uso
            o dall'impossibilità di utilizzo della piattaforma.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">7. Proprietà intellettuale</h2>
          <p>
            Il marchio Vintagery, il design, il codice e i contenuti originali della piattaforma sono di
            nostra proprietà. Non puoi copiarli, distribuirli o utilizzarli senza autorizzazione scritta.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">8. Sospensione e chiusura</h2>
          <p>
            Possiamo sospendere o chiudere account che violano questi termini, senza preavviso nei casi gravi.
            Possiamo anche interrompere o modificare il servizio in qualsiasi momento, con ragionevole preavviso.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">9. Legge applicabile</h2>
          <p>
            Questi termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
            il Foro di Pistoia, salvo diversa disposizione inderogabile di legge.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">10. Contatti</h2>
          <p>
            Per qualsiasi domanda su questi termini scrivi a{' '}
            <a href={`mailto:${EMAIL}`} className="text-sienna hover:underline">{EMAIL}</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
