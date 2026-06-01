import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimit, getIp } from '@/lib/rate-limit'

const ITALIAN_REGIONS = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto',
]

const MONTHS_IT = [
  'gennaio','febbraio','marzo','aprile','maggio','giugno',
  'luglio','agosto','settembre','ottobre','novembre','dicembre',
]

export async function POST(req: NextRequest) {
  // 3 richieste per ora per IP (chiamate costose a Claude)
  if (!rateLimit(getIp(req) + ':sync-events', 3, 60 * 60_000)) {
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra un\'ora.' },
      { status: 429 }
    )
  }

  // Autenticazione: CRON_SECRET (cron job) oppure utente admin autenticato
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron     = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    // Fallback: verifica che l'utente sia admin
    const routeClient = createRouteHandlerClient({ cookies })
    const { data: { user } } = await routeClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await routeClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json().catch(() => ({}))
  const now  = new Date()
  const month  = body.month  ?? now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2
  const year   = body.year   ?? now.getFullYear()
  const regions: string[] = body.regions ?? ITALIAN_REGIONS

  const anthropic = new Anthropic({ apiKey })
  const monthLabel = MONTHS_IT[month - 1]

  let inserted = 0
  const errors: string[] = []

  for (const region of regions) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Genera un array JSON di eventi vintage/antiquariato/collezionismo in ${region}, Italia per ${monthLabel} ${year}.

Includi TUTTE queste tipologie se presenti nella regione:
- mercatino: mercati delle pulci, mercatini dell'usato
- antiquariato: fiere antiquariali, mostra mercato antiquaria
- vinokilo: eventi kilo vintage (Vinokilo, Similar Events)
- svuotacantina: svendite private, svuotacantine collettive
- svendita: svendite di fine stagione, liquidazioni
- memorabilia: eventi memorabilia cinema/sport/TV
- collezionismo: numismatica, filatelia, cartofilia, modellismo
- fumetti: fiere del fumetto, mostra mercato comics
- vinili: mercati del vinile, record fair

Ritorna SOLO l'array JSON (nessun markdown, nessun testo prima o dopo), con questa struttura esatta:
[{
  "name": "Nome evento",
  "description": "Descrizione 2-3 frasi dettagliata e specifica",
  "event_type": "mercatino|antiquariato|vinokilo|svuotacantina|svendita|memorabilia|collezionismo|fumetti|vinili",
  "city": "Città",
  "address": "Via/Piazza specifica o null",
  "lat": numero o null,
  "lng": numero o null,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD o null",
  "start_time": "HH:MM o null",
  "end_time": "HH:MM o null",
  "website": "URL o null",
  "instagram": "@handle o null",
  "price_info": "Testo prezzo o null",
  "organizer": "Nome organizzatore o null",
  "source_url": "URL fonte o null",
  "is_verified": false,
  "is_featured": false,
  "is_recurring": true/false,
  "categories": ["Abbigliamento", "Vinili", ecc.],
  "tags": ["tag1", "tag2"]
}]

Regole:
- Solo eventi REALI e verificabili, no invenzioni
- Per eventi ricorrenti usa la data corretta per ${monthLabel} ${year}
- Minimo 3, massimo 10 eventi
- Se non hai informazioni sufficienti per un evento, omettilo
- Usa date realistiche (domeniche per mercatini, weekend per fiere)`
        }],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
      const jsonStart = text.indexOf('[')
      const jsonEnd   = text.lastIndexOf(']')
      if (jsonStart === -1 || jsonEnd === -1) continue

      const events = JSON.parse(text.slice(jsonStart, jsonEnd + 1))

      for (const ev of events) {
        if (!ev.name || !ev.city || !ev.start_date) continue
        const dedupKey = `${ev.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()}|${ev.start_date}|${ev.city.toLowerCase().trim()}`
        const { error } = await supabase.from('market_events').upsert({
          name:         ev.name,
          description:  ev.description ?? null,
          event_type:   ev.event_type ?? 'mercatino',
          city:         ev.city,
          region,
          address:      ev.address ?? null,
          lat:          ev.lat ?? null,
          lng:          ev.lng ?? null,
          start_date:   ev.start_date,
          end_date:     ev.end_date ?? null,
          start_time:   ev.start_time ?? null,
          end_time:     ev.end_time ?? null,
          website:      ev.website ?? null,
          instagram:    ev.instagram ?? null,
          price_info:   ev.price_info ?? null,
          organizer:    ev.organizer ?? null,
          source_url:   ev.source_url ?? null,
          source:       'anthropic-sync',
          is_verified:  false,
          is_featured:  false,
          is_recurring: ev.is_recurring ?? false,
          categories:   ev.categories ?? null,
          tags:         ev.tags ?? null,
          month,
          year,
          dedup_key:    dedupKey,
        }, { onConflict: 'dedup_key', ignoreDuplicates: true })

        if (!error) inserted++
      }
    } catch (err: unknown) {
      // Non esponiamo dettagli interni all'esterno — solo contatore
      errors.push(region)
      console.error(`sync-events error [${region}]:`, err)
    }
  }

  // Trigger Python scraper opzionale
  let scraperResult: Record<string, unknown> = {}
  const scraperUrl = process.env.SCRAPER_URL
  if (scraperUrl) {
    try {
      const res = await fetch(`${scraperUrl}/scrape?month=${month}&year=${year}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        signal: AbortSignal.timeout(120_000),
      })
      if (res.ok) scraperResult = await res.json()
    } catch {
      // scraper opzionale
    }
  }

  return NextResponse.json({
    success: true,
    inserted,
    failed_regions: errors.length,
    month,
    year,
    scraper: scraperResult,
  })
}

// GET: trigger da cron esterno — usa Authorization header invece di query param
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(req)
}
