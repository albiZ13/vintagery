'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Plus, X, MapPin, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface MarketRow {
  id: string
  name: string
  city: string
  region: string
  description: string | null
}

interface Participation {
  id: string
  market_event_id: string
  market_events: MarketRow
}

function scheduleLabel(desc: string | null): string | null {
  if (!desc) return null
  return desc.match(/Cadenza:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() ?? null
}

export default function MarketParticipationManager({ shopId }: { shopId: string }) {
  const supabase = createClient()

  const [participations, setParticipations] = useState<Participation[]>([])
  const [loading,        setLoading]        = useState(true)
  const [query,          setQuery]          = useState('')
  const [results,        setResults]        = useState<MarketRow[]>([])
  const [searching,      setSearching]      = useState(false)
  const [adding,         setAdding]         = useState<string | null>(null)
  const [removing,       setRemoving]       = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase
      .from('shop_market_participations')
      .select('id, market_event_id, market_events(id, name, city, region, description)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setParticipations((data ?? []) as unknown as Participation[])
        setLoading(false)
      })
  }, [shopId])

  function onQueryChange(q: string) {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('market_events')
        .select('id, name, city, region, description')
        .eq('is_recurring', true)
        .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(8)
      setResults((data ?? []) as MarketRow[])
      setSearching(false)
    }, 300)
  }

  async function add(market: MarketRow) {
    if (participations.some(p => p.market_event_id === market.id)) return
    setAdding(market.id)
    const { data, error } = await supabase
      .from('shop_market_participations')
      .insert({ shop_id: shopId, market_event_id: market.id })
      .select('id, market_event_id, market_events(id, name, city, region, description)')
      .single()
    if (!error && data) {
      setParticipations(ps => [data as unknown as Participation, ...ps])
      setResults(r => r.filter(x => x.id !== market.id))
    }
    setAdding(null)
  }

  async function remove(participationId: string) {
    setRemoving(participationId)
    await supabase.from('shop_market_participations').delete().eq('id', participationId)
    setParticipations(ps => ps.filter(p => p.id !== participationId))
    setRemoving(null)
  }

  const participatingIds = new Set(participations.map(p => p.market_event_id))

  return (
    <div className="space-y-5">

      {/* ── Cerca e aggiungi ─────────────────────────────── */}
      <section className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-serif font-semibold text-[17px] text-espresso mb-1">Aggiungi un mercato</h2>
        <p className="text-[12px] text-muted mb-4">Cerca per nome del mercato o città.</p>

        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className="input pl-8 pr-8"
            placeholder="es. Arezzo, Porta Portese, Bologna..."
            value={query}
            onChange={e => onQueryChange(e.target.value)}
          />
          {searching && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {results.map(m => {
              const already = participatingIds.has(m.id)
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-cream/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-espresso truncate">{m.name}</p>
                    <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                      <MapPin size={9} /> {m.city}, {m.region}
                    </p>
                  </div>
                  <button
                    onClick={() => add(m)}
                    disabled={already || adding === m.id}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-sienna text-white hover:bg-sienna/90 disabled:opacity-40 transition-colors"
                  >
                    {adding === m.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Plus size={11} />
                    }
                    {already ? 'Aggiunto' : 'Aggiungi'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !searching && (
          <div className="text-center py-5 border border-dashed border-border rounded-lg">
            <p className="text-[12px] text-muted mb-2">Nessun mercato trovato per "{query}"</p>
            <Link href="/proponi-mercatino" className="text-[12px] font-semibold text-sienna hover:underline">
              Segnalalo come nuovo mercato →
            </Link>
          </div>
        )}
      </section>

      {/* ── Proponi mercato mancante ──────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-cream border border-border rounded-xl">
        <ExternalLink size={13} className="text-muted flex-shrink-0" />
        <p className="text-[12px] text-coffee flex-1">
          Il tuo mercato non è ancora su Vintagery?
        </p>
        <Link
          href="/proponi-mercatino"
          className="text-[12px] font-semibold text-sienna hover:underline flex-shrink-0"
        >
          Proponilo →
        </Link>
      </div>

      {/* ── Mercati in cui sei presente ───────────────────── */}
      <section>
        <h2 className="font-serif font-semibold text-[17px] text-espresso mb-3">
          Mercati in cui sei presente
          <span className="ml-2 text-[13px] font-normal text-muted">({participations.length})</span>
        </h2>

        {loading ? (
          <div className="text-center py-8 text-muted text-[12px] flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Caricamento...
          </div>
        ) : participations.length === 0 ? (
          <p className="text-center py-8 border border-dashed border-border rounded-xl text-muted text-[12px]">
            Non hai ancora aggiunto nessun mercato.
          </p>
        ) : (
          <div className="space-y-2">
            {participations.map(p => {
              const m = p.market_events
              const schedule = scheduleLabel(m.description)
              return (
                <div key={p.id} className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/mercatini/eventi/${m.id}`}
                      className="text-[13px] font-semibold text-espresso hover:text-sienna transition-colors block truncate"
                    >
                      {m.name}
                    </Link>
                    <p className="text-[11px] text-muted flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={9} /> {m.city}, {m.region}</span>
                      {schedule && (
                        <span className="text-[10px] bg-cream border border-border px-1.5 py-0.5 rounded-full">
                          {schedule}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={removing === p.id}
                    className="flex-shrink-0 p-1.5 text-muted/60 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={`Rimuovi ${m.name}`}
                  >
                    {removing === p.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <X size={14} />
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
