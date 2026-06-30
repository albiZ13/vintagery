import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import AdminClient from './AdminClient'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Vintagery', robots: { index: false } }

function buildWeeklySeries(rows: { created_at: string }[] | null, key: string) {
  const now = new Date()
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (11 - i) * 7)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay()) // inizio settimana (dom)
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, [key]: 0, ts: d.getTime() }
  })
  rows?.forEach(r => {
    const t = new Date(r.created_at).getTime()
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (t >= weeks[i].ts) { (weeks[i][key] as number)++; break }
    }
  })
  return weeks.map(({ ts, ...rest }) => rest)
}

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  const [
    { count: totalUsers },
    { count: totalShops },
    { count: verifiedShops },
    { count: premiumShops },
    { count: totalMarkets },
    { count: verifiedMarkets },
    { count: totalConversations },
    { count: totalMessages },
    { count: pendingProposals },
    { data: allShopPlans },
    { data: allShopRegions },
    { data: allMarketRegions },
    { data: userGrowthRaw },
    { data: shopGrowthRaw },
    { data: recentShops },
    { data: recentMarkets },
    { data: recentUsers },
    { data: recentProposals },
    { data: topShops },
    { data: recentReviews },
    { data: lastScraperData },
    { count: aiMarketsCount },
    { data: feedbackData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('plan', 'premium'),
    supabase.from('markets').select('*', { count: 'exact', head: true }),
    supabase.from('markets').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('market_proposals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('shops').select('plan'),
    supabase.from('shops').select('region'),
    supabase.from('markets').select('region'),
    supabase.from('profiles').select('created_at').order('created_at'),
    supabase.from('shops').select('created_at').order('created_at'),
    supabase.from('shops')
      .select('id,name,city,region,created_at,is_verified,vat_status,vat_number,plan')
      .order('created_at', { ascending: false }).limit(500),
    supabase.from('markets')
      .select('id,name,city,region,next_date,is_verified,is_featured,categories,frequency')
      .order('created_at', { ascending: false }).limit(500),
    supabase.from('profiles')
      .select('id,username,first_name,last_name,role,created_at')
      .order('created_at', { ascending: false }).limit(500),
    supabase.from('market_proposals')
      .select('id,name,city,region,event_type,schedule,website,instagram,description,email,status,created_at')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('shops')
      .select('id,name,city,plan,avg_rating,review_count,posts_count,visibility_score,is_verified')
      .order('visibility_score', { ascending: false }).limit(10),
    supabase.from('reviews')
      .select('id,user_id,target_type,target_id,rating,title,body,likes_count,comment_count,created_at,profiles(username,first_name),markets(name,city),shops(name,city)')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('market_events')
      .select('created_at').eq('source', 'gemini-ai')
      .order('created_at', { ascending: false }).limit(1),
    supabase.from('market_events')
      .select('*', { count: 'exact', head: true }).eq('source', 'gemini-ai'),
    supabase.from('site_feedback')
      .select('id,user_id,body,status,created_at,profiles(username,first_name,last_name)')
      .order('created_at', { ascending: false }).limit(50),
  ])

  // Piano breakdown
  const planMap: Record<string, number> = {}
  allShopPlans?.forEach(s => { const p = s.plan ?? 'free'; planMap[p] = (planMap[p] ?? 0) + 1 })
  const planBreakdown = Object.entries(planMap).map(([plan, n]) => ({ plan, n }))

  // Regioni negozi
  const shopRegMap: Record<string, number> = {}
  allShopRegions?.forEach(s => { if (s.region) shopRegMap[s.region] = (shopRegMap[s.region] ?? 0) + 1 })
  const shopsByRegion = Object.entries(shopRegMap).sort((a,b) => b[1]-a[1]).map(([region, n]) => ({ region, n }))

  // Regioni mercati
  const mktRegMap: Record<string, number> = {}
  allMarketRegions?.forEach(m => { if (m.region) mktRegMap[m.region] = (mktRegMap[m.region] ?? 0) + 1 })
  const marketsByRegion = Object.entries(mktRegMap).sort((a,b) => b[1]-a[1]).slice(0,10).map(([region, n]) => ({ region, n }))

  // Crescita settimanale
  const userSeries  = buildWeeklySeries(userGrowthRaw,  'utenti')
  const shopSeries  = buildWeeklySeries(shopGrowthRaw,  'negozi')
  const growthSeries = userSeries.map((u, i) => ({
    label:  u.label as string,
    utenti: u.utenti as number,
    negozi: (shopSeries[i]?.negozi as number) ?? 0,
  }))

  // Fetch user emails via service role (auth.users requires admin access)
  const svc = serviceClient()
  const emailMap: Record<string, string> = {}
  const { data: authUsersData } = await svc.auth.admin.listUsers({ perPage: 1000 })
  for (const au of authUsersData?.users ?? []) {
    if (au.email) emailMap[au.id] = au.email
  }

  const n = premiumShops ?? 0
  const mrr = n * 14
  const arr = mrr * 12

  const lastScraperRun = lastScraperData?.[0]?.created_at ?? null

  return (
    <AdminClient
      emailMap={emailMap}
      lastScraperRun={lastScraperRun}
      aiMarketsCount={aiMarketsCount ?? 0}
      stats={{
        totalUsers:         totalUsers         ?? 0,
        totalShops:         totalShops         ?? 0,
        verifiedShops:      verifiedShops      ?? 0,
        premiumShops:       n,
        totalMarkets:       totalMarkets       ?? 0,
        verifiedMarkets:    verifiedMarkets    ?? 0,
        totalConversations: totalConversations ?? 0,
        totalMessages:      totalMessages      ?? 0,
        pendingProposals:   pendingProposals   ?? 0,
        mrr,
        arr,
      }}
      planBreakdown={planBreakdown}
      shopsByRegion={shopsByRegion}
      marketsByRegion={marketsByRegion}
      growthSeries={growthSeries}
      recentShops={recentShops    ?? []}
      recentMarkets={recentMarkets ?? []}
      recentUsers={recentUsers    ?? []}
      recentProposals={recentProposals ?? []}
      recentReviews={(recentReviews ?? []) as any}
      topShops={topShops          ?? []}
      feedbacks={(feedbackData ?? []) as any}
    />
  )
}
