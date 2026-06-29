'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface Props {
  defaultQuery?: string
  month: number
  year: number
  region: string
  type?: string
}

export default function MercatiniSearch({ defaultQuery = '', month, year, region, type }: Props) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState(defaultQuery)

  function buildUrl(query: string) {
    const params = new URLSearchParams()
    params.set('month', String(month))
    params.set('year', String(year))
    if (region !== 'all') params.set('region', region)
    if (type && type !== 'all') params.set('type', type)
    if (query.trim()) params.set('q', query.trim())
    return `/mercatini?${params}`
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl(q))
  }

  function clear() {
    setQ('')
    router.push(buildUrl(''))
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Cerca mercatino o città"
      className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 focus-within:border-sienna/50 transition-colors"
    >
      <Search size={13} className="text-muted flex-shrink-0" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Cerca mercatino o città…"
        autoComplete="off"
        className="flex-1 bg-transparent text-[13px] text-espresso placeholder:text-muted/50 focus:outline-none min-w-0"
      />
      {q && (
        <button
          type="button"
          onClick={clear}
          aria-label="Cancella ricerca"
          className="text-muted/60 hover:text-espresso transition-colors flex-shrink-0"
        >
          <X size={13} />
        </button>
      )}
    </form>
  )
}
