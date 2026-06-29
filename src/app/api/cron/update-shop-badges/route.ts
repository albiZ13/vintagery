import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Reset all badges
  await supabase.from('shops').update({ badge: null }).neq('id', '00000000-0000-0000-0000-000000000000')

  // Newcomer: added in the last 30 days, max 3
  const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)
  const { data: newcomers } = await supabase
    .from('shops')
    .select('id')
    .gte('created_at', cutoff30.toISOString())
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(3)

  // Top rated: highest avg_rating with at least 2 reviews, max 3
  const { data: topRated } = await supabase
    .from('shops')
    .select('id')
    .eq('is_verified', true)
    .gte('review_count', 2)
    .order('avg_rating', { ascending: false })
    .limit(3)

  // Most active: most user_posts in the last 30 days, max 3
  // Join via shops owner_id → profiles → user_posts
  const { data: activePosts } = await supabase
    .from('user_posts')
    .select('user_id, count:user_id.count()')
    .gte('created_at', cutoff30.toISOString())
    .limit(100)

  let mostActiveIds: string[] = []
  if (activePosts && activePosts.length > 0) {
    const userIdCounts: Record<string, number> = {}
    for (const row of activePosts as unknown as { user_id: string; count: string }[]) {
      userIdCounts[row.user_id] = parseInt(row.count, 10)
    }
    const topUserIds = Object.entries(userIdCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id)

    const { data: activeShops } = await supabase
      .from('shops')
      .select('id')
      .in('owner_id', topUserIds)
      .eq('is_verified', true)
      .limit(3)

    mostActiveIds = (activeShops ?? []).map(s => s.id)
  }

  const newcomerIds  = (newcomers ?? []).map(s => s.id)
  const topRatedIds  = (topRated ?? []).map(s => s.id)

  const updates: { id: string; badge: string }[] = []

  for (const id of newcomerIds)  updates.push({ id, badge: 'newcomer' })
  for (const id of topRatedIds)  { if (!updates.find(u => u.id === id)) updates.push({ id, badge: 'top_rated' }) }
  for (const id of mostActiveIds){ if (!updates.find(u => u.id === id)) updates.push({ id, badge: 'most_active' }) }

  for (const { id, badge } of updates) {
    await supabase.from('shops').update({ badge }).eq('id', id)
  }

  return NextResponse.json({ newcomer: newcomerIds.length, top_rated: topRatedIds.length, most_active: mostActiveIds.length })
}
