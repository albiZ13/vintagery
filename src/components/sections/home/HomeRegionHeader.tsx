'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navigation, Calendar, Loader2, MapPin, ArrowRight, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { REGION_CONFIG, AREA_LABELS, AREA_ORDER, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'
import { ITALIAN_REGIONS } from '@/types'

function greeting(name?: string | null): string {
  const h = new Date().getHours()
  const g = h >= 18 || h < 3 ? 'Buonasera' : h < 12 ? 'Buongiorno' : 'Buon pomeriggio'
  return name ? `${g}, ${name}.` : `${g}.`
}

interface Props {
  userId: string
  displayName?: string | null
  initialRegion?: string | null
  cta?: { href: string; label: string } | null
}

export default function HomeRegionHeader({
  userId,
  displayName,
  initialRegion,
  cta = { href: '/mercatini', label: 'Calendario completo' },
}: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [region,  setRegion]  = useState<string | null>(initialRegion ?? null)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [geoLoad, setGeoLoad] = useState(false)
  const [ready,   setReady]   = useState(false)
  const [search,  setSearch]  = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef  = useRef<HTMLButtonElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!modal) { setSearch(''); return }
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => searchRef.current?.focus())
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setModal(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [modal])

  function openModal() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 300) })
    }
    setModal(true)
  }

  const config   = region ? (REGION_CONFIG[region] ?? DEFAULT_CONFIG) : DEFAULT_CONFIG
  const gradient = `linear-gradient(135deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 100%)`
  const pattern  = region ? AREA_PATTERNS[config.area] : AREA_PATTERNS['default']

  const q = search.trim().toLowerCase()
  const grouped = AREA_ORDER.map(area => ({
    area,
    label: AREA_LABELS[area],
    regions: Object.entries(REGION_CONFIG)
      .filter(([name, c]) => c.area === area && (!q || name.toLowerCase().includes(q)))
      .map(([name]) => name)
      .sort(),
  })).filter(g => g.regions.length > 0)

  async function selectRegion(r: string | null) {
    setModal(false)
    setSaving(true)
    setRegion(r)
    if (userId) await supabase.from('profiles').update({ region: r }).eq('id', userId)
    setSaving(false)
    router.refresh()
  }

  async function detectRegion() {
    if (!navigator.geolocation) return
    setGeoLoad(true)
    setModal(false)
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
            if (match) { await selectRegion(match); return }
          }
        } catch {}
        setGeoLoad(false)
      },
      () => setGeoLoad(false),
      { timeout: 8000 }
    )
  }

  return (
    <>
      {/* ── BANNER ────────────────────────────────────────── */}
      <section
        className="relative border-b border-black/10 transition-[background] duration-700"
        style={{ background: gradient }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: pattern, opacity: 0.04 }}
        />

        <div className="relative max-w-5xl mx-auto px-4">

          {/* No region */}
          {!region && (
            <div className={`py-14 md:py-20 transition-all duration-500 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <p suppressHydrationWarning className="text-[10px] font-bold tracking-[0.3em] uppercase text-parchment/30 mb-5 capitalize">
                {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </p>
              <h1 suppressHydrationWarning className="font-serif font-bold text-parchment leading-tight mb-3" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 2.8rem)' }}>
                {greeting(displayName)}
              </h1>
              <p className="text-parchment/45 text-[15px] leading-relaxed mb-10 max-w-md">
                Seleziona la tua regione per scoprire mercatini e negozi vintage vicino a te.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  ref={triggerRef}
                  onClick={openModal}
                  className="group inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-[15px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                  style={{
                    background:   'rgba(255,255,255,0.12)',
                    border:       '1px solid rgba(255,255,255,0.22)',
                    color:        '#FAF6F0',
                    backdropFilter: 'blur(8px)',
                    boxShadow:    '0 4px 24px rgba(0,0,0,0.18)',
                  }}
                >
                  <MapPin size={17} className="text-parchment/60 group-hover:text-parchment/90 transition-colors" />
                  Scegli la tua regione
                  <ArrowRight size={15} className="text-parchment/40 group-hover:text-parchment/70 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={detectRegion}
                  disabled={geoLoad}
                  className="inline-flex items-center gap-2 text-parchment/45 hover:text-parchment/75 text-[13px] font-medium transition-colors disabled:opacity-40"
                >
                  {geoLoad ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  Rileva automaticamente
                </button>
              </div>

              <button onClick={() => selectRegion(null)} className="text-parchment/22 hover:text-parchment/42 text-[12px] mt-6 block transition-colors">
                Continua senza filtri →
              </button>
            </div>
          )}

          {/* Region selected */}
          {region && (
            <div key={region} className="py-10 md:py-14 flex flex-col sm:flex-row items-start justify-between gap-6 anim-scale-in">
              <div className="min-w-0">
                <h1 className="font-serif font-bold leading-none mb-3 anim-fade-up anim-d1"
                  style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', color: config.accent }}>
                  {region}
                </h1>
                <div className="h-[2px] rounded-full mb-4 anim-fade-up anim-d2"
                  style={{ width: '40px', background: config.accent, opacity: 0.7 }} />
                <p suppressHydrationWarning className="font-serif font-semibold text-parchment leading-snug mb-1.5 anim-fade-up anim-d3"
                  style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.35rem)' }}>
                  {greeting(displayName)}
                </p>
                <p className="text-parchment/40 text-[13px] anim-fade-up anim-d4">{config.tagline}</p>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0 self-start pt-1 anim-fade-up anim-d2">
                {saving ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 text-parchment/40 text-[13px]">
                    <Loader2 size={13} className="animate-spin" /> Salvataggio…
                  </span>
                ) : (
                  <button
                    ref={triggerRef}
                    onClick={openModal}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/35 text-parchment/70 hover:text-parchment rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all"
                  >
                    <MapPin size={13} /> Cambia regione
                  </button>
                )}
                {cta && (
                  <Link href={cta.href}
                    className="inline-flex items-center gap-1.5 bg-white/14 hover:bg-white/22 border border-white/20 text-parchment font-semibold rounded-xl px-4 py-2.5 text-[13px] transition-all">
                    <Calendar size={13} /> {cta.label}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── REGION PICKER DROPDOWN ───────────────────────── */}
      {modal && (
        <>
          <div
            className="fixed inset-0 z-[199]"
            onClick={() => setModal(false)}
          />

          <div
            className="fixed z-[200] flex flex-col anim-sheet-up overflow-hidden"
            style={{
              top:          dropPos.top,
              left:         dropPos.left,
              width:        dropPos.width,
              maxWidth:     'calc(100vw - 32px)',
              maxHeight:    '72vh',
              background:   '#ffffff',
              borderRadius: '14px',
              boxShadow:    '0 0 0 1px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* Search */}
            <div
              className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-3"
              style={{ borderBottom: '1px solid #f0ece6' }}
            >
              <Search size={13} style={{ color: '#8b8074', flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca regione…"
                className="flex-1 bg-transparent outline-none text-[13px]"
                style={{ color: '#2C1810' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="transition-colors"
                  style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, color: '#8b8074' }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick actions */}
            {!search && (
              <div
                className="flex-shrink-0 flex gap-2 px-3 py-2.5"
                style={{ borderBottom: '1px solid #f0ece6' }}
              >
                <button
                  onClick={detectRegion}
                  disabled={geoLoad}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-medium transition-all disabled:opacity-40"
                  style={{ background: '#f7f4f0', color: '#8b8074', border: '1px solid #e2d8cc' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0ece6'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f7f4f0'}
                >
                  {geoLoad ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                  Rileva posizione
                </button>
                <button
                  onClick={() => selectRegion(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11.5px] font-medium transition-all"
                  style={{ background: '#f7f4f0', color: '#8b8074', border: '1px solid #e2d8cc' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0ece6'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f7f4f0'}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>🇮🇹</span>
                  Tutta Italia
                </button>
              </div>
            )}

            {/* Region list */}
            <div className="overflow-y-auto flex-1 py-1.5">
              {grouped.length === 0 && (
                <p className="text-center py-8 text-[12px]" style={{ color: '#8b8074' }}>
                  Nessuna regione trovata
                </p>
              )}
              {grouped.map(({ area, label, regions: rs }) => (
                <div key={area}>
                  {!q && (
                    <p
                      className="px-4 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.28em]"
                      style={{ color: '#c8bdb4' }}
                    >
                      {label}
                    </p>
                  )}
                  {rs.map(r => {
                    const cfg = REGION_CONFIG[r]
                    const isSelected = r === region
                    return (
                      <button
                        key={r}
                        onClick={() => selectRegion(r)}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-left group transition-colors duration-75"
                        style={{ background: isSelected ? `${cfg?.accent}14` : 'transparent' }}
                        onMouseEnter={e => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#faf6f0'
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        {/* Gradient swatch */}
                        <div
                          className="w-[22px] h-[22px] rounded-md flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${cfg?.gradient[0]} 0%, ${cfg?.gradient[1]} 100%)`,
                            boxShadow: isSelected
                              ? `0 0 0 1.5px ${cfg?.accent}, 0 2px 6px rgba(0,0,0,0.18)`
                              : '0 1px 3px rgba(0,0,0,0.25)',
                          }}
                        />

                        {/* Name */}
                        <span
                          className="flex-1 text-[13px] leading-tight font-medium"
                          style={{ color: isSelected ? cfg?.accent : '#4a4540' }}
                        >
                          {r}
                        </span>

                        {/* Tagline on hover / check on selected */}
                        {isSelected ? (
                          <svg width="11" height="8" viewBox="0 0 11 8" fill="none" className="flex-shrink-0">
                            <path d="M1 4l2.8 2.8L10 1" stroke={cfg?.accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <span
                            className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex-shrink-0 hidden sm:block"
                            style={{ color: '#c8bdb4' }}
                          >
                            {cfg?.tagline}
                          </span>
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
    </>
  )
}
