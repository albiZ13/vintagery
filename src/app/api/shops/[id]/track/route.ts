import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { event } = await req.json().catch(() => ({}))
  if (!['view', 'map_click'].includes(event)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }

  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.rpc('increment_shop_analytics', {
    p_shop_id:    params.id,
    p_event_type: event,
    p_date:       today,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
