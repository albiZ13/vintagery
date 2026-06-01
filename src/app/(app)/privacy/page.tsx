import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Informativa sul trattamento dei dati personali di Vintagery.',
  robots: { index: true, follow: false },
}

const LAST_UPDATE = '25 maggio 2026'
const EMAIL       = 'privacy@vintagery.it'

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-14">
      <h1 className="font-serif text-3xl font-bold text-espresso mb-2">Privacy Policy</h1>
      <p className="text-muted text-sm mb-10">Ultimo aggiornamento: {LAST_UPDATE}</p>

      <div className="prose prose-sm max-w-none text-coffee leading-relaxed space-y-8">

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">1. Titolare del trattamento</h2>
          <p>
            Il titolare del trattamento dei dati personali è <strong>Vintagery</strong>.
            Per qualsiasi richiesta relativa alla privacy puoi scrivere a <a href={`mailto:${EMAIL}`} className="text-sienna hover:underline">{EMAIL}</a>.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">2. Dati raccolti</h2>
          <p>Raccogliamo le seguenti categorie di dati:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Dati di account</strong>: email, nome, username, foto profilo (opzionale).</li>
            <li><strong>Contenuti generati</strong>: recensioni, acquisti condivisi, post negozio.</li>
            <li><strong>Dati di navigazione</strong>: log di accesso, cookie tecnici essenziali.</li>
            <li><strong>Dati di preferenza</strong>: mercatini/negozi salvati, preferenze di notifica.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">3. Finalità del trattamento</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Erogazione del servizio e gestione dell'account.</li>
            <li>Invio di notifiche email (solo se attivate dall'utente).</li>
            <li>Prevenzione di abusi e sicurezza della piattaforma.</li>
            <li>Miglioramento del servizio tramite dati aggregati e anonimi.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">4. Base giuridica</h2>
          <p>
            Il trattamento si basa sul <strong>contratto</strong> (erogazione del servizio),
            sul <strong>consenso</strong> (notifiche email, newsletter) e sul
            <strong> legittimo interesse</strong> (sicurezza e prevenzione abusi).
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">5. Conservazione dei dati</h2>
          <p>
            I dati dell'account vengono conservati finché l'account è attivo.
            Puoi richiedere la cancellazione del tuo account in qualsiasi momento
            scrivendo a <a href={`mailto:${EMAIL}`} className="text-sienna hover:underline">{EMAIL}</a>.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">6. Terze parti</h2>
          <p>Utilizziamo i seguenti servizi di terze parti:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Supabase</strong> — database e autenticazione (EU).</li>
            <li><strong>Vercel</strong> — hosting e CDN.</li>
            <li><strong>Resend</strong> — invio email transazionali.</li>
          </ul>
          <p className="mt-2">Nessun dato viene venduto o ceduto a terzi per scopi pubblicitari.</p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">7. I tuoi diritti</h2>
          <p>
            Hai il diritto di accedere, rettificare, cancellare i tuoi dati, opporti al trattamento
            e richiedere la portabilità. Per esercitare questi diritti scrivi a{' '}
            <a href={`mailto:${EMAIL}`} className="text-sienna hover:underline">{EMAIL}</a>.
          </p>
        </section>

        <section>
          <h2 className="font-serif font-semibold text-espresso text-xl mb-3">8. Cookie</h2>
          <p>
            Utilizziamo solo cookie tecnici essenziali per il funzionamento del sito
            (autenticazione, sessione). Non utilizziamo cookie di profilazione o tracciamento di terze parti.
          </p>
        </section>

      </div>
    </div>
  )
}
