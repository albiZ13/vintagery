'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Store, MapPin, ShieldCheck, Star, TrendingUp,
  CheckCircle, XCircle, Eye, Loader2, Ban, MessageSquarePlus,
  Euro, BarChart2, ArrowUpRight, AlertTriangle, Activity, Search,
  Trash2, Crown, Bell, Send, ChevronDown, Bot, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number; totalShops: number; verifiedShops: number; premiumShops: number
  totalMarkets: number; verifiedMarkets: number
  totalConversations: number; totalMessages: number
  pendingProposals: number; mrr: number; arr: number
}
interface Shop {
  id: string; name: string; city: string; region: string
  created_at: string; is_verified: boolean; vat_status: string; vat_number: string; plan: string
}
interface Market {
  id: string; name: string; city: string; region: string
  next_date: string | null; is_verified: boolean; is_featured: boolean
  categories: string[]; frequency: string | null
}
interface UserRow {
  id: string; username: string | null; first_name: string | null; last_name: string | null
  role: string; created_at: string
}
interface Proposal {
  id: string; name: string; city: string; region: string; event_type: string
  schedule: string | null; website: string | null; instagram: string | null
  description: string | null; email: string | null; status: string; created_at: string
}
interface TopShop {
  id: string; name: string; city: string; plan: string
  avg_rating: number | null; review_count: number | null
  posts_count: number | null; visibility_score: number | null; is_verified: boolean
}
interface Review {
  id: string; user_id: string; target_type: string; target_id: string
  rating: number; title: string | null; body: string | null
  likes_count: number; comment_count: number; created_at: string
  profiles: { username: string | null; first_name: string | null } | null
  markets: { name: string; city: string } | null
  shops: { name: string; city: string } | null
}

type Tab = 'overview' | 'revenue' | 'growth' | 'shops' | 'markets' | 'proposals' | 'reviews' | 'users' | 'notifications'

const PLAN_COLORS: Record<string, string> = { premium: '#c9a84c', free: '#b8afa8', pro: '#4a7c59' }
const CHART_COLORS = { utenti: '#1c2e4a', negozi: '#c9a84c' }

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('it-IT') }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('it-IT') }
function fmtEur(n: number) { return `€${n.toLocaleString('it-IT')}` }

