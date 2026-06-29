import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function moderateWithClaude(imageUrl: string): Promise<{ approved: boolean; reason?: string }> {
  if (!ANTHROPIC_API_KEY) {
    // No key → accept all (log for manual review)
    console.warn('[moderation] No ANTHROPIC_API_KEY — image accepted without AI check:', imageUrl)
    return { approved: true }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            {
              type: 'text',
              text: 'Valuta se questa immagine è appropriata per una recensione di un mercatino vintage/antiquariato. Rispondi SOLO con "APPROVED" o "REJECTED: [motivo breve in italiano]". Rifiuta se: contenuto esplicito, violenza, documenti personali visibili, testo offensivo, immagini non correlate a mercati/oggetti/persone in contesti pubblici.',
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error('[moderation] Anthropic API error:', res.status)
      return { approved: true } // fail open
    }

    const data = await res.json()
    const text = (data.content?.[0]?.text ?? '').trim()

    if (text.startsWith('REJECTED')) {
      const reason = text.replace('REJECTED:', '').trim()
      return { approved: false, reason }
    }
    return { approved: true }
  } catch (err) {
    console.error('[moderation] Error calling Anthropic:', err)
    return { approved: true } // fail open
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { imageUrl } = await req.json()
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'imageUrl mancante' }, { status: 400 })
  }

  // Verify the URL belongs to our Supabase project
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!imageUrl.startsWith(supabaseUrl)) {
    return NextResponse.json({ error: 'URL non valido' }, { status: 400 })
  }

  const result = await moderateWithClaude(imageUrl)
  return NextResponse.json(result)
}
