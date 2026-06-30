'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye, MapPin, TrendingUp, Clock, Users, RefreshCw,
  Home, Store, Compass, CalendarDays, FileText, ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface AnalyticsData {
  views_30min:         number
  views_today:         number
  views_7d:            number
  views_30d:           number
  avg_duration_sec:    number | null
  unique_sessions_24h: number
  bounce_rate:         number | null
  top_markets_today:   { market_id: string; name: string; city: string; count: number }[]
  top_pages_today:     { path: string; count: number }[]
  recent_views:        { id: number; path: string; market_id: string | null; market_name: string | null; session_id: string | null; created_at: string }[]
  daily_views:         { label: string; visite: number }[]
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 10)   return 'adesso'
  if (diff < 60)   return `${diff}s fa`
  if (diff < 3600) return `${Math.floor(diff / 60)}min fa`
  return `${Math.floor(diff / 3600)}h fa`
}

function fmtDuration(sec: number | null) {
  if (!sec) return '—'
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function pathLabel(path: string): { label: string; icon: React.ElementType; color: string } {
  if (path === '/home' || path === '/')      return { label: 'Home',      icon: Home,        color: 'bg-blue-500/10 text-blue-600' }
  if (path === '/mappa')                     return { label: 'Mappa',     icon: Compass,     color: 'bg-emerald-500/10 text-emerald-600' }
  if (path === '/mercatini')                 return { label: 'Mercatini', icon: MapPin,       color: 'bg-amber-500/10 text-amber-600' }
  if (path === '/negozi')                    return { label: 'Negozi',    icon: Store,        color: 'bg-purple-500/10 text-purple-600' }
  if (path.startsWith('/mercatini/eventi/')) return { label: 'Evento',    icon: CalendarDays, color: 'bg-rose-500/10 text-rose-600' }
  if (path.startsWith('/mercatini/'))        return { label: 'Mercatino', icon: MapPin,       color: 'bg-amber-500/10 text-amber-600' }
  if (path.startsWith('/negozi/'))           return { label: 'Negozio',   icon: Store,        color: 'bg-purple-500/10 text-purple-600' }
  return { label: path, icon: FileText, color: 'bg-slate-100 text-slate-500' }
}

function sessionColor(sid: string | null): string {
  if (!sid) return '#e2d8cc'
  let h = 0
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, 55%, 62%)`
}

export default function LiveSection() {
  const [data,        setData]        = useState<AnalyticsData | null>(null)
  const [recentViews, setRecentViews] = useState<AnalyticsData['recent_views']>([])
  const [views30min,  setViews30min]  = useState(0)
  const [viewsToday,  setViewsToday]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [, setTick] = useState(0)
  const sbRef      = useRef(createClient())
  const newEntries = useRef<Set<number>>(new Set())

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const loadData = () => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then((d: AnalyticsData) => {
        setData(d)
        setRecentViews(d.recent_views)
        setViews30min(d.views_30min)
        setViewsToday(d.views_today)
        setLastRefresh(Date.now())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const id = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const supabase = sbRef.current
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_views' }, (payload) => {
        const row = payload.new as {
          id: number; path: string; market_id: string | null
          shop_id: string | null; session_id: string | null; created_at: string
        }
        newEntries.current.add(row.id)
        setTimeout(() => { newEntries.current.delete(row.id); }, 2500)
        setRecentViews(prev => [
          { id: row.id, path: row.path, market_id: row.market_id, market_name: null, session_id: row.session_id, created_at: row.created_at },
          ...prev,
        ].slice(0, 50))
        const ts = new Date(row.created_at)
        if (ts >= new Date(Date.now() - 30 * 60 * 1000)) setViews30min(n => n + 1)
        if (ts >= startOfDay) setViewsToday(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-muted/20 border-t-muted/60 animate-spin" />
        <span className="text-[13px]">Connessione al feed live…</span>
      </div>
    )
  }

  const maxDaily = Math.max(...(data?.daily_views ?? []).map(d => d.visite), 1)

  return (
    <div className="space-y-5">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #1c2e4a 0%, #1e3354 100%)' }}>

        {/* Top row */}
        <div className="px-7 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/40">Live ora</span>
          </div>
          <button onClick={loadData}
            className="flex items-center gap-1.5 text-[10px] text-white/20 hover:text-white/45 transition-colors">
            <RefreshCw size={10} />
            {timeAgo(new Date(lastRefresh).toISOString())}
          </button>
        </div>

        {/* Big number + today */}
        <div className="px-7 pt-5 pb-6 flex items-end gap-8">
          <div>
            <p className="font-black text-white leading-none"
              style={{ fontSize: 'clamp(4rem, 9vw, 6rem)' }}>
              {views30min}
            </p>
            <p className="text-[13px] text-white/35 mt-1.5">visite ultimi 30 minuti</p>
          </div>
          <div className="pb-2.5 flex flex-col items-end ml-auto gap-0.5">
            <div className="flex items-center gap-1">
              <ArrowUpRight size={14} className="text-green-400" />
              <span className="text-[28px] font-bold text-white/75">{viewsToday}</span>
            </div>
            <span className="text-[10px] text-white/25">oggi</span>
          </div>
        </div>

        {/* Metric pills */}
        <div className="px-6 pb-5 flex flex-wrap gap-2">
          {[
            { icon: Users, label: `${data?.unique_sessions_24h ?? 0} sessioni uniche` },
            { icon: Clock, label: `${fmtDuration(data?.avg_duration_sec ?? null)} medio` },
            { icon: TrendingUp, label: data?.bounce_rate != null ? `${data.bounce_rate}% bounce` : '— bounce' },
          ].map(k => {
            const K = k.icon
            return (
              <div key={k.label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-white/55"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <K size={11} />
                {k.label}
              </div>
            )
          })}
        </div>

        {/* Sparkline */}
        {(data?.daily_views?.length ?? 0) > 0 && (
          <div className="px-6 pb-5">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/15 mb-2">30 giorni</p>
            <div className="flex items-end gap-[2px] h-9">
              {(data?.daily_views ?? []).map((d, i) => (
                <div key={i} className="flex-1 rounded-[2px] transition-all"
                  style={{
                    height: `${Math.max(8, Math.round((d.visite / maxDaily) * 100))}%`,
                    background: `rgba(201,168,76,${0.2 + (d.visite / maxDaily) * 0.8})`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── KPI SETTIMANALI ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: '7 giorni',      value: (data?.views_7d  ?? 0).toLocaleString('it-IT'), accent: '#1c2e4a' },
          { label: '30 giorni',     value: (data?.views_30d ?? 0).toLocaleString('it-IT'), accent: '#1c2e4a' },
          { label: 'Mercatino top', value: data?.top_markets_today[0]?.name ?? '—',
            sub: data?.top_markets_today[0] ? `${data.top_markets_today[0].count} visite` : 'nessuna visita', accent: '#4a7c59', small: true },
          { label: 'Pagina top',    value: data?.top_pages_today[0] ? pathLabel(data.top_pages_today[0].path).label : '—',
            sub: data?.top_pages_today[0] ? `${data.top_pages_today[0].count} visite` : 'nessuna', accent: '#7c5a4a', small: true },
        ] as { label: string; value: string; sub?: string; accent: string; small?: boolean }[]).map(k => (
          <div key={k.label} className="bg-white border border-border rounded-2xl px-4 py-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ background: k.accent }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted mb-2">{k.label}</p>
            <p className={`font-bold text-espresso leading-tight truncate ${k.small ? 'text-[15px]' : 'text-[2rem]'}`}>{k.value}</p>
            {k.sub && <p className="text-[10px] text-muted mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── GRAFICO FULL ──────────────────────────────────────────────── */}
      {(data?.daily_views?.length ?? 0) > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Visite giornaliere</p>
              <p className="text-[12px] text-coffee mt-0.5">ultimi 30 giorni</p>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-bold text-espresso leading-none">{(data?.views_30d ?? 0).toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-muted">totale</p>
            </div>
          </div>
          <div className="px-2 py-5">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={data?.daily_views ?? []} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gv3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1c2e4a" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#1c2e4a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#b8afa8' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#b8afa8' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2d8cc', background: '#fff', boxShadow: '0 4px 16px rgba(28,46,74,.08)' }}
                  cursor={{ stroke: '#1c2e4a', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="visite" stroke="#1c2e4a" fill="url(#gv3)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#1c2e4a', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── FEED + TOP ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Feed */}
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Feed live</p>
            <span className="ml-auto text-[10px] bg-cream text-coffee font-semibold px-2.5 py-0.5 rounded-full">
              {recentViews.length}
            </span>
          </div>

          {recentViews.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-muted/40 gap-2.5">
              <Eye size={24} strokeWidth={1.5} />
              <p className="text-[13px] text-muted">Il feed si aggiorna in tempo reale</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentViews.slice(0, 25).map(v => {
                const info = pathLabel(v.path)
                const Icon = info.icon
                return (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                    {/* Session stripe */}
                    <div className="w-[3px] h-6 rounded-full flex-shrink-0 opacity-50"
                      style={{ background: sessionColor(v.session_id) }} />
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${info.color}`}>
                      <Icon size={13} />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[12px] font-semibold text-espresso">{info.label}</span>
                        {v.market_name && (
                          <span className="text-[11px] text-muted/60 truncate">· {v.market_name}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted/35 truncate block">{v.path}</span>
                    </div>
                    {/* Time */}
                    <span className="text-[10px] text-muted/35 flex-shrink-0 tabular-nums">
                      {timeAgo(v.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar: top mercatini + top pagine */}
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={12} className="text-sienna" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted flex-1">Top mercatini</p>
              <span className="text-[9px] text-muted/35">24h</span>
            </div>
            {(data?.top_markets_today ?? []).length === 0 ? (
              <p className="text-[12px] text-muted text-center py-4">Nessun dato.</p>
            ) : (
              <div className="space-y-3">
                {(data?.top_markets_today ?? []).slice(0, 6).map((m, i) => {
                  const maxC = data?.top_markets_today[0]?.count ?? 1
                  return (
                    <div key={m.market_id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-muted/25 w-3 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-espresso truncate">{m.name}</p>
                          <p className="text-[9px] text-muted">{m.city}</p>
                        </div>
                        <span className="text-[12px] font-bold text-espresso tabular-nums">{m.count}</span>
                      </div>
                      <div className="ml-5 h-[3px] bg-border/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(m.count / maxC) * 100}%`, background: `hsl(${200 + i * 30}, 50%, 48%)` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={12} className="text-sienna" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted flex-1">Top pagine</p>
              <span className="text-[9px] text-muted/35">24h</span>
            </div>
            {(data?.top_pages_today ?? []).length === 0 ? (
              <p className="text-[12px] text-muted text-center py-4">Nessun dato.</p>
            ) : (
              <div className="space-y-2.5">
                {(data?.top_pages_today ?? []).slice(0, 7).map((p, i) => {
                  const info = pathLabel(p.path)
                  const Icon = info.icon
                  const maxC = data?.top_pages_today[0]?.count ?? 1
                  return (
                    <div key={p.path} className="flex items-center gap-2.5">
                      <span className="text-[10px] font-black text-muted/25 w-3 text-center">{i + 1}</span>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${info.color}`}>
                        <Icon size={11} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] font-semibold text-espresso truncate">{info.label}</p>
                          <span className="text-[11px] font-bold text-espresso tabular-nums ml-1">{p.count}</span>
                        </div>
                        <div className="h-[3px] bg-border/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-espresso/40"
                            style={{ width: `${(p.count / maxC) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
