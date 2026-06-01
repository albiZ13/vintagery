# Vintagery

Directory dei mercatini e negozi vintage in Italia.

---

## Setup — Guida passo passo

### Passo 1 — Installa Node.js

1. Vai su **[nodejs.org](https://nodejs.org)**
2. Scarica la versione **LTS** (il pulsante verde)
3. Installa il file `.pkg` scaricato
4. Verifica: apri il Terminale e scrivi `node --version` → deve rispondere con un numero

---

### Passo 2 — Crea il database Supabase (gratuito)

1. Vai su **[supabase.com](https://supabase.com)** → clicca "Start for free"
2. Crea un account (puoi usare GitHub o email)
3. Clicca **"New project"**
   - Nome: `vintagery`
   - Password del database: sceglila e annotala
   - Regione: `West EU (Ireland)`
4. Aspetta ~2 minuti che il progetto si crei

**Crea le tabelle:**
1. Nel pannello Supabase → clicca **"SQL Editor"** (icona <>)
2. Clicca "New query"
3. Copia tutto il contenuto del file `supabase/schema.sql`
4. Incollalo nell'editor e clicca **"Run"** (o Cmd+Enter)
5. Ripeti con il file `supabase/seed.sql` per inserire i dati di esempio

---

### Passo 3 — Configura le variabili d'ambiente

1. Nel pannello Supabase → vai in **Settings → API**
2. Copia:
   - **Project URL** (es. `https://xxxx.supabase.co`)
   - **anon public key** (lunga stringa JWT)
3. Nella cartella del progetto, crea un file `.env.local` copiando `.env.local.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

---

### Passo 4 — Avvia l'app in locale

Apri il Terminale, vai nella cartella del progetto:

```bash
cd /Users/albertozoppi/vintagery
npm install
npm run dev
```

Apri il browser su **[http://localhost:3000](http://localhost:3000)**

---

### Passo 5 — Deploy online (Vercel — gratuito)

1. Vai su **[vercel.com](https://vercel.com)** → crea account
2. Clicca **"Add New → Project"**
3. Carica la cartella del progetto o collegalo da GitHub
4. Nelle impostazioni del deploy, aggiungi le variabili d'ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clicca **Deploy** → in 2 minuti il sito è online con URL pubblico

---

## Struttura del progetto

```
vintagery/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Home page
│   │   ├── mercatini/            ← Lista e dettaglio mercatini
│   │   ├── negozi/               ← Lista e dettaglio negozi
│   │   ├── auth/                 ← Login e registrazione
│   │   └── dashboard/            ← Gestione profilo negozio
│   ├── components/               ← Componenti riutilizzabili
│   ├── lib/                      ← Client Supabase, utilities
│   └── types/                    ← Tipi TypeScript
├── supabase/
│   ├── schema.sql                ← Struttura database
│   └── seed.sql                  ← Dati di esempio (12 mercatini, 4 negozi)
└── README.md                     ← Questa guida
```

---

## Funzionalità incluse

| Funzione | Stato |
|---------|-------|
| Lista mercatini con ricerca e filtri | ✅ |
| Pagina dettaglio mercatino | ✅ |
| Lista negozi con ricerca e filtri | ✅ |
| Pagina profilo negozio | ✅ |
| Recensioni e valutazioni | ✅ |
| Griglia acquisti condivisi (Pinterest style) | ✅ |
| Registrazione utente / negozio | ✅ |
| Dashboard gestione negozio | ✅ |
| Filtro per regione, frequenza, categoria | ✅ |
| Design responsive (mobile + desktop) | ✅ |

## Monetizzazione (già strutturata nel codice)

| Fonte | Come funziona |
|-------|---------------|
| **Premium negozi** | €9/mese — badge verificato, posizione in evidenza, statistiche |
| **Listing in evidenza** | I mercatini `is_featured=true` appaiono in testa |
| **Freemium** | Profilo base gratis, funzionalità avanzate a pagamento |
| **Dati aggregati** | Il database raccoglie dati utili per ricerche di mercato |

Per attivare i pagamenti: integra **Stripe** con Supabase Edge Functions (passo successivo).

---

## Prossimi passi

1. **Upload foto** — Attiva Supabase Storage per caricare foto di mercatini e acquisti
2. **Pagamenti** — Integra Stripe per il piano Premium
3. **Mappa** — Aggiungi la mappa Leaflet nella pagina lista mercatini
4. **App mobile** — Usa Expo/React Native riutilizzando lo stesso backend Supabase
5. **Email** — Configura Supabase Auth con email di benvenuto personalizzata
