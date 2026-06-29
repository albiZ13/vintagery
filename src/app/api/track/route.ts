import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractContext(path: string): { market_id: string | null; shop_id: string | null } {
  const parts = path.split('/').filter(Boolean)
  // /mercatini/<uuid>  or /mercatini/eventi/<uuid>
  const mktIdx = parts.indexOf('mercatini')
  if (mktIdx !== -1) {
    const next = parts[mktIdx + 1]
    if (next && UUID_RE.test(next)) return { market_id: next, shop_id: null }
    const evtNext = parts[mktIdx + 2]
    if (parts[mktIdx + 1] === 'eventi' && evtNext && UUID_RE.test(evtNext))
      return { market_id: null, shop_id: null } // event page, no market_id
  }
  // /negozi/<uuid>
  const shopIdx = parts.indexOf('negozi')
  if (shopIdx !== -1) {
    const next = parts[shopIdx + 1]
    if (next && UUID_RE.test(next)) return { market_id: null, shop_id: next }
  }
  return { market_id: null, shop_id: null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { path, session_id, duration_sec } = body

    if (!path || typeof path !== 'string') return NextResponse.json({}, { status: 400 })

    const { market_id, shop_id } = extractContext(path)
    const referrer = req.headers.get('referer') ?? null

    await supabase.from('page_views').insert({
      path:         path.slice(0, 500),
      market_id,
      shop_id,
      referrer:     referrer   ? referrer.slice(0, 500) : null,
      session_id:   session_id ?? null,
      duration_sec: typeof duration_sec === 'number' && duration_sec > 0 && duration_sec < 3600
        ? duration_sec : null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({}, { status: 500 })
  }
}
