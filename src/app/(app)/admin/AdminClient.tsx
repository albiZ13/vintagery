'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, Store, MapPin, ShieldCheck, Star,
  CheckCircle, XCircle, Eye, Loader2, Ban,
  MessageSquarePlus, Calendar,
} from 'lucide-react'

interface Stats {
  usersCount:     number | null
  marketsCount:   number | null
  shopsCount:     number | null
  shopspending:   number | null
  proposalsPending: number | null
}

interface Shop {
  id: string; name: string; city: string; region: string
  created_at: string; is_verified: boolean; vat_status: string; vat_number: string
}

interface Market {
  id: string; name: string; city: string; region: string
  next_date: string | null; is_verified: boolean; is_featured: boolean; categories: string[]
}

interface UserRow {
  id: string; username: string | null; first_name: string | null; last_name: string | null
  role: string; created_at: string; email?: string
}

interface Proposal {
  id: string; name: string; city: string; region: string; event_type: string
  schedule: string | null; website: string | null; instagram: string | null
  description: string | null; email: string | null; status: string; created_at: string
}

type Tab = 'stats' | 'markets' | 'shops' | 'proposals' | 'users'

export default function AdminClient({
  stats, recentShops, recentMarkets, recentUsers, recentProposals,
}: {
  stats: Stats
  recentShops: Shop[]
  recentMarkets: Market[]
  recentUsers: UserRow[]
  recentProposals: Proposal[]
}) {
  const [tab, setTab]           = useState<Tab>('stats')
  const [shops, setShops]       = useState<Shop[]>(recentShops)
  const [markets, setMarkets]   = useState<Market[]>(recentMarkets)
  const [users, setUsers]       = useState<UserRow[]>(recentUsers)
  const [proposals, setProposals] = useState<Proposal[]>(recentProposals)
  const [loading, setLoading]   = useState<string | null>(null)
  const supabase = createClient()

  async function verifyShop(id: string, verify: boolean) {
    setLoading(id)
    await supabase.from('shops').update({ is_verified: verify }).eq('id', id)
    setShops(s => s.map(sh => sh.id === id ? { ...sh, is_verified: verify } : sh))
    setLoading(null)
  }

  async function verifyMarket(id: string, verify: boolean) {
    setLoading(id)
    await supabase.from('markets').update({ is_verified: verify }).eq('id', id)
    setMarkets(m => m.map(mk => mk.id === id ? { ...mk, is_verified: verify } : mk))
    setLoading(null)
  }

  async function featureMarket(id: string, featured: boolean) {
    setLoading(id + '_feat')
    await supabase.from('markets').update({ is_featured: featured }).eq('id', id)
    setMarkets(m => m.map(mk => mk.id === id ? { ...mk, is_featured: featured } : mk))
    setLoading(null)
  }

  async function banUser(id: string, ban: boolean) {
    setLoading(id + '_ban')
    await supabase.from('profiles').update({ role: ban ? 'banned' : 'user' }).eq('id', id)
    setUsers(u => u.map(usr => usr.id === id ? { ...usr, role: ban ? 'banned' : 'user' } : usr))
    setLoading(null)
  }

  async function updateProposal(id: string, status: 'approved' | 'rejected') {
    setLoading(id + '_prop')
    await supabase.from('market_proposals').update({ status }).eq('id', id)
    setProposals(p => p.map(pr => pr.id === id ? { ...pr, status } : pr))
    setLoading(null)
  }

  const statCards = [
    { label: 'Utenti',     value: stats.usersCount,       icon: Users,             color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Mercatini',  value: stats.marketsCount,     icon: MapPin,            color: 'text-sienna',    bg: 'bg-sienna/10' },
    { label: 'Negozi',     value: stats.shopsCount,       icon: Store,             color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'In attesa',  value: stats.shopspending,     icon: ShieldCheck,       color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Proposte',   value: stats.proposalsPending, icon: MessageSquarePlus, color: 'text-purple-700', bg: 'bg-purple-50' },
  ]

  const TABS: { id: Tab; label: string }[] = [
    { id: 'stats',     label: 'Stats' },
    { id: 'markets',   label: `Mercatini (${markets.length})` },
    { id: 'shops',     label: `Negozi (${shops.length})` },
    { id: 'proposals', label: `Proposte${stats.proposalsPending ? ` (${stats.proposalsPending})` : ''}` },
    { id: 'users',     label: `Utenti (${users.length})` },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={22} className="text-sienna" />
        <h1 className="font-serif text-2xl font-bold text-espresso">Admin Panel</h1>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 bg-surface-soft border border-border rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-espresso border border-border' : 'text-muted hover:text-espresso'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STATISTICHE */}
      {tab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-espresso">{value ?? '—'}</p>
              <p className="text-sm text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* MERCATINI */}
      {tab === 'markets' && (
        <div className="space-y-2">
          {markets.map(m => (
            <div key={m.id} className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-espresso text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted">{m.city} · {m.region}{m.next_date ? ` · ${new Date(m.next_date).toLocaleDateString('it-IT')}` : ''}</p>
                {m.categories?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {m.categories.slice(0,3).map(c => (
                      <span key={c} className="text-[10px] bg-cream text-coffee px-1.5 py-0.5 rounded-md">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => featureMarket(m.id, !m.is_featured)} disabled={loading === m.id + '_feat'}
                  title={m.is_featured ? 'Rimuovi evidenza' : 'Metti in evidenza'}
                  className={`p-1.5 rounded-lg transition-colors ${m.is_featured ? 'text-gold bg-gold/10' : 'text-muted hover:text-gold hover:bg-gold/10'}`}>
                  {loading === m.id + '_feat' ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEGOZI */}
      {tab === 'shops' && (
        <div className="space-y-2">
          {shops.map(s => (
            <div key={s.id} className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-4 ${!s.is_verified ? 'border-amber-200 bg-amber-50/30' : 'border-border'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-espresso text-sm truncate">{s.name}</p>
                <p className="text-xs text-muted">{s.city} · {s.region}</p>
                <p className="text-xs text-muted mt-0.5">
                  P.IVA: {s.vat_number || '—'} ·{' '}
                  <span className={s.vat_status === 'verified' ? 'text-green-700' : 'text-amber-700'}>
                    {s.vat_status === 'verified' ? 'Verificata' : s.vat_status === 'pending' ? 'In attesa' : s.vat_status || '—'}
                  </span>
                  {' · '}{new Date(s.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/negozi/${s.id}`} target="_blank" className="p-1.5 rounded-lg text-muted hover:text-espresso transition-colors">
                  <Eye size={14} />
                </a>
                {s.is_verified ? (
                  <button onClick={() => verifyShop(s.id, false)} disabled={!!loading}
                    className="p-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-600 transition-colors" title="Revoca verifica">
                    {loading === s.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  </button>
                ) : (
                  <button onClick={() => verifyShop(s.id, true)} disabled={!!loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                    {loading === s.id ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Approva</>}
                  </button>
                )}
              </div>
            </div>
          ))}
          {shops.length === 0 && <p className="text-muted text-sm text-center py-8">Nessun negozio ancora.</p>}
        </div>
      )}

      {/* PROPOSTE MERCATINO */}
      {tab === 'proposals' && (
        <div className="space-y-3">
          {proposals.length === 0 && <p className="text-muted text-sm text-center py-8">Nessuna proposta ancora.</p>}
          {proposals.map(p => (
            <div key={p.id} className={`bg-white border rounded-xl px-4 py-4 ${p.status === 'pending' ? 'border-purple-200 bg-purple-50/20' : 'border-border'}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-espresso text-sm">{p.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'approved' ? 'bg-green-100 text-green-700' :
                      p.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {p.status === 'approved' ? 'Approvata' : p.status === 'rejected' ? 'Rifiutata' : 'In attesa'}
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-1">{p.city} · {p.region} · <span className="font-medium">{p.event_type}</span></p>
                  {p.schedule  && <p className="text-xs text-coffee">📅 {p.schedule}</p>}
                  {p.website   && <a href={p.website} target="_blank" className="text-xs text-sienna hover:underline block">🔗 {p.website}</a>}
                  {p.instagram && <p className="text-xs text-coffee">@{p.instagram}</p>}
                  {p.description && <p className="text-xs text-muted mt-1 line-clamp-2">{p.description}</p>}
                  {p.email && <p className="text-xs text-muted mt-1">✉️ {p.email}</p>}
                  <p className="text-[11px] text-muted mt-1">{new Date(p.created_at).toLocaleDateString('it-IT')}</p>
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => updateProposal(p.id, 'approved')} disabled={loading === p.id + '_prop'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                      {loading === p.id + '_prop' ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Approva</>}
                    </button>
                    <button onClick={() => updateProposal(p.id, 'rejected')} disabled={loading === p.id + '_prop'}
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

      {/* UTENTI */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.length === 0 && <p className="text-muted text-sm text-center py-8">Nessun utente.</p>}
          {users.map(u => (
            <div key={u.id} className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-4 ${u.role === 'banned' ? 'border-red-200 bg-red-50/20' : 'border-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-espresso text-sm">{u.first_name} {u.last_name}</p>
                  {u.username && <span className="text-xs text-muted">@{u.username}</span>}
                  {u.role === 'admin' && <span className="text-[10px] bg-sienna/10 text-sienna px-1.5 py-0.5 rounded-full font-medium">admin</span>}
                  {u.role === 'banned' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">bannato</span>}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(u.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              {u.role !== 'admin' && (
                <button
                  onClick={() => banUser(u.id, u.role !== 'banned')}
                  disabled={loading === u.id + '_ban'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                    u.role === 'banned'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {loading === u.id + '_ban'
                    ? <Loader2 size={12} className="animate-spin" />
                    : u.role === 'banned'
                      ? <><CheckCircle size={12} /> Sbanna</>
                      : <><Ban size={12} /> Banna</>
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
