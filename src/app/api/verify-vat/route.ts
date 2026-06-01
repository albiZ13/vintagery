import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // 10 richieste per minuto per IP
  if (!rateLimit(getIp(req) + ':verify-vat', 10, 60_000)) {
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra un minuto.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('vatNumber' in body)) {
    return NextResponse.json({ error: 'Partita IVA mancante' }, { status: 400 })
  }

  const raw = (body as Record<string, unknown>).vatNumber
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'Formato non valido' }, { status: 400 })
  }

  // Normalizza: rimuovi IT prefix, spazi, caratteri non numerici
  const cleaned = raw.replace(/^IT/i, '').replace(/\D/g, '').slice(0, 11)

  if (!/^\d{11}$/.test(cleaned)) {
    return NextResponse.json({
      valid: false,
      error: 'Formato non valido. La P.IVA italiana è composta da 11 cifre.',
    })
  }

  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${cleaned}`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } }
    )

    if (!res.ok) {
      return NextResponse.json({
        valid: null,
        pending: true,
        vatNumber: cleaned,
        error: 'Il servizio VIES è temporaneamente non disponibile. La verifica verrà completata manualmente entro 24h.',
      })
    }

    const data = await res.json()

    if (data.valid) {
      return NextResponse.json({
        valid: true,
        vatNumber: cleaned,
        name:    data.traderName    ?? null,
        address: data.traderAddress ?? null,
      })
    }

    return NextResponse.json({
      valid: false,
      vatNumber: cleaned,
      error: 'Partita IVA non trovata nel registro europeo VIES.',
    })
  } catch {
    return NextResponse.json({
      valid: null,
      pending: true,
      vatNumber: cleaned,
      error: 'Impossibile contattare il servizio VIES. La verifica verrà completata manualmente entro 24h.',
    })
  }
}
