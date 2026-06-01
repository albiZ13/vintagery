import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Vintagery', robots: { index: false } }

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/home')

  const [
    { count: usersCount },
    { count: marketsCount },
    { count: shopsCount },
    { count: shopspending },
    { count: proposalsPending },
    { data: recentShops },
    { data: recentMarkets },
    { data: recentUsers },
    { data: recentProposals },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('markets').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('market_proposals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('shops')
      .select('id, name, city, region, created_at, is_verified, vat_status, vat_number')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('markets')
      .select('id, name, city, region, next_date, is_verified, is_featured, categories')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('profiles')
      .select('id, username, first_name, last_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('market_proposals')
      .select('id, name, city, region, event_type, schedule, website, instagram, description, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <AdminClient
      stats={{ usersCount, marketsCount, shopsCount, shopspending, proposalsPending }}
      recentShops={recentShops ?? []}
      recentMarkets={recentMarkets ?? []}
      recentUsers={recentUsers ?? []}
      recentProposals={recentProposals ?? []}
    />
  )
}
