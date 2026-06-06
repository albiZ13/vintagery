'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Navigation, Search, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { REGION_CONFIG, AREA_LABELS, AREA_ORDER } from '@/lib/regions-config'
import { ITALIAN_REGIONS } from '@/types'

interface Props {
  value: string   // 'all' o nome regione
  month: number
  year: number
}

export default function RegionDropdown({ value, month, year }: Props) {
  const router      = useRouter()
  const triggerRef  = useRef<HTMLButtonElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)
  const [open,      setOpen]      = useState(false)
  const [search,    setSearch]    = useState('')
  const [geoLoad,   setGeoLoad]   = useState(false)
  const [userRegion, setUserRegion] = useState<string | null | undefined>(undefined)

  // Legge la regione salvata nel profilo
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUserRegion(null); return }
      const { data } = await supabase
        .from('profiles').select('region').eq('id', user.id).single()
      setUserRegion(data?.region ?? null)
    })
  }, [])

  useEffect(() => {
    if (!open) { setSearch(''); return }
    requestAnimationFrame(() => searchRef.current?.focus())
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function navigate(region: string) {
    setOpen(false)
    const params = new URLSearchParams({ month: String(month), year: String(year), region })
    router.push(`/mercatini?${params}`)
  }

  async function detectGeo() {
    if (!navigator.geolocation) return
    setGeoLoad(true)
    setOpen(false)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=it`,
            { headers: { 'User-Agent': 'Vintagery/1.0' } }
          )
          const data = await res.json()
          const state = data.address?.state as string | undefined
          if (state) {
            const match = ITALIAN_REGIONS.find(r =>
              r.toLowerCase() === state.toLowerCase() ||
              state.toLowerCase().includes(r.toLowerCase()) ||
              r.toLowerCase().includes(state.toLowerCase())
            )
            if (match) { navigate(match); setGeoLoad(false); return }
          }
        } catch {}
        setGeoLoad(false)
      },
      () => setGeoLoad(false),
      { timeout: 8000 }
    )
  }

  const q       = search.trim().toLowerCase()
  const grouped = AREA_ORDER.map(area => ({
    area,
    label:   AREA_LABELS[area],
    regions: Object.entries(REGION_CONFIG)
      .filter(([name, c]) => c.area === area && (!q || name.toLowerCase().includes(q)))
      .map(([name]) => name)
      .sort(),
  })).filter(g => g.regions.length > 0)

  const isFiltered  = value !== 'all'
  const showProfile = userRegion && userRegion !== value

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
          isFiltered
            ? 'bg-sienna text-parchment border-sienna'
            : 'bg-white text-coffee border-border hover:border-sienna hover:text-sienna'
        }`}
      >
        {geoLoad
          ? <Loader2 size={11} className="animate-spin" />
          : <MapPin size={11} />
        }
        {isFiltered ? value : 'Tutte le regioni'}
        {isFiltered && (
          <span
            role="button"
            aria-label="Rimuovi filtro regione"
            onClick={e => { e.stopPropagation(); navigate('all') }}
            className="ml-0.5 opacity-70 hover:opacity-100 leading-none"
          >
            <X size={10} />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full mt-1.5 left-0 z-50 w-64 bg-white rounded-xl border border-border overflow-hidden flex flex-col"
            style={{ boxShadow: '0 8px 32px rgba(28,46,74,0.14)', maxHeight: '70vh' }}
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 flex-shrink-0">
              <Search size={12} className="text-muted flex-shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca regione…"
                className="flex-1 bg-transparent outline-none text-[12px] text-espresso placeholder:text-muted/50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-muted hover:text-espresso">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick actions */}
            {!search && (
              <div className="flex gap-1.5 px-2.5 py-2 border-b border-border/60 flex-shrink-0">
                <button
                  onClick={detectGeo}
                  disabled={geoLoad}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted bg-cream hover:bg-border/60 rounded-lg py-1.5 transition-colors disabled:opacity-40"
                >
                  {geoLoad ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                  Rileva
                </button>
                {showProfile && (
                  <button
                    onClick={() => navigate(userRegion!)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-sienna bg-sienna/8 hover:bg-sienna/15 rounded-lg py-1.5 transition-colors"
                  >
                    <MapPin size={11} />
                    {userRegion}
                  </button>
                )}
                {isFiltered && (
                  <button
                    onClick={() => navigate('all')}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted bg-cream hover:bg-border/60 rounded-lg py-1.5 transition-colors"
                  >
                    <X size={11} />
                    Tutte
                  </button>
                )}
              </div>
            )}

            {/* Region list */}
            <div className="overflow-y-auto flex-1 py-1">
              {grouped.map(({ area, label, regions: rs }) => (
                <div key={area}>
                  {!q && (
                    <p className="px-3 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-[0.28em] text-muted/40">
                      {label}
                    </p>
                  )}
                  {rs.map(r => {
                    const cfg = REGION_CONFIG[r]
                    return (
                      <button
                        key={r}
                        onClick={() => navigate(r)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                          r === value
                            ? 'bg-sienna/10 text-sienna font-semibold'
                            : 'text-espresso hover:bg-cream'
                        }`}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${cfg?.gradient[0]}, ${cfg?.gradient[1]})` }}
                        />
                        <span className="flex-1 text-[12px]">{r}</span>
                        {r === value && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="flex-shrink-0">
                            <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
              <div className="h-2" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
