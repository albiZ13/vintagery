import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function assertAdmin() {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const { data: p } = await auth.from('profiles').select('role').eq('id', user.id).single()
  return p?.role === 'admin' ? user : null
}

export async function GET() {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const now        = new Date()
  const minus30min = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const minus7d    = new Date(now.getTime() -  7 * 24 * 3600 * 1000).toISOString()
  const minus24h   = new Date(now.getTime() -      24 * 3600 * 1000).toISOString()
  const minus30d   = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()

  const [
    { count: views30min },
    { count: viewsToday },
    { count: views7d },
    { count: views30d },
    { data: recentRaw },
    { data: marketViewsRaw },
    { data: pageViewsRaw },
    { data: sessionDurationRaw },
    { data: dailyRaw },
    { data: sessionsRaw },
  ] = await Promise.all([
    svc.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', minus30min),
    svc.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    svc.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', minus7d),
    svc.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', minus30d),

    svc.from('page_views')
      .select('id,path,market_id,shop_id,session_id,created_at')
      .order('created_at', { ascending: false })
      .limit(50),

    svc.from('page_views')
      .select('market_id, markets(name,city)')
      .gte('created_at', minus24h)
      .not('market_id', 'is', null),

    svc.from('page_views')
      .select('path')
      .gte('created_at', minus24h),

    // Average duration (only rows with non-null duration)
    svc.from('page_views')
      .select('duration_sec')
      .gte('created_at', minus7d)
      .not('duration_sec', 'is', null)
      .lt('duration_sec', 600), // exclude outliers >10min

    // Visite giornaliere ultimi 30 giorni
    svc.from('page_views')
      .select('created_at')
      .gte('created_at', minus30d)
      .order('created_at'),

    // Sessioni uniche nelle ultime 24h (per bounce rate)
    svc.from('page_views')
      .select('session_id')
      .gte('created_at', minus24h)
      .not('session_id', 'is', null),
  ])

  // ── Tempo medio visita ─────────────────────────────────────────────
  const durations = (sessionDurationRaw ?? []).map(r => r.duration_sec as number)
  const avgDurationSec = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  // ── Sessioni uniche 24h ────────────────────────────────────────────
  const uniqueSessions24h = new Set((sessionsRaw ?? []).map(r => r.session_id)).size

  // ── Bounce rate: sessioni con 1 sola pagina ────────────────────────
  const sessionPageCount: Record<string, number> = {}
  for (const r of sessionsRaw ?? []) {
    const s = r.session_id as string
    sessionPageCount[s] = (sessionPageCount[s] ?? 0) + 1
  }
  const singlePage = Object.values(sessionPageCount).filter(c => c === 1).length
  const bounceRate = uniqueSessions24h > 0
    ? Math.round((singlePage / uniqueSessions24h) * 100)
    : null

  // ── Top mercatini ──────────────────────────────────────────────────
  const marketCount: Record<string, { name: string; city: string; count: number }> = {}
  for (const row of marketViewsRaw ?? []) {
    if (!row.market_id) continue
    const id = row.market_id as string
    const m  = (row as any).markets as { name: string; city: string } | null
    if (!marketCount[id]) marketCount[id] = { name: m?.name ?? id, city: m?.city ?? '', count: 0 }
    marketCount[id].count++
  }
  const topMarketsToday = Object.entries(marketCount)
    .map(([market_id, v]) => ({ market_id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Top pagine ─────────────────────────────────────────────────────
  const pageCount: Record<string, number> = {}
  for (const row of pageViewsRaw ?? []) {
    const p = row.path ?? '/'
    pageCount[p] = (pageCount[p] ?? 0) + 1
  }
  const topPagesToday = Object.entries(pageCount)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Visite giornaliere 30gg ────────────────────────────────────────
  const dayMap: Record<string, number> = {}
  for (const row of dailyRaw ?? []) {
    const day = (row.created_at as string).slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const dailyViews = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      visite: count,
    }))

  // ── Market name lookup per recent views ───────────────────────────
  const marketNameById: Record<string, { name: string; city: string }> = {}
  for (const row of marketViewsRaw ?? []) {
    if (row.market_id && (row as any).markets) {
      marketNameById[row.market_id as string] = (row as any).markets
    }
  }

  const recentViews = (recentRaw ?? []).map(r => ({
    id:          r.id as number,
    path:        r.path as string,
    market_id:   r.market_id as string | null,
    market_name: r.market_id ? (marketNameById[r.market_id as string]?.name ?? null) : null,
    session_id:  r.session_id as string | null,
    created_at:  r.created_at as string,
  }))

  return NextResponse.json({
    views_30min:       views30min       ?? 0,
    views_today:       viewsToday       ?? 0,
    views_7d:          views7d          ?? 0,
    views_30d:         views30d         ?? 0,
    avg_duration_sec:  avgDurationSec,
    unique_sessions_24h: uniqueSessions24h,
    bounce_rate:       bounceRate,
    top_markets_today: topMarketsToday,
    top_pages_today:   topPagesToday,
    recent_views:      recentViews,
    daily_views:       dailyViews,
  })
}
