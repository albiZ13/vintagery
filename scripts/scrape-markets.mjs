/**
 * Vintagerie — Scraper mercatini italiani
 *
 * Raccoglie mercatini da fonti pubbliche italiane e li inserisce
 * nel database Supabase. Da eseguire manualmente o con un cron settimanale.
 *
 * Uso:
 *   node scripts/scrape-markets.mjs
 *
 * Richiede variabili nel .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← usa la secret key qui (solo server-side)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Carica .env.local
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] ?? env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
)

// ──────────────────────────────────────────────────────────────
// DATASET CURATO — mercatini italiani verificati
// Aggiunto manualmente dai fondatori (fase 1)
// In futuro: scraping automatico da fonti come:
//   - eventbrite.it (cerca "mercatino vintage")
//   - facebook.com/events (API Graph)
//   - antiquariato.it
//   - comune.it (agenda eventi)
// ──────────────────────────────────────────────────────────────

const MARKETS = [
  // ── LOMBARDIA ────────────────────────────────────────────
  {
    name: 'Vintage Market Milano — Edizione Estate',
    description: 'Il grande mercato vintage milanese torna in Zona Tortona con oltre 200 espositori selezionati.',
    city: 'Milano', region: 'Lombardia',
    address: 'Via Tortona 54, Zona Tortona',
    lat: 45.4522, lng: 9.1713,
    website: 'https://www.vintagemarketitalia.it',
    instagram: '@vintagemarketmilano',
    frequency: 'mensile',
    schedule_notes: 'Primo weekend del mese, sab e dom 10:00–20:00',
    next_date: getNextOccurrence('first', 'saturday'),
    categories: ['Abbigliamento','Accessori','Scarpe','Borse'],
    is_verified: true, is_featured: true,
  },
  {
    name: 'Mercatino Antiquariato Navigli',
    description: 'Ogni ultima domenica del mese lungo l\'Alzaia Naviglio Grande: antiquariato, vintage e oggetti da collezione.',
    city: 'Milano', region: 'Lombardia',
    address: 'Alzaia Naviglio Grande',
    lat: 45.4558, lng: 9.1734,
    instagram: '@navigligrandi',
    frequency: 'mensile',
    schedule_notes: 'Ultima domenica del mese, 8:30–18:00',
    next_date: getNextOccurrence('last', 'sunday'),
    categories: ['Mobili','Gioielli','Vinili','Arte'],
    is_verified: true, is_featured: false,
  },
  {
    name: 'Fiera di Senigallia',
    description: 'Il mercatino delle pulci storico di Milano, ogni sabato mattina ai Darsena.',
    city: 'Milano', region: 'Lombardia',
    address: 'Via Calatafimi / Darsena',
    lat: 45.4558, lng: 9.1776,
    frequency: 'settimanale',
    schedule_notes: 'Ogni sabato, 8:00–17:00',
    next_date: getNextWeekday(6),
    categories: ['Libri','Arte','Giocattoli','Fotografia'],
    is_verified: true, is_featured: false,
  },

  // ── LAZIO ────────────────────────────────────────────────
  {
    name: 'Porta Portese',
    description: 'Il mercato delle pulci più famoso d\'Italia. Ogni domenica a Trastevere: abbigliamento, vinili, mobili, antiquariato.',
    city: 'Roma', region: 'Lazio',
    address: 'Via Portuense, Trastevere',
    lat: 41.8803, lng: 12.4726,
    frequency: 'settimanale',
    schedule_notes: 'Ogni domenica, 6:00–14:00',
    next_date: getNextWeekday(0),
    categories: ['Abbigliamento','Vinili','Libri','Mobili','Gioielli'],
    is_verified: true, is_featured: true,
  },
  {
    name: 'Mercato di Via Sannio',
    description: 'Mercato storico fuori Porta San Giovanni. Famoso per giacche militari, jeans vintage e capi anni 70–80.',
    city: 'Roma', region: 'Lazio',
    address: 'Via Sannio, San Giovanni',
    lat: 41.8823, lng: 12.5144,
    frequency: 'settimanale',
    schedule_notes: 'Lun–Sab, 8:00–14:00',
    next_date: getNextWeekday(1),
    categories: ['Abbigliamento','Accessori'],
    is_verified: true, is_featured: false,
  },

  // ── TOSCANA ──────────────────────────────────────────────
  {
    name: 'Fiera Antiquaria di Arezzo',
    description: 'Una delle più importanti fiere di antiquariato d\'Europa. Ogni primo weekend del mese nel centro storico.',
    city: 'Arezzo', region: 'Toscana',
    address: 'Piazza Grande e centro storico',
    lat: 43.4656, lng: 11.8797,
    website: 'https://www.fierantiquaria.it',
    instagram: '@fierantiquaria',
    frequency: 'mensile',
    schedule_notes: 'Primo sabato e domenica del mese',
    next_date: getNextOccurrence('first', 'saturday'),
    categories: ['Mobili','Arte','Ceramiche','Gioielli'],
    is_verified: true, is_featured: true,
  },

  // ── PIEMONTE ─────────────────────────────────────────────
  {
    name: 'Gran Balon di Torino',
    description: 'Il mercato delle pulci storico di Torino, nel Borgo Dora. Ogni seconda domenica del mese.',
    city: 'Torino', region: 'Piemonte',
    address: 'Borgo Dora, Via Lanino',
    lat: 45.0844, lng: 7.6883,
    website: 'https://www.balon.it',
    instagram: '@balonitorino',
    frequency: 'mensile',
    schedule_notes: 'Seconda domenica del mese, 8:00–18:30',
    next_date: getNextOccurrence('second', 'sunday'),
    categories: ['Mobili','Oggetti da cucina','Gioielli','Vinili'],
    is_verified: true, is_featured: true,
  },

  // ── EMILIA-ROMAGNA ───────────────────────────────────────
  {
    name: 'Mercato Antiquariato Bologna',
    description: 'Ogni secondo fine settimana del mese in Piazza Santo Stefano. Vintage, antiquariato, libri.',
    city: 'Bologna', region: 'Emilia-Romagna',
    address: 'Piazza Santo Stefano',
    lat: 44.4949, lng: 11.3426,
    frequency: 'mensile',
    schedule_notes: 'Secondo weekend del mese',
    next_date: getNextOccurrence('second', 'saturday'),
    categories: ['Libri','Arte','Ceramiche','Vinili'],
    is_verified: false, is_featured: false,
  },

  // ── CAMPANIA ─────────────────────────────────────────────
  {
    name: 'Resina / Ercolano Vintage',
    description: 'Il villaggio del vintage napoletano. Ercolano è rinomata in tutta Italia per i suoi negozi di seconda mano.',
    city: 'Ercolano', region: 'Campania',
    address: 'Corso Resina, Ercolano',
    lat: 40.8044, lng: 14.3467,
    frequency: 'settimanale',
    schedule_notes: 'Ogni giorno tranne domenica',
    next_date: getNextWeekday(1),
    categories: ['Abbigliamento','Borse','Scarpe','Accessori'],
    is_verified: true, is_featured: true,
  },

  // ── SICILIA ──────────────────────────────────────────────
  {
    name: 'Mercato di Ballarò',
    description: 'Mercato storico di Palermo. Tra le bancarelle si trovano ceramiche, oggetti artigianali e pezzi d\'antiquariato.',
    city: 'Palermo', region: 'Sicilia',
    address: 'Piazza del Carmine, Albergheria',
    lat: 38.1122, lng: 13.3571,
    frequency: 'settimanale',
    schedule_notes: 'Lun–Sab, tutto il giorno',
    next_date: getNextWeekday(1),
    categories: ['Ceramiche','Arte','Oggetti da cucina'],
    is_verified: false, is_featured: false,
  },
]

// ── Helpers ────────────────────────────────────────────────────

function getNextWeekday(day) {
  // day: 0=domenica, 1=lunedì, ..., 6=sabato
  const now = new Date()
  const diff = (day - now.getDay() + 7) % 7 || 7
  const d = new Date(now)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function getNextOccurrence(which, dayName) {
  const days = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 }
  const targetDay = days[dayName]
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Find all occurrences in current month
  const occurrences = []
  const d = new Date(firstOfMonth)
  while (d.getMonth() === firstOfMonth.getMonth()) {
    if (d.getDay() === targetDay) occurrences.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }

  let chosen
  if (which === 'first')  chosen = occurrences[0]
  if (which === 'second') chosen = occurrences[1]
  if (which === 'third')  chosen = occurrences[2]
  if (which === 'last')   chosen = occurrences[occurrences.length - 1]

  // If the date has passed, move to next month
  if (chosen && chosen < now) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextOccurrences = []
    const nd = new Date(nextMonth)
    while (nd.getMonth() === nextMonth.getMonth()) {
      if (nd.getDay() === targetDay) nextOccurrences.push(new Date(nd))
      nd.setDate(nd.getDate() + 1)
    }
    if (which === 'first')  chosen = nextOccurrences[0]
    if (which === 'second') chosen = nextOccurrences[1]
    if (which === 'third')  chosen = nextOccurrences[2]
    if (which === 'last')   chosen = nextOccurrences[nextOccurrences.length - 1]
  }

  return chosen?.toISOString().split('T')[0] ?? null
}

// ── Main ───────────────────────────────────────────────────────

async function run() {
  console.log(`Vintagerie Scraper — inserimento ${MARKETS.length} mercatini\n`)

  let inserted = 0, skipped = 0

  for (const market of MARKETS) {
    // Controlla se esiste già (per nome + città)
    const { data: existing } = await supabase
      .from('markets')
      .select('id')
      .eq('name', market.name)
      .eq('city', market.city)
      .single()

    if (existing) {
      // Aggiorna la next_date
      await supabase.from('markets').update({ next_date: market.next_date }).eq('id', existing.id)
      console.log(`  AGGIORNATO  ${market.name} (${market.city})`)
      skipped++
    } else {
      const { error } = await supabase.from('markets').insert(market)
      if (error) {
        console.error(`  ERRORE      ${market.name}:`, error.message)
      } else {
        console.log(`  INSERITO    ${market.name} (${market.city})`)
        inserted++
      }
    }
  }

  console.log(`\nDone: ${inserted} nuovi, ${skipped} aggiornati`)
}

run().catch(console.error)
