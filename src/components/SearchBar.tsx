'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'

interface Props {
  placeholder?: string
  defaultQuery?: string
  defaultCity?: string
  basePath: string
}

export default function SearchBar({ placeholder = 'Cerca...', defaultQuery = '', defaultCity = '', basePath }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultQuery)
  const [city, setCity]   = useState(defaultCity)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (city)  params.set('city', city)
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <form
      role="search"
      aria-label="Cerca negozi"
      onSubmit={submit}
      className="flex items-stretch bg-white rounded-pill shadow-card border border-border overflow-hidden max-w-2xl w-full"
    >
      {/* Testo libero */}
      <div className="flex-1 flex items-center gap-2 px-5 py-3.5 border-r border-border">
        <Search size={16} className="text-muted flex-shrink-0" aria-hidden />
        <label htmlFor="search-query" className="sr-only">Nome negozio</label>
        <input
          id="search-query"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-transparent text-body-sm text-espresso placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* Città */}
      <div className="flex items-center gap-2 px-5 py-3.5 min-w-[130px]">
        <MapPin size={15} className="text-muted flex-shrink-0" aria-hidden />
        <label htmlFor="search-city" className="sr-only">Città</label>
        <input
          id="search-city"
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Città"
          autoComplete="address-level2"
          className="w-full bg-transparent text-body-sm text-espresso placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        aria-label="Avvia ricerca"
        className="bg-sienna text-parchment px-6 font-medium text-body-sm hover:bg-coffee transition-colors"
      >
        Cerca
      </button>
    </form>
  )
}
