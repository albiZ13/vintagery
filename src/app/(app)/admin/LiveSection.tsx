'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Activity, Eye, MapPin, TrendingUp, Clock, Users, BarChart2, RefreshCw,
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
  if (diff < 60)   return `${diff}s fa`
  if (diff < 3600) return `${Math.floor(diff / 60)}min fa`
  return `${Math.floor(diff / 3600)}h fa`
}

function fmtDuration(sec: number | null) {
  if (!sec) return '—'
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function pathLabel(path: string) {
  if (path === '/home')     return 'Home'
  if (path === '/mappa')    return 'Mappa'
  if (path === '/mercatini') return 'Mercatini'
  if (path === '/negozi')   return 'Negozi'
  if (path.startsWith('/mercatini/eventi/')) return 'Evento'
  if (path.startsWith('/mercatini/'))        return 'Mercatino'
  if (path.startsWith('/negozi/'))           return 'Negozio'
  return path
}

const STAT_CARD_CLS = 'bg-white border border-border rounded-2xl p-5'

export default function LiveSection() {
  const [data,       setData]       = useState<AnalyticsData | null>(null)
  const [recentViews, setRecentViews] = useState<AnalyticsData['recent_views']>([])
  const [views30min, setViews30min] = useState(0)
  const [viewsToday, setViewsToday] = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [, setTick] = useState(0)
  const sbRef = useRef(createClient())

  // Aggiorna timestamp relativi ogni 10s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  // Carica dati iniziali (e ricarica ogni 5 min)
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

  // Realtime subscription
  useEffect(() => {
    const supabase = sbRef.current
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const channel = supabase
      .channel('admin-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'page_views' },
        (payload) => {
          const row = payload.new as {
            id: number; path: string; market_id: string | null
            shop_id: string | null; session_id: string | null; created_at: string
          }
          const entry = { id: row.id, path: row.path, market_id: row.market_id, market_name: null, session_id: row.session_id, created_at: row.created_at }
          setRecentViews(prev => [entry, ...prev].slice(0, 50))
          const ts = new Date(row.created_at)
          if (ts >= new Date(Date.now() - 30 * 60 * 1000)) setViews30min(n => n + 1)
          if (ts >= startOfDay) setViewsToday(n => n + 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted text-sm">
        <Activity size={16} className="animate-pulse mr-2" /> Caricamento dati live…
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Ora */}
        <div className={STAT_CARD_CLS}>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">Ora</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-espresso">{views30min}</p>
            <span className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-600 font-medium">live</span>
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1">visite ultimi 30 min</p>
        </div>

        {/* Oggi */}
        <div className={STAT_CARD_CLS}>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">Oggi</p>
          <p className="text-3xl font-bold text-espresso">{viewsToday}</p>
          <p className="text-[11px] text-muted mt-1">da mezzanotte</p>
        </div>

        {/* Sessioni uniche 24h */}
        <div className={STAT_CARD_CLS}>
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={11} className="text-muted" />
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted">Sessioni 24h</p>
          </div>
          <p className="text-3xl font-bold text-espresso">{data?.unique_sessions_24h ?? 0}</p>
          <p className="text-[11px] text-muted mt-1">
            {data?.bounce_rate != null ? `${data.bounce_rate}% bounce rate` : 'sessioni uniche'}
          </p>
        </div>

        {/* Tempo medio */}
        <div className={STAT_CARD_CLS}>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={11} className="text-muted" />
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted">Tempo medio</p>
          </div>
          <p className="text-3xl font-bold text-espresso">{fmtDuration(data?.avg_duration_sec ?? null)}</p>
          <p className="text-[11px] text-muted mt-1">per pagina · ultimi 7gg</p>
        </div>
      </div>

      {/* ── Riga secondaria KPI ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={STAT_CARD_CLS}>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-1.5">Settimana</p>
          <p className="text-2xl font-bold text-espresso">{data?.views_7d ?? 0}</p>
          <p className="text-[11px] text-muted mt-0.5">visite 7 giorni</p>
        </div>
        <div className={STAT_CARD_CLS}>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-1.5">Mese</p>
          <p className="text-2xl font-bold text-espresso">{data?.views_30d ?? 0}</p>
          <p className="text-[11px] text-muted mt-0.5">visite 30 giorni</p>
        </div>
        <div className={`${STAT_CARD_CLS} md:col-span-2`}>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-1.5">Top mercatino oggi</p>
          <p className="text-[16px] font-bold text-espresso leading-tight">
            {data?.top_markets_today[0]?.name ?? '—'}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {data?.top_markets_today[0]
              ? `${data.top_markets_today[0].count} visite · ${data.top_markets_today[0].city}`
              : 'nessuna visita registrata'}
          </p>
        </div>
      </div>

      {/* ── Grafico visite 30gg ──────────────────────────────────────── */}
      {(data?.daily_views?.length ?? 0) > 0 && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-muted" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Visite giornaliere — ultimi 30 giorni</p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 text-[10px] text-muted hover:text-espresso transition-colors"
            >
              <RefreshCw size={10} />
              {timeAgo(new Date(lastRefresh).toISOString())}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data?.daily_views ?? []}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1c2e4a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1c2e4a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8b8074' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 9, fill: '#8b8074' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2d8cc' }} />
              <Area type="monotone" dataKey="visite" stroke="#1c2e4a" fill="url(#gv)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Feed + top mercatini/pagine ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Feed live */}
        <div className="md:col-span-2 bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Feed live</p>
            <span className="ml-auto text-[10px] text-muted">{recentViews.length} recenti</span>
          </div>
          {recentViews.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">Nessuna visita ancora — tracking attivo.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {recentViews.slice(0, 20).map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2.5">
                  <Eye size={12} className="text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] bg-cream text-coffee font-medium px-1.5 py-0.5 rounded-md flex-shrink-0">
                        {pathLabel(v.path)}
                      </span>
                      <span className="text-[11px] font-mono text-muted/60 truncate">{v.path}</span>
                    </div>
                    {v.market_name && (
                      <span className="text-[10px] text-sienna/70 flex items-center gap-1 mt-0.5">
                        <MapPin size={8} /> {v.market_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted flex-shrink-0 tabular-nums w-12 text-right">
                    {timeAgo(v.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar destra */}
        <div className="space-y-4">
          {/* Top mercatini */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={13} className="text-muted" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Top mercatini oggi</p>
            </div>
            {(data?.top_markets_today ?? []).length === 0 ? (
              <p className="text-muted text-[12px] text-center py-4">Nessun dato.</p>
            ) : (
              <div className="space-y-2.5">
                {(data?.top_markets_today ?? []).slice(0, 7).map((m, i) => (
                  <div key={m.market_id} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted w-4 text-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-espresso truncate">{m.name}</p>
                      <p className="text-[10px] text-muted">{m.city}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[13px] font-bold text-espresso tabular-nums">{m.count}</p>
                      <div className="h-1 rounded-full bg-espresso/10 mt-0.5 w-10">
                        <div
                          className="h-1 rounded-full bg-sienna/70 transition-all"
                          style={{ width: `${Math.round((m.count / (data?.top_markets_today[0]?.count ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top pagine */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={13} className="text-muted" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Top pagine oggi</p>
            </div>
            {(data?.top_pages_today ?? []).length === 0 ? (
              <p className="text-muted text-[12px] text-center py-4">Nessun dato.</p>
            ) : (
              <div className="space-y-2">
                {(data?.top_pages_today ?? []).slice(0, 8).map((p, i) => (
                  <div key={p.path} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted w-4 text-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-espresso truncate">{pathLabel(p.path)}</p>
                      <p className="text-[9px] font-mono text-muted/60 truncate">{p.path}</p>
                    </div>
                    <span className="text-[12px] font-bold text-espresso tabular-nums flex-shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
