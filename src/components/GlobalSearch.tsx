'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Store, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Result {
  id: string
  name: string
  city: string
  type: 'market' | 'shop'
}

export default function GlobalSearch() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router      = useRouter()

  // Chiudi su click esterno o ESC
  useEffect(() => {
    function onMouse(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
      // Cmd+K / Ctrl+K apre la search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown',   onKey)
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey) }
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const [{ data: markets }, { data: shops }] = await Promise.all([
      supabase.from('markets').select('id,name,city').ilike('name', `%${q}%`).limit(4),
      supabase.from('shops').select('id,name,city').ilike('name', `%${q}%`).limit(4),
    ])
    const combined: Result[] = [
      ...(markets ?? []).map(m => ({ ...m, type: 'market' as const })),
      ...(shops   ?? []).map(s => ({ ...s, type: 'shop'   as const })),
    ]
    setResults(combined)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const dest = results[0]
      ? (results[0].type === 'market' ? `/mercatini/${results[0].id}` : `/negozi/${results[0].id}`)
      : `/negozi?q=${encodeURIComponent(query)}`
    handleSelect(dest)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50) }}
        aria-label="Cerca mercatini e negozi"
        aria-expanded={open}
        aria-controls="global-search-panel"
        className="flex items-center gap-2 text-coffee hover:text-sienna transition-colors px-2 py-1.5 rounded-lg hover:bg-cream"
      >
        <Search size={16} />
        <span className="hidden lg:inline text-[12px] text-muted font-medium">Cerca</span>
        <kbd className="hidden lg:inline text-[10px] font-mono bg-cream border border-border px-1.5 py-0.5 rounded text-muted">⌘K</kbd>
      </button>

      {/* Panel */}
      {open && (
        <div
          id="global-search-panel"
          role="dialog"
          aria-label="Ricerca globale"
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-2xl shadow-[0_8px_32px_rgba(28,46,74,0.14)] overflow-hidden z-50"
        >
          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Search size={14} className="text-muted flex-shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Mercatini, negozi, città..."
              aria-label="Cerca mercatini e negozi"
              autoComplete="off"
              className="flex-1 text-[13px] text-espresso placeholder:text-muted focus:outline-none bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
                aria-label="Cancella ricerca"
                className="text-muted hover:text-espresso"
              >
                <X size={13} />
              </button>
            )}
          </form>

          {/* Results */}
          <div role="listbox" aria-label="Risultati ricerca">
            {loading && (
              <div className="px-4 py-3 text-[12px] text-muted">Ricerca in corso…</div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-3 text-[12px] text-muted">Nessun risultato per "{query}"</div>
            )}

            {!loading && results.map(r => {
              const href = r.type === 'market' ? `/mercatini/${r.id}` : `/negozi/${r.id}`
              return (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={href}
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(href)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-cream border border-border flex items-center justify-center flex-shrink-0">
                    {r.type === 'market'
                      ? <MapPin size={13} className="text-sienna" />
                      : <Store   size={13} className="text-coffee" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-espresso truncate">{r.name}</p>
                    <p className="text-[11px] text-muted">{r.city} · {r.type === 'market' ? 'Mercatino' : 'Negozio'}</p>
                  </div>
                </Link>
              )
            })}

            {/* Footer links */}
            {query.length >= 2 && !loading && (
              <div className="border-t border-border px-4 py-2 flex gap-3">
                <Link href={`/mercatini`} onClick={() => setOpen(false)}
                  className="text-[11px] text-sienna hover:underline">
                  Tutti i mercatini →
                </Link>
                <Link href={`/negozi?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)}
                  className="text-[11px] text-sienna hover:underline">
                  Cerca nei negozi →
                </Link>
              </div>
            )}

            {!query && (
              <div className="px-4 py-3 text-[11px] text-muted">
                Digita per cercare mercatini e negozi vintage
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
