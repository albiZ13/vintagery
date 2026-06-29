'use client'

import {
  CheckCircle2, Circle, Clock, Zap, Target, Rocket, Globe,
  ChevronDown, ChevronUp, Code2, Users, Euro, Megaphone, Bot,
  ShoppingBag, Smartphone, FileCode2, Search, Ticket, Flag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────

type MilestoneStatus = 'done' | 'partial' | 'pending'
type PhaseStatus     = 'done' | 'active' | 'planned' | 'vision'

interface Milestone {
  label:     string
  status:    MilestoneStatus
  note?:     string
  impl?:     string           // descrizione tecnica dell'implementazione
  subItems?: string[]         // sotto-task specifiche
  effort?:   string           // stima sforzo
  priority?: 'P0' | 'P1' | 'P2'
}

interface Phase {
  id:         string
  phase:      string
  title:      string
  subtitle:   string
  period:     string
  status:     PhaseStatus
  progress:   number
  color:      string
  icon:       React.ElementType
  objective:  string
  milestones: Milestone[]
}

// ── Roadmap data ───────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: 'p0',
    phase: 'Fase 0',
    title: 'Fondamenta',
    subtitle: 'Infrastruttura, database, deploy',
    period: 'Dic 2025 – Gen 2026',
    status: 'done',
    progress: 100,
    color: '#4a7c59',
    icon: Code2,
    objective: 'Costruire l\'infrastruttura tecnica solida su cui edificare tutto il resto. Zero compromessi su sicurezza e scalabilità.',
    milestones: [
      {
        label: 'Schema Supabase completo (30+ tabelle)',
        status: 'done',
        impl: 'Progettazione relazionale: markets, shops, profiles, reviews, market_events, purchases, notifications, push_subscriptions, conversations, messages, shop_posts. RLS attivo su ogni tabella.',
        subItems: ['Policies RLS per ogni ruolo (anon, user, admin)', 'Indici su campi di ricerca frequente (region, city, next_date)', 'Triggers per aggiornamento contatori (followers_count, posts_count)'],
        effort: '2 settimane',
      },
      {
        label: 'Autenticazione utenti (login, registrazione, OAuth)',
        status: 'done',
        impl: 'Supabase Auth con email+password. Redirect post-conferma via /auth/confirm. Middleware Next.js che protegge tutte le rotte non pubbliche con redirect a /auth/login.',
        subItems: ['Email di conferma personalizzata (template HTML)', 'Reset password via email', 'Onboarding flow post-registrazione (username, regione, interessi)'],
        effort: '1 settimana',
      },
      {
        label: 'Deploy Vercel + dominio vintagery.it',
        status: 'done',
        impl: 'Pipeline CI/CD su Vercel con script npm run deploy (scripts/deploy.sh). Alias www.vintagery.it e vintagery.it. Variabili d\'ambiente in produzione via Vercel CLI.',
        effort: '2 giorni',
      },
      {
        label: 'PWA con Service Worker e manifest',
        status: 'done',
        impl: 'Service Worker in /public/sw.js: cache stratificata (static + dynamic), offline fallback. Manifest.json con icone 192/512px. Precache delle pagine principali (/, /home, /mercatini, /negozi).',
        subItems: ['Push notifications handler nel SW', 'Notification click → apertura URL specifico', 'Cache invalidation su nuova versione'],
        effort: '3 giorni',
      },
      {
        label: 'Mappa interattiva per regione',
        status: 'done',
        impl: 'React Simple Maps con topojson italiano. Gradiente colore per regione basato su conteggio mercatini. Click su regione → filtro mercatini. Marker per ogni mercato con lat/lng.',
        effort: '1 settimana',
      },
      {
        label: 'Admin dashboard prima versione',
        status: 'done',
        impl: 'Pagina /admin accessibile solo a role=admin. Sidebar con 11 sezioni: Live, Dashboard, Revenue, Crescita, Negozi, Mercatini, Proposte, Recensioni, Utenti, Notifiche, Feedback.',
        effort: '2 settimane',
      },
      {
        label: 'Bot blocker per AI scrapers',
        status: 'done',
        impl: 'Middleware che legge User-Agent e blocca 25 bot noti (GPTBot, ClaudeBot, Gemini, Perplexity, ByteSpider...) con 403. Protegge il database dalla scraping massiva.',
        effort: '1 giorno',
      },
    ],
  },

  {
    id: 'p1',
    phase: 'Fase 1',
    title: 'Directory Completa',
    subtitle: 'Tutti i mercatini d\'Italia, in un posto solo',
    period: 'Feb – Apr 2026',
    status: 'done',
    progress: 100,
    color: '#4a7c59',
    icon: CheckCircle2,
    objective: 'Diventare la fonte più completa e accurata sui mercatini vintage e antiquariato italiani. Qualità sopra quantità: ogni mercato verificato manualmente.',
    milestones: [
      {
        label: '962 mercatini verificati in tutte le 20 regioni',
        status: 'done',
        impl: 'Scraper regione per regione con gerarchia di fonti (sito ufficiale >90% confidenza, Facebook, Google Maps). Validazione manuale per ogni inserimento. Campi: name, city, region, lat/lng, frequency, schedule_config, active_months, categories, market_type.',
        subItems: ['Toscana 15, Liguria 14, Piemonte 10 mercati top verificati', 'Schema schedule_config per calcolo automatico next_date', 'Campo active_months per mercati stagionali', 'Workflow validazione provincia per provincia'],
        effort: '8 settimane',
      },
      {
        label: 'Calcolo automatico next_date per mercati ricorrenti',
        status: 'done',
        impl: 'Funzione resolveDisplayDate() in /lib/cadenza.ts: legge schedule_config (type: monthly/weekly, week: 1-4/-1, day: sunday...) e calcola la prossima occorrenza. Gestisce off-season con active_months. Cron settimanale per ricalcolo bulk.',
        subItems: ['Support per "ultima domenica del mese" (week: -1)', 'Support per sabato+domenica contemporaneamente', 'Indicatore visivo "data stimata" vs "data confermata"'],
        effort: '1 settimana',
      },
      {
        label: 'Featured card home con meteo weekend',
        status: 'done',
        impl: 'FeaturedMarketCard: card grande con gradient per regione, data prossima occorrenza, meteo 2 giorni da Open-Meteo API (forecast gratuito). Il mercato in evidenza è quello con next_date più vicina is_featured=true.',
        subItems: ['Gradiente colore unico per ogni regione italiana', 'Meteo: temperatura max/min, icona WMO, probabilità pioggia', 'Bottone "Aggiungi al calendario" → .ics download'],
        effort: '1 settimana',
      },
      {
        label: 'Sistema proposte mercatini dagli utenti',
        status: 'done',
        impl: 'Form /proponi-mercatino → tabella market_proposals. Admin può approvare (→ inserimento in markets) o rifiutare. Email di notifica all\'utente. Badge +25 trust_score per proposta approvata.',
        effort: '3 giorni',
      },
      {
        label: 'Newsletter email venerdì ore 17:00',
        status: 'done',
        impl: 'Cron Supabase Edge Function che gira ogni venerdì alle 15:00 UTC (17:00 CEST). Recupera mercatini del weekend per regione. Invia via Resend API ai subscriber di region_subscriptions. Template HTML con mercatini in evidenza, meteo, link al calendario.',
        subItems: ['Form iscrizione pubblico su landing page', 'API /api/subscribe per login-free subscription', 'Unsubscribe token univoco per ogni utente', 'Log invii in newsletter_log'],
        effort: '1 settimana',
      },
      {
        label: 'Push notifications Web Push (VAPID)',
        status: 'done',
        impl: 'Service Worker registrato in layout.tsx. Chiavi VAPID generate e configurate su Vercel. Componente PushNotificationButton: subscribe → POST /api/push/subscribe → salva in push_subscriptions. Invio via web-push npm package.',
        effort: '4 giorni',
      },
      {
        label: 'Recensioni, like, preferiti, follow utenti',
        status: 'done',
        impl: 'Tabelle reviews, review_likes, user_favorites, user_follows, review_comments, comment_likes. Avg_rating e review_count aggiornati con trigger su ogni update. Pagina profilo con storico recensioni e mercatini salvati.',
        effort: '1 settimana',
      },
      {
        label: '353 pin Pinterest generati automaticamente',
        status: 'done',
        impl: 'Script Python genera-pin.py: per ogni città con mercatini, crea immagine 1000×1500px con Pillow (gradiente regione, nome città, numero mercatini, URL vintagery.it). Output JPEG 46MB totali in /pinterest_pins/.',
        subItems: ['Gradiente colore dinamico per regione', 'Font Playfair Display caricato da file TTF', 'Watermark URL in basso', 'Rigenerazione automatica quando cambiano i mercatini'],
        effort: '2 giorni',
      },
      {
        label: '30+ caroselli TikTok pronti in coda',
        status: 'done',
        impl: 'Sistema caroselli in ~/Desktop/Vintagery TikTok/: server locale Next.js su localhost:3000 che renderizza HTML, Puppeteer per screenshot. Cartelle numerate con info.txt (orario pubblicazione, caption, hashtag). Queue in /queue/, già pubblicati in /_pubblicati/.',
        subItems: ['Template HTML v3 con safe zone TikTok (bottom 480px)', 'Foto di sfondo abbinate al contenuto della slide', 'Caption e hashtag predefiniti per ogni tipo di contenuto'],
        effort: '3 settimane',
      },
      {
        label: 'Sistema messaggistica shop ↔ utente',
        status: 'done',
        impl: 'Tabelle conversations e messages. Un utente può aprire una conversazione con un negozio. Notifica in-app per nuovi messaggi. Contatori unread_shop / unread_user. Pagina /messaggi e /messaggi/[id].',
        effort: '1 settimana',
      },
    ],
  },

  {
    id: 'p2',
    phase: 'Fase 2',
    title: 'Monetizzazione',
    subtitle: 'Prime entrate ricorrenti, primi negozi reali',
    period: 'Mag – Set 2026',
    status: 'active',
    progress: 42,
    color: '#c9a84c',
    icon: Zap,
    objective: 'Raggiungere i primi €500 MRR entro settembre 2026 attraverso abbonamenti negozi. Dimostare il modello prima di scalare. Ogni euro conta come validazione.',
    milestones: [
      {
        label: 'Abbonamento negozi Premium a €14/mese (Stripe)',
        status: 'done',
        priority: 'P0',
        impl: 'Stripe Checkout per abbonamento mensile ricorrente. Tabella shops con colonne plan, stripe_customer_id, stripe_subscription_id, plan_expires_at. Webhook /api/stripe/webhook gestisce invoice.paid, customer.subscription.deleted.',
        subItems: ['Webhook Stripe con signature verification', 'Aggiornamento automatico plan su payment success/failure', 'Email di conferma abbonamento via Resend'],
        effort: '1 settimana',
      },
      {
        label: 'Trial gratuito 3 mesi per early adopter',
        status: 'done',
        priority: 'P0',
        impl: 'Campo trial_ends_at in shops. Al momento della registrazione: trial_ends_at = now() + 3 mesi. La UI mostra banner "Trial attivo fino a [data]". Alla scadenza: downgrade automatico a free via cron.',
        effort: '2 giorni',
      },
      {
        label: 'Shop analytics (views, click mappa, click contatti)',
        status: 'done',
        priority: 'P1',
        impl: 'Tabella shop_analytics con event_type (view, map_click) e date. Componente ShopViewTracker lato client traccia ogni visita. Dashboard shop mostra grafico ultime 4 settimane. Solo negozi Premium vedono analytics dettagliati.',
        effort: '3 giorni',
      },
      {
        label: '20 negozi demo per visualizzazione sezione',
        status: 'done',
        priority: 'P1',
        impl: 'Colonna is_demo aggiunta a shops. 20 negozi fittizi con badge=esempio distribuiti per regione e categoria. Esclusi da tutte le statistiche (count, MRR, regioni). Visibili nella pagina /negozi per mostrare il layout.',
        effort: '1 giorno',
      },
      {
        label: 'Acquisizione primi 10 negozi reali verificati',
        status: 'pending',
        priority: 'P0',
        note: 'outreach manuale in corso',
        impl: 'Identificare negozi vintage con profilo Instagram attivo (500+ follower) in Toscana, Lombardia, Lazio. Contatto via DM Instagram + email. Pitch: "Trial 3 mesi gratis, poi €14/mese. Sei visibile a X utenti nella tua regione." Sequenza follow-up a 7 giorni.',
        subItems: [
          'Creare spreadsheet prospect (negozio, città, Instagram, email, stato)',
          'Template DM Instagram (max 3 righe, link diretto a /per-i-negozi)',
          'Pagina /per-i-negozi con numero utenti reale e mappa coverage',
          'Onboarding guidato step-by-step per nuovo negozio (5 step)',
          'Video demo 60 secondi della dashboard negozio',
        ],
        effort: '4 settimane ongoing',
      },
      {
        label: 'Sponsorizzazione market events (badge In Evidenza)',
        status: 'pending',
        priority: 'P1',
        impl: 'Campi is_sponsored e sponsored_until già presenti in market_events. Aggiungere: pagina /sponsorizza con prezzi (€X per 7 giorni, €Y per 30 giorni), Stripe Checkout per acquisto, cron giornaliero per scadenza automatica. Mercato sponsorizzato appare in cima alla lista regione e ha badge "In Evidenza".',
        subItems: [
          'Pagina /sponsorizza con form e prezzi',
          'Endpoint POST /api/sponsor/market con Stripe Checkout',
          'Webhook Stripe per attivazione immediata',
          'Cron ogni notte alle 02:00 per disattivare is_sponsored scaduti',
          'Badge visivo "In Evidenza" sulla MarketCard e FeaturedMarketCard',
          'Analytics per organizzatore: views durante periodo sponsorizzato',
        ],
        effort: '1 settimana',
      },
      {
        label: 'Dashboard organizzatori mercatini ricorrenti',
        status: 'pending',
        priority: 'P1',
        impl: 'Ruolo organizer in profiles. Markets già ha organizer_id come FK. Pagina /dashboard/organizzatore: lista mercati gestiti, statistiche views/preferiti, form aggiornamento date prossima edizione, upload foto, editor descrizione/tips. L\'organizzatore può inviare un annuncio push a tutti i follower del mercato.',
        subItems: [
          'Form /richiedi-gestione-mercato → admin approva assegnazione',
          'Tabella organizer_invites per inviti multipli (co-organizzatori)',
          'Sezione "Annunci" per comunicare info ai follower (es. annullamento)',
          'Notifica push/email automatica ai follower quando si aggiornano le date',
          'Statistiche: views totali, favoriti, click mappa, proposte ricevute',
        ],
        effort: '2 settimane',
      },
      {
        label: 'Sistema abbonamento organizzatori (€X/anno)',
        status: 'pending',
        priority: 'P2',
        impl: 'Piano a parte rispetto ai negozi. Organizzatori che gestiscono mercati ricorrenti pagano un canone annuo per: sbloccare dashboard avanzata, annunci push, statistiche dettagliate, badge "Organizzatore Verificato", priorità nei risultati di ricerca.',
        subItems: [
          'Piano: €49/anno (1 mercato), €99/anno (fino a 5 mercati)',
          'Pagina prezzi /per-gli-organizzatori',
          'Integrazione Stripe con rinnovo annuale',
          'Feature flag basata su organizer_plan in profiles',
        ],
        effort: '1 settimana',
      },
      {
        label: 'Targeting geografico newsletter (per regione e categoria)',
        status: 'partial',
        note: 'infrastruttura pronta, personalizzazione da implementare',
        priority: 'P1',
        impl: 'Tabella region_subscriptions già ha campi city e categories. La cron newsletter già filtra per regione. Manca: segmentazione per categoria (iscritto a "Dischi" riceve solo mercatini vintage musicali), digest personalizzato con preferenze utente, A/B test oggetto email.',
        subItems: [
          'Aggiornare cron newsletter per filtrare per categories[]',
          'Sezione "Le tue preferenze" in /impostazioni',
          'Preview email personalizzata prima dell\'invio (admin)',
          'Metriche aperture email via Resend webhook',
        ],
        effort: '4 giorni',
      },
      {
        label: 'Pagina /per-i-negozi con social proof e metriche live',
        status: 'partial',
        note: 'landing esiste, metriche da rendere dinamiche',
        priority: 'P1',
        impl: 'La pagina /per-i-negozi esiste. Aggiungere: numero utenti registrati live (query Supabase), numero mercatini nella regione dell\'utente, numero ricerche settimanali, testimonianze negozi reali (quando disponibili), video demo embed, FAQ con obiezioni comuni.',
        subItems: [
          'Counter utenti reali in tempo reale con revalidate ogni ora',
          'Sezione "Quanto costa la visibilità senza Vintagery" (calcolo ROI)',
          'Modulo contatto diretto per chi ha dubbi prima di iscriversi',
        ],
        effort: '3 giorni',
      },
    ],
  },

  {
    id: 'p3',
    phase: 'Fase 3',
    title: 'Crescita Community',
    subtitle: 'Social, contenuti, gamification, retention',
    period: 'Set – Dic 2026',
    status: 'planned',
    progress: 0,
    color: '#8b5cf6',
    icon: Target,
    objective: 'Trasformare Vintagery da directory a community. Gli utenti non solo trovano mercatini — li vivono, li condividono, ci tornano. L\'obiettivo è un DAU/MAU ratio del 15%.',
    milestones: [
      {
        label: 'TikTok publisher automatico con cron',
        status: 'pending',
        priority: 'P0',
        impl: 'Completare OAuth TikTok (client_key aw36mh09ghgdj0cp configurato, manca autorizzazione redirect URI su developers.tiktok.com). Eseguire 1_auth.py → credentials.json. Poi 4_setup_cron.py per cron macOS 09:05/19:05. Ogni giorno: lo scheduler legge info.txt delle cartelle con data odierna e pubblica le slide come draft TikTok (1 tap per confermare in inbox).',
        subItems: [
          'Aggiungere http://localhost:8080/callback come redirect URI autorizzato su TikTok Developer Portal',
          'Eseguire python3 1_auth.py → salva credentials.json',
          'Eseguire python3 4_setup_cron.py → cron attivo su macOS',
          'Creare 30+ caroselli in coda con date settimanali',
          'Target: 2 post/settimana costanti per 3 mesi',
          'Richiedere App Review TikTok per pubblicazione diretta (senza draft)',
        ],
        effort: '2 giorni setup + ongoing',
      },
      {
        label: 'Instagram cross-posting (zero lavoro extra)',
        status: 'pending',
        priority: 'P1',
        impl: 'Aprire profilo @vintagery.it quando TikTok è in ritmo. Stessi caroselli TikTok caricati manualmente o via Meta Content Publishing API (richiede Business Account). Link in bio → vintagery.it. Instagram ha audience 35-55 anni più presente che su TikTok. Vantaggio chiave: link cliccabile in bio.',
        subItems: [
          'Aprire account @vintagery.it su Instagram',
          'Collegare a Meta Business Suite',
          'Valutare Meta Content Publishing API per automazione',
          'Bio: "🏛️ Mercatini vintage in Italia • Link per trovare quello vicino a te 👇"',
          'Story ogni venerdì con link al calendario weekend (funzione swipe up)',
        ],
        effort: '1 giorno setup + 30 min/settimana',
      },
      {
        label: 'Blog editoriale: guide vintage per ogni città',
        status: 'pending',
        priority: 'P1',
        impl: 'Sezione /blog in Next.js. Articoli come records in Supabase (tabella blog_posts: slug, title, excerpt, body_html, author, cover_url, published_at, categories, seo_title, seo_description). 10 guide città di lancio: Firenze, Milano, Roma, Torino, Bologna, Napoli, Venezia, Palermo, Genova, Bari. Struttura ogni guida: storia del mercato vintage locale, i 5 migliori mercatini, cosa si trova, come arrivare, stagionalità.',
        subItems: [
          'Tabella blog_posts con full-text search (PostgreSQL tsvector)',
          'Editor admin WYSIWYG (Tiptap o simile) per scrivere articoli',
          'Schema JSON-LD Article per SEO (author, datePublished, image)',
          'Pagine /blog e /blog/[slug] con sitemap automatica',
          'Related markets widget alla fine di ogni articolo',
          'Condivisione automatica su TikTok/Instagram quando un articolo viene pubblicato',
        ],
        effort: '3 settimane (infrastruttura) + scrittura ongoing',
      },
      {
        label: 'Sistema gamification: trust score, badge, livelli',
        status: 'pending',
        priority: 'P2',
        impl: 'Trust_score già esiste in profiles. Aggiungere tabella badges con tipo, icona, soglia. Trigger PostgreSQL incrementa trust_score su: recensione pubblicata (+10), like ricevuto (+2), mercato proposto approvato (+25), foto caricata (+5), profilo completato (+15), primo anno di membership (+20). Livelli: Scopritore (0-50), Esperto (51-200), Collezionista (201-500), Maestro (500+). Badge speciali: "Critico" (10+ recensioni), "Esploratore" (mercatini in 5+ regioni), "Pioneer" (tra i primi 100 iscritti).',
        subItems: [
          'Tabella badges (id, slug, label, icon_url, threshold_type, threshold_value)',
          'Tabella user_badges (user_id, badge_id, earned_at)',
          'Trigger SQL per aggiornamento automatico trust_score',
          'Componente BadgeDisplay nel profilo pubblico',
          'Notifica in-app quando si sblocca un nuovo badge',
          'Classifica pubblica top 10 utenti più attivi per regione',
        ],
        effort: '1 settimana',
      },
      {
        label: 'Calendario personale "I miei mercatini"',
        status: 'pending',
        priority: 'P1',
        impl: 'Vista mensile dei mercatini salvati (user_favorites) con le date calcolate da resolveDisplayDate(). Pagina /il-mio-calendario con calendar grid. Ogni giorno mostra i mercatini in programma. Notifica push il giovedì sera: "Questo weekend hai X mercatini in programma". Export bulk .ics di tutti i preferiti via /api/calendar/[token].ics.',
        subItems: [
          'Componente CalendarGrid mensile con indicatori per giorni con mercatini',
          'Vista "agenda" lista alternativa al calendario',
          'Notifica push automatica il giovedì sera per chi ha mercatini nel weekend',
          'Endpoint /api/calendar/[token].ics per sincronizzazione con Google Calendar/Apple Calendar',
          'Deep link dal calendario al dettaglio mercatino',
        ],
        effort: '1 settimana',
      },
      {
        label: 'Sistema tag mercatini (cosa si trova)',
        status: 'pending',
        priority: 'P2',
        impl: 'Aggiungere campo tags[] a markets con vocabolario fisso: abbigliamento, mobili, dischi, libri, arte, ceramica, gioielli, elettronica, toys, fumetti, pelletteria, modernariato, design, stampe, argenteria. Filtro per tag nella pagina /mercatini. Tag mostrati come pill sulla MarketCard. Contribuzione utenti: possono suggerire tag (review-like flow, moderazione).',
        subItems: [
          'UI filtro multi-tag nella pagina mercatini (checkbox)',
          'Pill badge sui tag nella card mercatino',
          'API di ricerca per tag (query contains)',
          'Form "Segnala tag" per utenti autenticati',
          'Moderazione admin: approva/rifiuta tag suggeriti',
        ],
        effort: '4 giorni',
      },
      {
        label: 'Notifiche personalizzate per categoria e regione',
        status: 'pending',
        priority: 'P1',
        impl: 'Estendere il sistema notifiche push: invece di broadcast, targetizzare per profiles.region e profiles.interests. Esempio: utente di Milano interessata ad abbigliamento → riceve push solo per mercatini vintage moda in Lombardia. Batch invio il giovedì sera via Edge Function.',
        subItems: [
          'Aggiornare schema push_subscriptions con metadata (region, interests)',
          'Edge Function che raggruppa utenti per regione+interessi',
          'UI /impostazioni → sezione "Le mie notifiche" con toggle granulari',
          'Rate limit: max 2 push/settimana per utente',
          'Metriche click-through rate per ottimizzare copy',
        ],
        effort: '4 giorni',
      },
      {
        label: 'Programma referral negozi',
        status: 'pending',
        priority: 'P2',
        impl: 'Un negozio Premium porta un altro negozio → 1 mese gratis per entrambi. Tabella referrals (referrer_id, referred_id, credited_at, expires_at). Codice referral unico per ogni negozio (generato al momento dell\'attivazione). Dashboard negozio mostra: "Hai portato X negozi, risparmiato €Y".',
        subItems: [
          'Tabella referrals con stato (pending/credited/expired)',
          'Codice univoco per ogni negozio Premium (5 caratteri alfanumerici)',
          'Form registrazione nuovo negozio con campo "Codice referral"',
          'Cron mensile che verifica e applica i crediti Stripe',
          'Email automatica al momento dell\'accredito',
        ],
        effort: '1 settimana',
      },
      {
        label: 'Sezione "Acquisti": foto e prezzi degli oggetti trovati',
        status: 'pending',
        priority: 'P2',
        impl: 'Tabella purchases già esiste (user_id, shop_id/market_id, image_url, description, price, category, likes_count). Aggiungere UI: card feed tipo Instagram, like, commenti. Sezione "I miei acquisti" nel profilo. Feed pubblico su /scoperte. Permette a utenti di mostrare i loro colpi migliori al mercatino.',
        subItems: [
          'Pagina /scoperte con feed pubblico degli acquisti (paginato)',
          'Componente PurchaseCard con immagine, prezzo, categoria, like',
          'Form "Aggiungi acquisto" con upload foto + metadati',
          'Integrazione mappa: vedi dove è stato comprato',
          'Sezione "Scoperte" nel profilo utente',
        ],
        effort: '1 settimana',
      },
    ],
  },

  {
    id: 'p4',
    phase: 'Fase 4',
    title: 'Piattaforma',
    subtitle: 'Marketplace, app nativa, API, SEO massiccio',
    period: 'Gen – Giu 2027',
    status: 'planned',
    progress: 0,
    color: '#3b82f6',
    icon: Rocket,
    objective: 'Trasformare Vintagery da app web a piattaforma con ecosistema. Marketplace, API per terze parti, app nativa. Target: €5.000 MRR entro giugno 2027.',
    milestones: [
      {
        label: 'Marketplace peer-to-peer con Stripe Connect',
        status: 'pending',
        priority: 'P0',
        impl: 'Tabella listings (user_id, title, description, price, category, images[], status: draft/active/sold, location). Flusso: pubblica annuncio → moderazione automatica (contenuti vietati) → attivo → pagamento Stripe Connect → consegna → rilascio fondi al venditore (2 giorni holdback). Commissione Vintagery: 5% + €0.30. Trust score come prerequisito (minimo livello Esperto).',
        subItems: [
          'Stripe Connect onboarding per i venditori (KYC automatizzato)',
          'Pagina /mercato con filtri per categoria, regione, prezzo',
          'Form pubblicazione annuncio con upload fino a 6 foto',
          'Sistema messaggistica già pronto per acquirente/venditore',
          'Dispute management: 30 giorni per aprire controversia',
          'Valutazione acquirente/venditore post-transazione',
          'Protezione acquirente: rimborso se oggetto non corrisponde',
        ],
        effort: '4 settimane',
      },
      {
        label: 'App nativa iOS e Android con Capacitor',
        status: 'pending',
        priority: 'P0',
        impl: 'Capacitor.js wrappa la PWA Next.js esistente: zero riscrittura, stessa codebase. Aggiungere: @capacitor/camera per upload foto dirette, @capacitor/geolocation per "mercatini vicino a me", @capacitor/push-notifications per notifiche native (più affidabili di Web Push su iOS). Build con Xcode (iOS) e Android Studio. Apple Developer Account €99/anno, Google Play $25 una tantum.',
        subItems: [
          'Installare Capacitor: npx cap init + npx cap add ios + npx cap add android',
          'Configurare capacitor.config.ts con appId=it.vintagery.app',
          'Plugin @capacitor/camera: sostituisce <input type=file> su mobile',
          'Plugin @capacitor/geolocation: pagina /vicino-a-me con raggio configurabile',
          'Plugin @capacitor/push-notifications: migliora reliability su iOS (APNs)',
          'Splash screen e icone per tutti i breakpoint (da /public/icon-*.png)',
          'Submit App Store: screenshot, descrizione IT/EN, categoria Travel',
          'Submit Google Play: stessa operazione, più veloce (review 3-7 gg)',
          'CI/CD con Fastlane per build automatizzate su ogni deploy',
        ],
        effort: '3 settimane',
      },
      {
        label: 'API pubblica per organizzatori (REST + webhook)',
        status: 'pending',
        priority: 'P1',
        impl: 'Endpoint /api/v1/ con autenticazione via API key (tabella api_keys: key_hash, shop_id/profile_id, plan, rate_limit). Rate limiting via Upstash Redis: 100 req/ora free, 1000/ora Pro. Endpoint principali: GET /markets (lista con filtri), GET /markets/:id, PATCH /markets/:id/dates (aggiorna next_date), POST /markets/:id/announce (notifica a follower), GET /markets/:id/stats.',
        subItems: [
          'Tabella api_keys con HMAC-SHA256 hashing della chiave',
          'Middleware rate limiting con Upstash Redis (sliding window)',
          'Documentazione interattiva OpenAPI 3.0 su /api/docs (Swagger UI)',
          'Dashboard API key management in /dashboard/organizzatore',
          'Webhook: POST a URL configurato quando cambiano le date',
          'SDK JavaScript semplice per integrazioni facili',
        ],
        effort: '2 settimane',
      },
      {
        label: 'Dashboard Pro organizzatori con statistiche avanzate',
        status: 'pending',
        priority: 'P1',
        impl: 'Estendere /dashboard con ruolo organizer. Sezioni: Overview (views totali, favoriti, follower), Calendario (tutte le date future con possibilità di modifica), Annunci (broadcast push/email a follower), Partecipanti (negozi che partecipano al mercato, via shop_market_links), Fiera (upload foto, descrizione dettagliata, FAQ).',
        subItems: [
          'Grafico views settimanale ultime 12 settimane',
          'Heatmap giorni/ore di maggior traffico',
          'Export CSV delle statistiche',
          'Tool "Pianifica annuncio": crea notifica push schedulata',
          'Integrazione con Google Calendar per sync bidirezionale',
        ],
        effort: '2 settimane',
      },
      {
        label: 'SEO programmatico: 2000+ pagine per ogni comune',
        status: 'pending',
        priority: 'P0',
        impl: 'Pagine statiche per ogni combinazione regione/città con mercatini (es. /mercatini/toscana/firenze, /mercatini/lombardia/milano). generateStaticParams() con revalidate ogni 24h. Structured data JSON-LD Event per ogni mercatino. Open Graph image dinamica via @vercel/og con nome città e numero mercatini. Meta description personalizzata. Target: posizionamento su "mercatini [città]" per le 500 città principali.',
        subItems: [
          'Route /mercatini/[regione]/[slug-città] con SSG',
          'generateStaticParams da lista cities nel DB',
          'JSON-LD Event schema per ogni Market (name, location, startDate)',
          '@vercel/og per immagini OG dinamiche (1200×630)',
          'Breadcrumb schema: Italia > Regione > Città',
          'Sitemap.xml aggiornata automaticamente con ogni nuova città',
          'Internal linking: ogni mercatino linka a città, regione, categoria',
          'Monitoraggio posizioni con Google Search Console API',
        ],
        effort: '2 settimane',
      },
      {
        label: 'Export calendario bulk iCal + sync Google Calendar',
        status: 'pending',
        priority: 'P2',
        impl: 'Endpoint /api/calendar/[token].ics che genera file iCal con tutti i mercatini preferiti dell\'utente. Token univoco e stabile per sincronizzazione continua (non one-time download). Aggiornamento automatico quando l\'utente aggiunge/rimuove preferiti. Compatible con Google Calendar, Apple Calendar, Outlook.',
        subItems: [
          'Tabella calendar_tokens (user_id, token, created_at)',
          'Libreria ical.js per generazione file iCal',
          'Ogni evento include: nome, data, luogo, descrizione, URL',
          'Pagina /impostazioni → "Sincronizza calendario" con istruzioni per ogni piattaforma',
          'Google Calendar "Aggiungi con un click" via Google Calendar API',
        ],
        effort: '3 giorni',
      },
      {
        label: 'Sistema biglietteria per fiere vintage premium',
        status: 'pending',
        priority: 'P2',
        impl: 'Per mercatini di alto profilo (es. Arezzo Antiquaria, Vintage Selection Milano) che vogliono vendere biglietti online. Flusso: organizzatore crea evento a pagamento → Stripe Events → acquirente paga → riceve QR code via email → scanner all\'ingresso (web app leggera). Commissione Vintagery: 2.5% + €0.30 per biglietto. Rimborso fino a 48h prima dell\'evento.',
        subItems: [
          'Tabella tickets (event_id, user_id, qr_code_hash, status, price)',
          'QR code generation con @qrcode/react + crittografia dell\'ID',
          'Email con biglietto PDF allegato via Resend',
          'Pagina /eventi/[id]/biglietti con form acquisto',
          'Scanner app: pagina /scan con webcam QR reader per organizzatori',
          'Dashboard incassi per organizzatore con export contabile',
        ],
        effort: '2 settimane',
      },
      {
        label: 'Abbonamento Premium utenti (€X/mese) con vantaggi',
        status: 'pending',
        priority: 'P2',
        impl: 'Piano premium per utenti comuni (non negozi): accesso a statistiche avanzate sui mercatini, alert email/push per nuovi mercatini nella propria regione, lista d\'attesa per fiere esclusive, badge Premium nel profilo, marketplace fee ridotta (3% invece di 5%). Pricing: €4.90/mese o €39/anno.',
        subItems: [
          'Feature flag user_plan in profiles (free/premium)',
          'Pagina /abbonati con lista benefici e pricing',
          'Stripe Checkout per abbonamento utente',
          'Gating delle funzioni premium (middleware check)',
          'Trial 30 giorni per nuovi utenti',
        ],
        effort: '1 settimana',
      },
    ],
  },

  {
    id: 'p5',
    phase: 'Fase 5',
    title: 'Espansione Europa',
    subtitle: 'Francia, Spagna, AI, partnership strategiche',
    period: '2027 – 2028',
    status: 'vision',
    progress: 0,
    color: '#ec4899',
    icon: Globe,
    objective: 'Diventare il punto di riferimento europeo per chi cerca mercatini vintage. Ogni paese con la sua community, un unico prodotto. Target: 50.000 utenti attivi mensili cross-country.',
    milestones: [
      {
        label: 'Espansione Francia: marchés aux puces e brocantes',
        status: 'pending',
        priority: 'P0',
        impl: 'Aggiungere campo country a markets e market_events. Scraper specializzato per fonti francesi: brocanteurs.fr, chineur.fr, agenda-antiquaires.fr, leparisien.fr/brocantes. Dataset iniziale: ~300 mercati top (Parigi-Clignancourt, Vanves, Montreuil; Lione-Vaise; Bordeaux-Saint-Michel; Marsiglia; Lille-Wazemmes). Localizzazione francese con next-intl. Dominio fr.vintagery.it o vintagery.fr.',
        subItems: [
          'Campo country in DB + filtro UI per paese',
          'next-intl per internazionalizzazione (IT/FR/ES)',
          'Scraper Python per fonti francesi con validazione manuale',
          'Gradienti e palette per regioni francesi',
          'Partenariato con blogger brocante francesi per validazione dati',
          'Newsletter settimanale in francese',
        ],
        effort: '8 settimane',
      },
      {
        label: 'Espansione Spagna e Portogallo',
        status: 'pending',
        priority: 'P1',
        impl: 'Mercati target: Rastro di Madrid, Els Encants di Barcellona, Feira da Ladra di Lisbona. Fonti: todocoleccion.net, segundamano.es. Stesso approccio Francia. Localizzazione ES/PT. Accordo con creator vintage spagnoli per outreach.',
        effort: '6 settimane',
      },
      {
        label: 'AI per raccomandazioni personalizzate',
        status: 'pending',
        priority: 'P1',
        impl: 'Modello collaborativo: "utenti con i tuoi stessi interessi visitano anche X". Input: mercatini salvati, recensioni positive (rating ≥ 4), regione, categories. Algoritmo: collaborative filtering con matrix factorization (numpy/scikit-learn in Edge Function Python). Claude API per generare descrizioni personalizzate: "Potrebbe interessarti perché cerchi mobili anni \'60 come altri utenti di Firenze". Sezione "Per te" nella home.',
        subItems: [
          'Tabella user_events per tracking comportamento (view, save, review)',
          'Edge Function Python con scikit-learn per recommendations',
          'Claude API per copywriting descrizioni personalizzate',
          'A/B test: con/senza AI recommendations su click-through rate',
          '"Scopri mercatini simili" sotto ogni pagina mercatino',
          'Email settimanale personalizzata "Scelti per te"',
        ],
        effort: '3 settimane',
      },
      {
        label: 'Partnership con guide città e portali turistici',
        status: 'pending',
        priority: 'P1',
        impl: 'Contattare: Touring Club Italiano, Slow Travel Italia, guide Lonely Planet/Rough Guide Italia, portali regionali turismo (tuscany.com, visitmilano.it). Proposta: widget "Mercatini vintage vicino a te" embeddabile con iframe o JavaScript snippet. Revenue share sul traffico referral. Obiettivo: 10 partnership attive entro fine 2027.',
        subItems: [
          'Widget embeddabile: <iframe src="vintagery.it/widget/[regione]">',
          'API pubblica /api/widget/[regione] per partner avanzati',
          'Dashboard partner con statistiche click e traffic',
          'Pagina /partner con kit press e linee guida brand',
        ],
        effort: '4 settimane (outreach) + ongoing',
      },
      {
        label: 'Foto AI-enhanced per mercatini senza immagini',
        status: 'pending',
        priority: 'P2',
        impl: 'I mercatini senza image_url (circa 40% del totale) mostrano un placeholder generico. Soluzione: generare immagini via Stable Diffusion o DALL-E 3 prompt-engineerato con: nome città, tipo mercatino, stagione. Costo stimato: €0.02/immagine × 400 = €8 one-time. Immagini con watermark "Illustrazione AI" per trasparenza. Caching su Supabase Storage.',
        subItems: [
          'Cron che trova mercatini con image_url null',
          'Prompt template: "Vintage flea market in [city], Italy, [season], golden hour photography, film grain"',
          'Upload su Supabase Storage con path /ai-generated/[market_id].jpg',
          'Badge "Illustrazione" sulla card per trasparenza',
        ],
        effort: '3 giorni',
      },
      {
        label: 'Vintagery Events: biglietteria per fiere premium internazionali',
        status: 'pending',
        priority: 'P2',
        impl: 'Evoluzione del sistema biglietteria (Fase 4) applicato a fiere internazionali: Vintage Textile & Fashion di Parigi, Long Beach Antique Market (USA), Portobello Market edizioni speciali. Accordo con organizzatori per distribuzione esclusiva o co-marketing. Commissione: 3% per eventi premium internazionali.',
        effort: '4 settimane',
      },
      {
        label: 'White label per grandi organizzatori (Arezzo, Porta Portese)',
        status: 'pending',
        priority: 'P2',
        impl: 'Per mercatini storici con brand forte. Vintagery fornisce infrastruttura (auth, pagamenti, mappa, notifiche) con branding personalizzato. Esempio: "Arezzo Antiquaria — powered by Vintagery". L\'organizzatore gestisce tutto dalla sua dashboard. Pricing: €500/mese flat + 1.5% sulle transazioni. Richiede contratto annuale.',
        subItems: [
          'Multi-tenancy: tabella tenants con custom domain e branding',
          'CSS custom per ogni tenant (logo, colori, font)',
          'Dominio personalizzato (es. antiquaria-arezzo.it → Vintagery sotto)',
          'Dashboard bianco + analytics riservata all\'organizzatore',
          'SLA garantito: 99.9% uptime con supporto priority',
        ],
        effort: '4 settimane',
      },
    ],
  },
]

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PhaseStatus, { label: string; bg: string; border: string; badge: string }> = {
  done:    { label: 'Completata',  bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  active:  { label: 'In corso',   bg: 'bg-amber-50',    border: 'border-amber-200',   badge: 'bg-amber-100  text-amber-700'   },
  planned: { label: 'Pianificata', bg: 'bg-slate-50',    border: 'border-slate-200',   badge: 'bg-slate-100  text-slate-600'   },
  vision:  { label: 'Visione',    bg: 'bg-pink-50',     border: 'border-pink-200',    badge: 'bg-pink-100   text-pink-700'    },
}

const PRIORITY_CONFIG = {
  P0: { label: 'P0 · Critico',  cls: 'bg-red-100   text-red-700   border-red-200'   },
  P1: { label: 'P1 · Alta',     cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  P2: { label: 'P2 · Media',    cls: 'bg-slate-100  text-slate-600  border-slate-200' },
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MilestoneCard({ m }: { m: Milestone }) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!(m.impl || m.subItems?.length)

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      m.status === 'done'    ? 'border-emerald-100 bg-emerald-50/40' :
      m.status === 'partial' ? 'border-amber-100   bg-amber-50/30'   :
                               'border-slate-100   bg-white',
    )}>
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className={cn('w-full flex items-start gap-3 px-4 py-3 text-left', hasDetail && 'hover:bg-black/[0.015] transition-colors')}
      >
        <div className="flex-shrink-0 mt-0.5">
          {m.status === 'done'
            ? <CheckCircle2 size={15} className="text-emerald-500" />
            : m.status === 'partial'
            ? <Clock        size={15} className="text-amber-500" />
            : <Circle       size={15} className="text-slate-300" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={cn('text-[13px] font-medium leading-snug flex-1',
              m.status === 'done' ? 'text-coffee' : 'text-espresso/80'
            )}>
              {m.label}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {m.priority && (
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', PRIORITY_CONFIG[m.priority].cls)}>
                  {PRIORITY_CONFIG[m.priority].label}
                </span>
              )}
              {m.effort && (
                <span className="text-[10px] text-muted/50 bg-slate-100 px-1.5 py-0.5 rounded">
                  {m.effort}
                </span>
              )}
            </div>
          </div>
          {m.note && (
            <span className="text-[11px] text-amber-600/80 italic mt-0.5 block">{m.note}</span>
          )}
        </div>

        {hasDetail && (
          <div className="flex-shrink-0 mt-0.5 text-muted/30">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        )}
      </button>

      {open && hasDetail && (
        <div className="px-4 pb-4 pt-0 ml-7 space-y-3">
          {m.impl && (
            <div className="bg-white border border-slate-100 rounded-lg px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted/50 mb-1.5 flex items-center gap-1.5">
                <FileCode2 size={10} /> Implementazione
              </p>
              <p className="text-[12px] text-coffee leading-[1.7]">{m.impl}</p>
            </div>
          )}
          {m.subItems && m.subItems.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted/50 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={10} /> Sotto-task
              </p>
              <div className="space-y-1">
                {m.subItems.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-muted leading-snug">
                    <span className="text-muted/30 mt-0.5 flex-shrink-0">→</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PhaseCard({ phase, defaultOpen }: { phase: Phase; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const cfg   = STATUS_CONFIG[phase.status]
  const Icon  = phase.icon

  const doneMilestones  = phase.milestones.filter(m => m.status === 'done').length
  const totalMilestones = phase.milestones.length

  return (
    <div className={cn('border rounded-2xl overflow-hidden', cfg.border)}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-start gap-4 p-5 text-left hover:bg-black/[0.015] transition-colors', cfg.bg)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm"
          style={{ background: phase.color }}
        >
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">{phase.phase}</span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
            <span className="text-[10px] text-muted/40 ml-auto hidden sm:block">{phase.period}</span>
          </div>
          <h3 className="font-serif font-bold text-espresso text-[17px] leading-tight">{phase.title}</h3>
          <p className="text-[12px] text-muted mt-0.5 mb-3">{phase.subtitle}</p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-black/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${phase.progress}%`, background: phase.color }}
              />
            </div>
            <span className="text-[11px] font-semibold text-muted/50 flex-shrink-0">
              {phase.status === 'done'    ? `${totalMilestones}/${totalMilestones}` :
               phase.status === 'active'  ? `${doneMilestones}/${totalMilestones}` : '—'}
            </span>
            {open ? <ChevronUp size={14} className="text-muted/40" /> : <ChevronDown size={14} className="text-muted/40" />}
          </div>
        </div>
      </button>

      {open && (
        <div className={cn('border-t border-black/5', cfg.bg)}>
          {/* Obiettivo fase */}
          <div className="px-5 py-4 border-b border-black/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted/40 mb-1 flex items-center gap-1.5">
              <Target size={10} /> Obiettivo
            </p>
            <p className="text-[13px] text-coffee leading-relaxed italic">"{phase.objective}"</p>
          </div>

          {/* Milestones */}
          <div className="p-4 space-y-2">
            {phase.milestones.map((m, i) => (
              <MilestoneCard key={i} m={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RoadmapSection() {
  const allMilestones  = PHASES.flatMap(p => p.milestones)
  const doneMilestones = allMilestones.filter(m => m.status === 'done').length
  const totalMilestones = allMilestones.length
  const overallProgress = Math.round((doneMilestones / totalMilestones) * 100)

  const p0count = PHASES.flatMap(p => p.milestones).filter(m => m.priority === 'P0' && m.status === 'pending').length
  const p1count = PHASES.flatMap(p => p.milestones).filter(m => m.priority === 'P1' && m.status === 'pending').length

  return (
    <div className="space-y-5">

      {/* ── Header globale ─────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted/50 mb-1">Vintagery · Product</p>
            <h2 className="font-serif font-bold text-espresso text-[22px] leading-tight">Roadmap di prodotto</h2>
            <p className="text-[13px] text-muted mt-1">Dal lancio alla piattaforma europea del vintage · 6 fasi · {totalMilestones} obiettivi</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-muted/40 uppercase tracking-[0.15em]">Avanzamento totale</p>
            <p className="text-[36px] font-black text-espresso leading-none mt-0.5">
              {overallProgress}<span className="text-[18px] text-muted/40">%</span>
            </p>
            <p className="text-[11px] text-muted/50">{doneMilestones} / {totalMilestones} obiettivi</p>
          </div>
        </div>

        {/* Timeline master */}
        <div className="mb-5">
          <div className="flex justify-between text-[10px] font-bold mb-2">
            <span className="text-muted/40">Dic 2025 · Lancio</span>
            <span className="text-sienna">← Oggi · Giu 2026 →</span>
            <span className="text-muted/40">2028 · Europa</span>
          </div>
          <div className="h-3 bg-espresso/6 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full"
              style={{
                width: `${overallProgress}%`,
                background: 'linear-gradient(90deg, #4a7c59 0%, #4a7c59 45%, #c9a84c 70%, #c9a84c 100%)',
              }}
            />
            <div className="absolute top-0 bottom-0 w-px bg-sienna/60" style={{ left: `${overallProgress}%` }} />
          </div>
          {/* Fase markers */}
          <div className="flex mt-2">
            {PHASES.map(p => (
              <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-full border-2 border-white shadow"
                  style={{ background: p.status === 'done' ? p.color : p.status === 'active' ? p.color : '#e2d8cc' }}
                />
                <span className="text-[8px] text-muted/40 hidden md:block text-center leading-tight px-0.5">{p.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50">
          {[
            { icon: CheckCircle2, label: 'Fasi completate',  value: `${PHASES.filter(p => p.status === 'done').length} / ${PHASES.length}`,   color: 'text-emerald-600' },
            { icon: Zap,          label: 'Critico (P0)',     value: `${p0count} pendenti`,                                                      color: 'text-red-500' },
            { icon: Flag,         label: 'Alta prio (P1)',   value: `${p1count} pendenti`,                                                      color: 'text-orange-500' },
            { icon: Euro,         label: 'Target MRR set 26', value: '€500',                                                                   color: 'text-gold' },
          ].map(k => {
            const K = k.icon
            return (
              <div key={k.label} className="flex items-center gap-2.5 bg-cream/50 rounded-xl px-3 py-2.5">
                <K size={14} className={k.color} />
                <div>
                  <p className="text-[10px] text-muted/50 leading-none mb-0.5">{k.label}</p>
                  <p className="font-bold text-espresso text-[14px] leading-none">{k.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Phase cards ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {PHASES.map(phase => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            defaultOpen={phase.status === 'active' || phase.status === 'done'}
          />
        ))}
      </div>

      <p className="text-center text-[11px] text-muted/35 pb-2">
        Roadmap aggiornata al {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · ogni milestone è espandibile con dettagli implementativi
      </p>
    </div>
  )
}