function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; trend?: number
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={cn('text-[11px] font-semibold flex items-center gap-0.5',
            trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            <ArrowUpRight size={11} style={{ rotate: trend < 0 ? '90deg' : '0deg' }} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-espresso leading-none">{value}</p>
      <div>
        <p className="text-xs font-medium text-coffee">{label}</p>
        {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AdminClient({
  stats, planBreakdown, shopsByRegion, marketsByRegion,
  growthSeries, recentShops, recentMarkets, recentUsers, recentProposals, recentReviews, topShops,
  emailMap = {}, lastScraperRun = null, aiMarketsCount = 0,
}: {
  stats: Stats
  planBreakdown: { plan: string; n: number }[]
  shopsByRegion: { region: string; n: number }[]
  marketsByRegion: { region: string; n: number }[]
  growthSeries: { label: string; utenti: number; negozi: number }[]
  recentShops: Shop[]
  recentMarkets: Market[]
  recentUsers: UserRow[]
  recentProposals: Proposal[]
  recentReviews: Review[]
  topShops: TopShop[]
  emailMap?: Record<string, string>
  lastScraperRun?: string | null
  aiMarketsCount?: number
}) {
  const [tab, setTab]             = useState<Tab>('overview')
  const [shops, setShops]         = useState<Shop[]>(recentShops)
  const [markets, setMarkets]     = useState<Market[]>(recentMarkets)
  const [users, setUsers]         = useState<UserRow[]>(recentUsers)
  const [proposals, setProposals] = useState<Proposal[]>(recentProposals)
  const [reviews, setReviews]     = useState<Review[]>(recentReviews)
  const [loading, setLoading]     = useState<string | null>(null)

  // Filters
  const [shopFilter, setShopFilter]     = useState<'all' | 'pending' | 'premium'>('all')
  const [shopSearch, setShopSearch]     = useState('')
  const [marketSearch, setMarketSearch] = useState('')
  const [userSearch, setUserSearch]     = useState('')

  // Plan dropdown
  const [planDropOpen, setPlanDropOpen] = useState<string | null>(null)

  // Notifications form
  const [notifMode,    setNotifMode]    = useState<'broadcast' | 'user'>('broadcast')
  const [notifTarget,  setNotifTarget]  = useState('')
  const [notifTitle,   setNotifTitle]   = useState('')
  const [notifBody,    setNotifBody]    = useState('')
  const [notifHref,    setNotifHref]    = useState('')
  const [notifSending, setNotifSending] = useState(false)
  const [notifResult,  setNotifResult]  = useState<string | null>(null)

  const sbRef    = useRef(createClient())
  const supabase = sbRef.current

  // ── Actions ──────────────────────────────────────────────────────────────

  async function adminAction(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  const verifyShop = async (id: string, v: boolean) => {
    setLoading(id)
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'shop', id, action: v ? 'approve' : 'reject' }),
    })
    setShops(s => s.map(sh => sh.id === id ? { ...sh, is_verified: v } : sh))
    setLoading(null)
  }

  const changeShopPlan = async (id: string, plan: string) => {
    setLoading(id + '_plan')
    await adminAction({ type: 'shop_plan', id, plan })
    setShops(s => s.map(sh => sh.id === id ? { ...sh, plan } : sh))
    setLoading(null)
    setPlanDropOpen(null)
  }

  const deleteShop = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo negozio?')) return
    setLoading(id + '_del')
    await adminAction({ type: 'delete_shop', id })
    setShops(s => s.filter(sh => sh.id !== id))
    setLoading(null)
  }

  const verifyMarket = async (id: string, v: boolean) => {
    setLoading(id)
    await supabase.from('markets').update({ is_verified: v }).eq('id', id)
    setMarkets(m => m.map(mk => mk.id === id ? { ...mk, is_verified: v } : mk))
    setLoading(null)
  }
  const featureMarket = async (id: string, f: boolean) => {
    setLoading(id + '_f')
    await supabase.from('markets').update({ is_featured: f }).eq('id', id)
    setMarkets(m => m.map(mk => mk.id === id ? { ...mk, is_featured: f } : mk))
    setLoading(null)
  }
  const deleteMarket = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo mercatino?')) return
    setLoading(id + '_del')
    await adminAction({ type: 'delete_market', id })
    setMarkets(m => m.filter(mk => mk.id !== id))
    setLoading(null)
  }

  const banUser = async (id: string, ban: boolean) => {
    setLoading(id + '_b')
    await adminAction({ type: 'ban_user', id, ban })
    setUsers(u => u.map(ur => ur.id === id ? { ...ur, role: ban ? 'banned' : 'user' } : ur))
    setLoading(null)
  }

  const deleteReview = async (id: string) => {
    setLoading(id + '_r')
    await adminAction({ type: 'delete_review', id })
    setReviews(r => r.filter(rv => rv.id !== id))
    setLoading(null)
  }

  const updateProposal = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(id + '_p')
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'proposal', id, action: status === 'approved' ? 'approve' : 'reject' }),
    })
    setProposals(p => p.map(pr => pr.id === id ? { ...pr, status } : pr))
    setLoading(null)
  }

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notifTitle.trim()) return
    setNotifSending(true)
    setNotifResult(null)

    if (notifMode === 'broadcast') {
      const res = await adminAction({
        type: 'notify_broadcast',
        title: notifTitle,
        body: notifBody || null,
        href: notifHref || null,
      })
      setNotifResult(`Inviata a ${res.sent ?? '?'} utenti`)
    } else {
      const u = users.find(u => u.username === notifTarget || u.id === notifTarget)
      if (!u) { setNotifResult('Utente non trovato'); setNotifSending(false); return }
      await adminAction({
        type: 'notify_user',
        user_id: u.id,
        title: notifTitle,
        body: notifBody || null,
        href: notifHref || null,
      })
      setNotifResult(`Inviata a @${u.username ?? u.id}`)
    }

    setNotifTitle('')
    setNotifBody('')
    setNotifHref('')
    setNotifTarget('')
    setNotifSending(false)
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',       label: 'Overview' },
    { id: 'revenue',        label: 'Ricavi' },
    { id: 'growth',         label: 'Crescita' },
    { id: 'shops',          label: 'Negozi',       badge: shops.filter(s => !s.is_verified).length || undefined },
    { id: 'markets',        label: 'Mercatini' },
    { id: 'proposals',      label: 'Proposte',     badge: stats.pendingProposals || undefined },
    { id: 'reviews',        label: 'Recensioni' },
    { id: 'users',          label: 'Utenti' },
    { id: 'notifications',  label: 'Notifiche' },
  ]

  // ── Filters ───────────────────────────────────────────────────────────────

  const q = (v: string) => v.toLowerCase()
  const filteredShops = shops.filter(s => {
    const matchFilter = shopFilter === 'pending' ? !s.is_verified : shopFilter === 'premium' ? s.plan === 'premium' : true
    if (!matchFilter) return false
    if (!shopSearch) return true
    const sq = q(shopSearch)
    return q(s.name).includes(sq) || q(s.city).includes(sq) || q(s.region).includes(sq)
  })
  const filteredMarkets = markets.filter(m => {
    if (!marketSearch) return true
    const sq = q(marketSearch)
    return q(m.name).includes(sq) || q(m.city).includes(sq) || q(m.region).includes(sq)
  })
  const filteredUsers = users.filter(u => {
    if (!userSearch) return true
    const sq = q(userSearch)
    const email = emailMap[u.id] ?? ''
    return q(u.first_name ?? '').includes(sq) || q(u.last_name ?? '').includes(sq) || q(u.username ?? '').includes(sq) || q(email).includes(sq)
  })

  const conversionRate = stats.totalShops > 0
    ? ((stats.premiumShops / stats.totalShops) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      {/* Header */}
      <div className="bg-espresso text-parchment px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-gold" />
            <h1 className="font-serif text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-parchment/60">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Sistema operativo
            </span>
            <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Alerts */}
        {(stats.pendingProposals > 0 || shops.some(s => !s.is_verified)) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {shops.filter(s => !s.is_verified).length > 0 && (
              <button onClick={() => { setTab('shops'); setShopFilter('pending') }}
                className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-[12px] font-semibold hover:bg-amber-100 transition-colors">
                <AlertTriangle size={13} />
                {shops.filter(s => !s.is_verified).length} negozi in attesa di verifica
              </button>
            )}
            {stats.pendingProposals > 0 && (
              <button onClick={() => setTab('proposals')}
                className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl px-4 py-2.5 text-[12px] font-semibold hover:bg-purple-100 transition-colors">
                <MessageSquarePlus size={13} />
                {stats.pendingProposals} proposte in attesa
              </button>
            )}
          </div>
        )}

        {/* Tab nav */}
        <div className="flex flex-wrap gap-1 bg-white border border-border rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'relative px-4 py-2 rounded-lg text-[13px] font-medium transition-colors',
                tab === t.id
                  ? 'bg-espresso text-parchment shadow-sm'
                  : 'text-muted hover:text-espresso'
              )}>
              {t.label}
              {t.badge ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sienna text-white text-[9px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="MRR"         value={fmtEur(stats.mrr)}            icon={Euro}        color="bg-gold"          sub={`ARR ${fmtEur(stats.arr)}`} />
              <StatCard label="Utenti"      value={fmt(stats.totalUsers)}         icon={Users}       color="bg-espresso"      sub="registrati" />
              <StatCard label="Negozi"      value={fmt(stats.totalShops)}         icon={Store}       color="bg-sienna"        sub={`${stats.verifiedShops} verificati`} />
              <StatCard label="Mercatini"   value={fmt(stats.totalMarkets)}       icon={MapPin}      color="bg-[#4a7c59]"     sub={`${stats.verifiedMarkets} verificati`} />
              <StatCard label="Premium"     value={fmt(stats.premiumShops)}       icon={Star}        color="bg-amber-500"     sub={`${conversionRate}% conversione`} />
              <StatCard label="Messaggi"    value={fmt(stats.totalMessages)}      icon={Activity}    color="bg-blue-500"      sub={`${stats.totalConversations} conversazioni`} />
              <StatCard label="Proposte"    value={fmt(stats.pendingProposals)}   icon={MessageSquarePlus} color="bg-purple-600" sub="in attesa" />
              <StatCard label="Copertura"   value={`${Math.round((stats.verifiedMarkets / Math.max(stats.totalMarkets,1)) * 100)}%`} icon={TrendingUp} color="bg-teal-600" sub="mercati verificati" />
            </div>

            {/* Scraper AI status */}
            <div className="flex items-center gap-3 bg-white border border-border rounded-2xl px-5 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Bot size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-espresso">Scraping AI mercatini</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {lastScraperRun
                    ? <>Ultimo aggiornamento: <span className="text-coffee font-medium">{new Date(lastScraperRun).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></>
                    : 'Nessun aggiornamento ancora eseguito'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-espresso leading-none">{aiMarketsCount.toLocaleString('it-IT')}</p>
                <p className="text-[10px] text-muted mt-0.5">trovati da AI</p>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted border border-border rounded-lg px-2.5 py-1.5">
                  <RefreshCw size={10} />
                  <span>1° e 18° del mese</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Crescita — ultime 12 settimane</p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={growthSeries}>
                    <defs>
                      <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CHART_COLORS.utenti} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={CHART_COLORS.utenti} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CHART_COLORS.negozi} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_COLORS.negozi} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8b8074' }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: '#8b8074' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2d8cc' }} />
                    <Area type="monotone" dataKey="utenti" stroke={CHART_COLORS.utenti} fill="url(#gu)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="negozi" stroke={CHART_COLORS.negozi} fill="url(#gn)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted"><span className="w-3 h-0.5 rounded bg-espresso inline-block" />Utenti</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted"><span className="w-3 h-0.5 rounded bg-gold inline-block" />Negozi</span>
                </div>
              </div>

              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Distribuzione piani</p>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={planBreakdown} dataKey="n" nameKey="plan" cx="50%" cy="50%"
                      innerRadius={35} outerRadius={55} paddingAngle={3}>
                      {planBreakdown.map((p, i) => (
                        <Cell key={i} fill={PLAN_COLORS[p.plan] ?? '#d0c8c0'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {planBreakdown.map(p => (
                    <div key={p.plan} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PLAN_COLORS[p.plan] ?? '#d0c8c0' }} />
                        <span className="text-coffee capitalize">{p.plan}</span>
                      </span>
                      <span className="font-semibold text-espresso">{p.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Top negozi per visibilità</p>
              <div className="space-y-2">
                {topShops.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-5 text-center text-[11px] font-bold text-muted">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-espresso truncate">{s.name}</p>
                        {s.plan === 'premium' && (
                          <span className="text-[9px] font-bold bg-gold/15 text-gold px-1.5 py-0.5 rounded-full">PRO</span>
                        )}
                        {s.is_verified && <CheckCircle size={11} className="text-green-600 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted">{s.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold text-espresso">{s.visibility_score ?? 0}</p>
                      <p className="text-[10px] text-muted">score</p>
                    </div>
                    <div className="text-right w-14">
                      <p className="text-[12px] font-semibold text-espresso">{s.posts_count ?? 0}</p>
                      <p className="text-[10px] text-muted">post</p>
                    </div>
                    <a href={`/negozi/${s.id}`} target="_blank"
                      className="p-1.5 rounded-lg text-muted hover:text-espresso transition-colors flex-shrink-0">
                      <Eye size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── REVENUE ──────────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-espresso text-parchment rounded-2xl p-5">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-parchment/50 mb-2">MRR</p>
                <p className="text-3xl font-bold">{fmtEur(stats.mrr)}</p>
                <p className="text-[11px] text-parchment/50 mt-1">mensile ricorrente</p>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">ARR</p>
                <p className="text-3xl font-bold text-espresso">{fmtEur(stats.arr)}</p>
                <p className="text-[11px] text-muted mt-1">annuale proiettato</p>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">Premium</p>
                <p className="text-3xl font-bold text-espresso">{stats.premiumShops}</p>
                <p className="text-[11px] text-muted mt-1">abbonati attivi</p>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">Conversione</p>
                <p className="text-3xl font-bold text-espresso">{conversionRate}%</p>
                <p className="text-[11px] text-muted mt-1">free → premium</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Piani — distribuzione</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={planBreakdown} dataKey="n" nameKey="plan"
                      cx="50%" cy="50%" outerRadius={75} paddingAngle={4}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {planBreakdown.map((p, i) => (
                        <Cell key={i} fill={PLAN_COLORS[p.plan] ?? '#d0c8c0'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-5">Modello ricavi</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-[13px] font-semibold text-espresso">Piano Pro</p>
                      <p className="text-[11px] text-muted">€14/mese × {stats.premiumShops} abbonati</p>
                    </div>
                    <p className="text-[15px] font-bold text-espresso">{fmtEur(stats.mrr)}</p>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-[13px] font-semibold text-espresso">Evento una-tantum</p>
                      <p className="text-[11px] text-muted">€19/evento</p>
                    </div>
                    <p className="text-[15px] font-bold text-espresso">€0</p>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-[13px] font-bold text-espresso">Totale MRR</p>
                    <p className="text-[18px] font-bold text-gold">{fmtEur(stats.mrr)}</p>
                  </div>
                </div>
                <div className="mt-6 p-3 bg-cream rounded-xl">
                  <p className="text-[11px] text-muted">
                    Per raggiungere <strong className="text-espresso">€1.000 MRR</strong> servono{' '}
                    <strong className="text-espresso">{Math.ceil(1000 / 14)} abbonati Pro</strong>.
                    Attualmente a <strong className="text-espresso">{((stats.mrr / 1000) * 100).toFixed(1)}%</strong> dell&apos;obiettivo.
                  </p>
                  <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full transition-all"
                      style={{ width: `${Math.min((stats.mrr / 1000) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Negozi premium attivi</p>
              {shops.filter(s => s.plan === 'premium').length === 0 ? (
                <p className="text-muted text-sm text-center py-6">Nessun abbonato premium ancora.</p>
              ) : (
                <div className="space-y-2">
                  {shops.filter(s => s.plan === 'premium').map(s => (
                    <div key={s.id} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                      <Star size={13} className="text-gold flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-espresso">{s.name}</p>
                        <p className="text-[11px] text-muted">{s.city} · {s.region}</p>
                      </div>
                      <p className="text-[12px] font-semibold text-green-700">€14/mese</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CRESCITA ─────────────────────────────────────────────── */}
        {tab === 'growth' && (
          <div className="space-y-5">
            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-5">Nuovi utenti e negozi — settimane</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthSeries}>
                  <defs>
                    <linearGradient id="gu2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={CHART_COLORS.utenti} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={CHART_COLORS.utenti} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gn2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={CHART_COLORS.negozi} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.negozi} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8b8074' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8b8074' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2d8cc' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="utenti" name="Utenti" stroke={CHART_COLORS.utenti} fill="url(#gu2)" strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.utenti }} />
                  <Area type="monotone" dataKey="negozi" name="Negozi" stroke={CHART_COLORS.negozi} fill="url(#gn2)" strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.negozi }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Negozi per regione</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={shopsByRegion} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#8b8074' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: '#4a4540' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="n" name="Negozi" fill="#c9a84c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Mercatini per regione (top 10)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={marketsByRegion} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#8b8074' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: '#4a4540' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="n" name="Mercatini" fill="#1c2e4a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted mb-4">Copertura geografica</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Regioni coperte', value: `${marketsByRegion.length}/20`, sub: 'mercatini presenti' },
                  { label: 'Media per regione', value: Math.round(stats.totalMarkets / Math.max(marketsByRegion.length, 1)), sub: 'mercatini/regione' },
                  { label: 'Regione top', value: marketsByRegion[0]?.region ?? '—', sub: `${marketsByRegion[0]?.n ?? 0} mercatini` },
                  { label: 'Mercatini verificati', value: `${Math.round((stats.verifiedMarkets / Math.max(stats.totalMarkets,1)) * 100)}%`, sub: `${stats.verifiedMarkets} su ${stats.totalMarkets}` },
                ].map(c => (
                  <div key={c.label} className="bg-cream rounded-xl p-4">
                    <p className="text-xl font-bold text-espresso">{c.value}</p>
                    <p className="text-[12px] font-medium text-coffee mt-0.5">{c.label}</p>
                    <p className="text-[10px] text-muted mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NEGOZI ───────────────────────────────────────────────── */}
        {tab === 'shops' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text" value={shopSearch} onChange={e => setShopSearch(e.target.value)}
                  placeholder="Cerca per nome, città, regione…"
                  className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/40 placeholder:text-muted/50"
                />
              </div>
              {(['all', 'pending', 'premium'] as const).map(f => (
                <button key={f} onClick={() => setShopFilter(f)}
                  className={cn('px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors border',
                    shopFilter === f ? 'bg-espresso text-parchment border-espresso' : 'bg-white text-muted border-border hover:border-espresso/30')}>
                  {f === 'all' ? `Tutti (${shops.length})` : f === 'pending' ? `In attesa (${shops.filter(s => !s.is_verified).length})` : `Premium (${shops.filter(s => s.plan === 'premium').length})`}
                </button>
              ))}
            </div>
            {shopSearch && <p className="text-[11px] text-muted">{filteredShops.length} risultat{filteredShops.length === 1 ? 'o' : 'i'}</p>}
            <div className="space-y-2">
              {filteredShops.map(s => (
                <div key={s.id} className={cn(
                  'bg-white border rounded-xl px-4 py-3 flex items-center gap-3',
                  !s.is_verified ? 'border-amber-200 bg-amber-50/20' : 'border-border'
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-espresso text-sm truncate">{s.name}</p>
                      {s.plan === 'premium' && (
                        <span className="text-[9px] font-bold bg-gold/15 text-gold px-1.5 py-0.5 rounded-full flex-shrink-0">PRO</span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{s.city} · {s.region} · {fmtDate(s.created_at)}</p>
                    <p className="text-xs text-muted mt-0.5">
                      P.IVA: <span className="font-mono">{s.vat_number || '—'}</span>
                      {' · '}
                      <span className={s.vat_status === 'verified' ? 'text-green-700' : 'text-amber-700'}>
                        {s.vat_status === 'verified' ? 'verificata' : s.vat_status === 'pending' ? 'in verifica' : s.vat_status || '—'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a href={`/negozi/${s.id}`} target="_blank" className="p-1.5 rounded-lg text-muted hover:text-espresso transition-colors">
                      <Eye size={14} />
                    </a>

                    {/* Piano dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setPlanDropOpen(planDropOpen === s.id ? null : s.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border text-muted hover:border-espresso/30 hover:text-espresso transition-colors"
                        title="Cambia piano"
                      >
                        <Crown size={11} />
                        {s.plan === 'premium' ? 'Pro' : 'Free'}
                        <ChevronDown size={10} />
                      </button>
                      {planDropOpen === s.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-10 py-1 w-28">
                          {['free', 'premium'].map(p => (
                            <button key={p} onClick={() => changeShopPlan(s.id, p)}
                              className={cn('w-full text-left px-3 py-2 text-[12px] hover:bg-cream transition-colors capitalize',
                                s.plan === p ? 'font-bold text-espresso' : 'text-muted')}>
                              {loading === s.id + '_plan' ? <Loader2 size={10} className="animate-spin" /> : null}
                              {p === 'premium' ? 'Pro' : 'Free'}
                              {s.plan === p && ' ✓'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Verifica */}
                    {s.is_verified ? (
                      <button onClick={() => verifyShop(s.id, false)} disabled={!!loading} title="Revoca verifica"
                        className="p-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-600 transition-colors">
                        {loading === s.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      </button>
                    ) : (
                      <button onClick={() => verifyShop(s.id, true)} disabled={!!loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                        {loading === s.id ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Approva</>}
                      </button>
                    )}

                    {/* Elimina */}
                    <button onClick={() => deleteShop(s.id)} disabled={loading === s.id + '_del'}
                      title="Elimina negozio"
                      className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                      {loading === s.id + '_del' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
              {filteredShops.length === 0 && <p className="text-muted text-sm text-center py-8">Nessun negozio.</p>}
            </div>
          </div>
        )}

        {/* ── MERCATINI ────────────────────────────────────────────── */}
        {tab === 'markets' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text" value={marketSearch} onChange={e => setMarketSearch(e.target.value)}
                  placeholder="Cerca per nome, città, regione…"
                  className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/40 placeholder:text-muted/50"
                />
              </div>
              <span className="text-[12px] text-muted flex-shrink-0">
                {marketSearch ? `${filteredMarkets.length} / ${markets.length}` : `${markets.length} totali`}
              </span>
            </div>
            <div className="space-y-2">
              {filteredMarkets.map(m => (
                <div key={m.id} className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-espresso text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted">
                      {m.city} · {m.region}
                      {m.next_date ? ` · ${new Date(m.next_date).toLocaleDateString('it-IT')}` : ''}
                      {m.frequency ? ` · ${m.frequency}` : ''}
                    </p>
                    {m.categories?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {m.categories.slice(0, 3).map(c => (
                          <span key={c} className="text-[10px] bg-cream text-coffee px-1.5 py-0.5 rounded-md">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => featureMarket(m.id, !m.is_featured)} disabled={loading === m.id + '_f'} title={m.is_featured ? 'Rimuovi evidenza' : 'Metti in evidenza'}
                      className={cn('p-1.5 rounded-lg transition-colors', m.is_featured ? 'text-gold bg-gold/10' : 'text-muted hover:text-gold hover:bg-gold/10')}>
                      {loading === m.id + '_f' ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                    </button>
                    <a href={`/mercatini/${m.id}`} target="_blank" className="p-1.5 rounded-lg text-muted hover:text-espresso transition-colors">
                      <Eye size={14} />
                    </a>
                    {m.is_verified ? (
                      <button onClick={() => verifyMarket(m.id, false)} disabled={!!loading}
                        className="p-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-600 transition-colors">
                        {loading === m.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      </button>
                    ) : (
                      <button onClick={() => verifyMarket(m.id, true)} disabled={!!loading}
                        className="p-1.5 rounded-lg text-muted bg-cream hover:bg-green-50 hover:text-green-700 transition-colors">
                        {loading === m.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      </button>
                    )}
                    <button onClick={() => deleteMarket(m.id)} disabled={loading === m.id + '_del'}
                      title="Elimina mercatino"
                      className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                      {loading === m.id + '_del' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROPOSTE ─────────────────────────────────────────────── */}
        {tab === 'proposals' && (
          <div className="space-y-3">
            {proposals.length === 0 && <p className="text-muted text-sm text-center py-8">Nessuna proposta ancora.</p>}
            {proposals.map(p => (
              <div key={p.id} className={cn('bg-white border rounded-xl px-4 py-4',
                p.status === 'pending' ? 'border-purple-200 bg-purple-50/20' : 'border-border')}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-espresso text-sm">{p.name}</p>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                        p.status === 'approved' ? 'bg-green-100 text-green-700' :
                        p.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-700')}>
                        {p.status === 'approved' ? 'Approvata' : p.status === 'rejected' ? 'Rifiutata' : 'In attesa'}
                      </span>
                    </div>
                    <p className="text-xs text-muted mb-1">{p.city} · {p.region} · <span className="font-medium">{p.event_type}</span></p>
                    {p.schedule  && <p className="text-xs text-coffee">📅 {p.schedule}</p>}
                    {p.website   && <a href={p.website} target="_blank" className="text-xs text-sienna hover:underline block">🔗 {p.website}</a>}
                    {p.instagram && <p className="text-xs text-coffee">@{p.instagram}</p>}
                    {p.description && <p className="text-xs text-muted mt-1 line-clamp-2">{p.description}</p>}
                    {p.email && <p className="text-xs text-muted mt-1">✉️ {p.email}</p>}
                    <p className="text-[11px] text-muted mt-1">{fmtDate(p.created_at)}</p>
                  </div>
                  {p.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => updateProposal(p.id, 'approved')} disabled={loading === p.id + '_p'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                        {loading === p.id + '_p' ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Approva</>}
                      </button>
                      <button onClick={() => updateProposal(p.id, 'rejected')} disabled={loading === p.id + '_p'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                        <XCircle size={12} /> Rifiuta
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RECENSIONI ───────────────────────────────────────────── */}
        {tab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length === 0 && <p className="text-muted text-sm text-center py-8">Nessuna recensione ancora.</p>}
            {reviews.map(r => {
              const target = r.markets ?? r.shops
              const targetPath = r.target_type === 'market' ? `/mercatini/${r.target_id}` : `/negozi/${r.target_id}`
              const author = r.profiles?.first_name ?? r.profiles?.username ?? 'Anonimo'
              return (
                <div key={r.id} className="bg-white border border-border rounded-xl px-4 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[12px] font-semibold text-espresso">{author}</span>
                        <span className="text-[10px] text-muted">·</span>
                        <a href={targetPath} target="_blank" className="text-[12px] text-sienna hover:underline font-medium">
                          {target?.name ?? r.target_id}
                        </a>
                        <span className="text-[10px] text-muted">{target?.city ?? ''}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <svg key={i} width="10" height="10" viewBox="0 0 20 20" fill={i <= r.rating ? '#C4A030' : '#e2d8cc'}>
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          ))}
                        </div>
                      </div>
                      {r.title && <p className="text-[13px] font-semibold text-espresso mb-0.5">{r.title}</p>}
                      {r.body && <p className="text-[12px] text-muted line-clamp-2">{r.body}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted">
                        <span>{fmtDate(r.created_at)}</span>
                        {r.likes_count > 0 && <span>❤️ {r.likes_count}</span>}
                        {r.comment_count > 0 && <span>💬 {r.comment_count}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteReview(r.id)} disabled={loading === r.id + '_r'}
                      title="Elimina recensione"
                      className="flex-shrink-0 p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                      {loading === r.id + '_r' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── UTENTI ───────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Cerca per nome, username, email…"
                  className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/40 placeholder:text-muted/50"
                />
              </div>
              <span className="text-[12px] text-muted flex-shrink-0">
                {userSearch ? `${filteredUsers.length} / ${users.length}` : `${users.length} totali`}
              </span>
            </div>
            <div className="space-y-2">
              {filteredUsers.length === 0 && <p className="text-muted text-sm text-center py-8">Nessun utente.</p>}
              {filteredUsers.map(u => (
                <div key={u.id} className={cn('bg-white border rounded-xl px-4 py-3 flex items-center gap-3',
                  u.role === 'banned' ? 'border-red-200 bg-red-50/20' : 'border-border')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-espresso text-sm">{u.first_name} {u.last_name}</p>
                      {u.username && <span className="text-xs text-muted">@{u.username}</span>}
                      {u.role === 'admin'      && <span className="text-[10px] bg-sienna/10 text-sienna px-1.5 py-0.5 rounded-full font-medium">admin</span>}
                      {u.role === 'shop_owner' && <span className="text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded-full font-medium">negozio</span>}
                      {u.role === 'banned'     && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">bannato</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {emailMap[u.id] && <span className="font-mono mr-2">{emailMap[u.id]}</span>}
                      {fmtDate(u.created_at)}
                    </p>
                  </div>
                  {u.role !== 'admin' && (
                    <button onClick={() => banUser(u.id, u.role !== 'banned')} disabled={loading === u.id + '_b'}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0',
                        u.role === 'banned'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'border border-red-200 text-red-600 hover:bg-red-50')}>
                      {loading === u.id + '_b'
                        ? <Loader2 size={12} className="animate-spin" />
                        : u.role === 'banned'
                          ? <><CheckCircle size={12} /> Sbanna</>
                          : <><Ban size={12} /> Banna</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTIFICHE ────────────────────────────────────────────── */}
        {tab === 'notifications' && (
          <div className="max-w-xl space-y-5">
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Bell size={16} className="text-sienna" />
                <h2 className="font-serif font-semibold text-espresso text-[16px]">Invia notifica</h2>
              </div>

              {/* Destinatario */}
              <div className="flex gap-2 mb-5">
                {(['broadcast', 'user'] as const).map(m => (
                  <button key={m} onClick={() => setNotifMode(m)}
                    className={cn('flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors',
                      notifMode === m ? 'bg-espresso text-parchment border-espresso' : 'bg-white text-muted border-border hover:border-espresso/30')}>
                    {m === 'broadcast' ? `Tutti (${users.length})` : 'Utente specifico'}
                  </button>
                ))}
              </div>

              <form onSubmit={sendNotification} className="space-y-4">
                {notifMode === 'user' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">Username o ID</label>
                    <input
                      type="text" value={notifTarget} onChange={e => setNotifTarget(e.target.value)}
                      required placeholder="es. albertozoppi_"
                      className="w-full input"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">Titolo *</label>
                  <input
                    type="text" value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                    required maxLength={100} placeholder="Titolo della notifica"
                    className="w-full input"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">
                    Testo <span className="font-normal normal-case tracking-normal text-muted">· opzionale</span>
                  </label>
                  <textarea
                    value={notifBody} onChange={e => setNotifBody(e.target.value)}
                    rows={3} maxLength={300} placeholder="Descrizione della notifica…"
                    className="w-full input resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">
                    Link <span className="font-normal normal-case tracking-normal text-muted">· opzionale, es. /mercatini</span>
                  </label>
                  <input
                    type="text" value={notifHref} onChange={e => setNotifHref(e.target.value)}
                    placeholder="/negozi, /mercatini, ecc."
                    className="w-full input"
                  />
                </div>

                {notifResult && (
                  <div className="flex items-center gap-2 text-[13px] text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                    <CheckCircle size={14} />
                    {notifResult}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={notifSending || !notifTitle.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-espresso text-parchment font-semibold py-3 rounded-xl text-[14px] hover:bg-sienna transition-colors disabled:opacity-40"
                >
                  {notifSending
                    ? <><Loader2 size={15} className="animate-spin" /> Invio in corso…</>
                    : <><Send size={15} /> {notifMode === 'broadcast' ? `Invia a tutti (${users.length})` : 'Invia'}</>}
                </button>
              </form>
            </div>

            <div className="bg-cream border border-border/60 rounded-2xl p-4">
              <p className="text-[12px] text-muted leading-relaxed">
                Le notifiche appaiono nel campanello in navbar. Il link, se specificato, apre la pagina quando si clicca la notifica. Le broadcast vengono inviate in batch da 100.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
