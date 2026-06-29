'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, MapPin, Clock, ArrowRight, Navigation, ExternalLink, Star, Calendar } from 'lucide-react'
import { FREQ_LABEL } from '@/lib/cadenza'
import type { Market } from '@/types'

// ── Gradienti 3-stop per regione ──────────────────────────────────────────────
const REGION_GRADIENT: Record<string, string> = {
  'Lombardia':             'linear-gradient(145deg, #0B1D35 0%, #163055 55%, #1E3D6A 100%)',
  'Lazio':                 'linear-gradient(145deg, #28080A 0%, #481215 55%, #621820 100%)',
  'Toscana':               'linear-gradient(145deg, #1A1804 0%, #2C2908 55%, #3E3C0E 100%)',
  'Veneto':                'linear-gradient(145deg, #061628 0%, #0D2540 55%, #143255 100%)',
  'Piemonte':              'linear-gradient(145deg, #180923 0%, #2A103D 55%, #3B1652 100%)',
  'Campania':              'linear-gradient(145deg, #061226 0%, #0C1C3E 55%, #132652 100%)',
  'Sicilia':               'linear-gradient(145deg, #241300 0%, #3C2200 55%, #553200 100%)',
  'Emilia-Romagna':        'linear-gradient(145deg, #06180A 0%, #0E2810 55%, #163818 100%)',
  'Puglia':                'linear-gradient(145deg, #06101E 0%, #0C1C35 55%, #12274A 100%)',
  'Liguria':               'linear-gradient(145deg, #04161E 0%, #082232 55%, #0E3040 100%)',
  'Abruzzo':               'linear-gradient(145deg, #0E1906 0%, #1A2A0C 55%, #243B12 100%)',
  'Calabria':              'linear-gradient(145deg, #1E0808 0%, #341010 55%, #481818 100%)',
  'Sardegna':              'linear-gradient(145deg, #061C14 0%, #0C2C20 55%, #123C2C 100%)',
  'Marche':                'linear-gradient(145deg, #081226 0%, #101C3C 55%, #182650 100%)',
  'Umbria':                'linear-gradient(145deg, #160E24 0%, #24163C 55%, #321E52 100%)',
  'Friuli-Venezia Giulia': 'linear-gradient(145deg, #081820 0%, #102834 55%, #183845 100%)',
  'Trentino-Alto Adige':   'linear-gradient(145deg, #06161E 0%, #0E2430 55%, #143240 100%)',
  'Molise':                'linear-gradient(145deg, #121806 0%, #1E2810 55%, #2A3818 100%)',
  'Basilicata':            'linear-gradient(145deg, #1A0E04 0%, #2C1808 55%, #40240E 100%)',
  "Valle d'Aosta":         'linear-gradient(145deg, #081618 0%, #102428 55%, #163235 100%)',
}

const DEFAULT_GRADIENT = 'linear-gradient(145deg, #0F2040 0%, #1C3560 55%, #24408A 100%)'

const ITALIAN_REGIONS_ORDERED = [
  'Lombardia', 'Lazio', 'Toscana', 'Veneto', 'Emilia-Romagna',
  'Piemonte', 'Campania', 'Sicilia', 'Puglia', 'Liguria',
  'Marche', 'Sardegna', 'Abruzzo', 'Umbria', 'Friuli-Venezia Giulia',
  'Trentino-Alto Adige', 'Calabria', 'Basilicata', 'Molise', "Valle d'Aosta",
]

const MONTHS_IT  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const DAYS_IT    = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
const DAYS_FULL  = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`
}
function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
}

function mapsUrl(market: Market): string {
  if (market.lat && market.lng) return `https://maps.google.com/?q=${market.lat},${market.lng}`
  const q = [market.name, market.address, market.city].filter(Boolean).join(', ')
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`
}

interface Props {
  regionMarkets: Record<string, Market | null>
}

export default function HomeWeeklyMap({ regionMarkets }: Props) {
  const [selected, setSelected]   = useState<Market | null>(null)
  const [mounted,  setMounted]    = useState(false)
  const [visible,  setVisible]    = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const activeCount = ITALIAN_REGIONS_ORDERED.filter(r => regionMarkets[r]).length
  const gridRef = useRef<HTMLDivElement>(null)

  // Stagger scroll-triggered per le card della griglia
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const cards = Array.from(grid.querySelectorAll('[data-region-card]')) as HTMLElement[]
    cards.forEach(c => { c.style.opacity = '0' })

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        cards.forEach((card, i) => {
          card.animate(
            [
              { opacity: 0, transform: 'translateY(22px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 480, delay: i * 35, easing: 'cubic-bezier(0.22,0.68,0,1.2)', fill: 'both' }
          )
        })
        io.unobserve(grid)
      },
      { threshold: 0.04, rootMargin: '0px 0px -16px 0px' }
    )
    io.observe(grid)
    return () => io.disconnect()
  }, [])

  // double-rAF trick: first render sets DOM, second enables CSS transition
  const openSheet = useCallback((market: Market) => {
    setSelected(market)
    setMounted(true)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    )
    document.body.style.overflow = 'hidden'
  }, [])

  const closeSheet = useCallback(() => {
    setVisible(false)
    document.body.style.overflow = ''
    setTimeout(() => { setMounted(false); setSelected(null) }, 340)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSheet])

  // swipe-down to close
  useEffect(() => {
    const el = sheetRef.current
    if (!el || !mounted) return
    let startY = 0
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onEnd   = (e: TouchEvent) => {
      if (e.changedTouches[0].clientY - startY > 80) closeSheet()
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [mounted, closeSheet])

  return (
    <>
      {/* ── Section header ── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sienna mb-1">
            Italia questa settimana
          </p>
          <h2
            className="font-serif font-bold text-espresso leading-tight"
            style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}
          >
            Mercatini nelle 20 regioni
          </h2>
          {activeCount > 0 && (
            <p className="text-[12px] text-muted mt-1">
              {activeCount} region{activeCount === 1 ? 'e' : 'i'} con appuntamenti nei prossimi giorni
            </p>
          )}
        </div>
        <Link
          href="/mercatini"
          className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-semibold text-sienna hover:text-espresso transition-colors shrink-0 ml-4"
        >
          Tutti <ArrowRight size={11} />
        </Link>
      </div>

      {/* ── Region grid ── */}
      <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ITALIAN_REGIONS_ORDERED.map((region, i) => {
          const market   = regionMarkets[region] ?? null
          const gradient = REGION_GRADIENT[region] ?? DEFAULT_GRADIENT
          const active   = Boolean(market)

          return (
            <button
              key={region}
              data-region-card
              onClick={() => market && openSheet(market)}
              disabled={!active}
              className={[
                'group relative rounded-2xl overflow-hidden text-left',
                active
                  ? 'cursor-pointer hover:scale-[1.025] hover:shadow-xl hover:shadow-black/25 active:scale-[0.98] transition-all duration-300'
                  : 'opacity-35 cursor-default',
              ].join(' ')}
            >
              {/* Gradient bg */}
              <div className="absolute inset-0" style={{ background: gradient }} />

              {/* Shimmer on hover (active only) */}
              {active && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(196,160,48,0.08) 0%, transparent 60%)' }} />
              )}

              {/* City watermark */}
              {market && (
                <div className="absolute inset-0 flex items-end justify-end p-2 select-none pointer-events-none overflow-hidden" aria-hidden>
                  <span
                    className="font-serif font-black text-white uppercase leading-none"
                    style={{ fontSize: 'clamp(2.2rem,7vw,4rem)', opacity: 0.045, letterSpacing: '-0.02em' }}
                  >
                    {market.city.split(' ')[0]}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="relative flex flex-col p-3.5 sm:p-4" style={{ minHeight: '116px' }}>
                <p className="text-[9.5px] font-black tracking-[0.25em] uppercase text-white/35 leading-none">
                  {region}
                </p>

                {market ? (
                  <div className="mt-auto pt-3">
                    <p className="font-serif font-bold text-white leading-tight line-clamp-2 text-[13px] sm:text-[14px] group-hover:text-gold transition-colors duration-250">
                      {market.name}
                    </p>
                    <div className="flex items-end justify-between mt-2 gap-2">
                      <p className="text-[10px] text-white/45 flex items-center gap-0.5 min-w-0 truncate">
                        <MapPin size={8} className="shrink-0" />
                        {market.city}
                      </p>
                      {market.next_date && (
                        <span className="shrink-0 text-[9px] font-bold text-gold bg-gold/12 border border-gold/25 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                          {formatDateShort(market.next_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-auto pt-3 text-[11px] text-white/20">Nessun appuntamento</p>
                )}
              </div>

              {/* Bottom gold line */}
              {active && (
                <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Sheet portal ─────────────────────────────────────────────────── */}
      {mounted && selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-espresso/55 backdrop-blur-[3px]"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 220ms ease',
            }}
            onClick={closeSheet}
            aria-hidden
          />

          {/* Sheet wrapper — centers on desktop, bottom-sheet on mobile */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 pointer-events-none">
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={selected.name}
              className="pointer-events-auto w-full sm:max-w-lg bg-parchment rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] sm:max-h-[85vh] flex flex-col"
              style={{
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(100%) scale(1)',
                opacity:   visible ? 1 : 0,
                transition: 'transform 340ms cubic-bezier(0.22,0.68,0,1.2), opacity 220ms ease',
                willChange: 'transform, opacity',
              }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-0 shrink-0 sm:hidden">
                <div className="w-9 h-[3px] rounded-full bg-espresso/15" />
              </div>

              {/* Hero image */}
              <div className="relative mx-3 mt-3 sm:mx-4 sm:mt-4 rounded-2xl overflow-hidden shrink-0" style={{ height: '200px' }}>
                {selected.image_url ? (
                  <Image
                    src={selected.image_url}
                    alt={selected.name}
                    fill
                    sizes="(max-width:640px) 100vw, 512px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: REGION_GRADIENT[selected.region] ?? DEFAULT_GRADIENT }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/85 via-espresso/25 to-transparent" />

                {/* Overlay content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {selected.next_date && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-espresso bg-gold rounded-full px-3 py-1 mb-2.5">
                      <Calendar size={9} />
                      {formatDateFull(selected.next_date)}
                    </span>
                  )}
                  <h2 className="font-serif font-bold text-parchment leading-tight" style={{ fontSize: 'clamp(1.2rem,4vw,1.6rem)' }}>
                    {selected.name}
                  </h2>
                  <p className="text-parchment/55 text-[12px] mt-1 flex items-center gap-1">
                    <MapPin size={10} className="shrink-0" />
                    {selected.city}, {selected.region}
                  </p>
                </div>

                {/* Close */}
                <button
                  onClick={closeSheet}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-espresso/50 backdrop-blur-sm flex items-center justify-center text-parchment/80 hover:text-parchment hover:bg-espresso/70 transition-all"
                  aria-label="Chiudi"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-4 space-y-4">

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {selected.frequency && FREQ_LABEL[selected.frequency] && (
                    <span className="text-[11px] font-semibold text-espresso bg-surface-soft border border-border rounded-full px-3 py-1">
                      {FREQ_LABEL[selected.frequency]}
                    </span>
                  )}
                  {selected.start_time && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-espresso bg-surface-soft border border-border rounded-full px-3 py-1">
                      <Clock size={10} />
                      {selected.start_time}{selected.end_time ? ` – ${selected.end_time}` : ''}
                    </span>
                  )}
                  {(selected.avg_rating ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold bg-gold/10 border border-gold/25 rounded-full px-3 py-1">
                      <Star size={10} className="fill-gold" />
                      {selected.avg_rating!.toFixed(1)}
                      <span className="text-muted font-normal">({selected.review_count})</span>
                    </span>
                  )}
                </div>

                {/* Schedule / description */}
                {selected.schedule_notes && (
                  <p className="text-[13px] text-muted leading-relaxed">
                    {selected.schedule_notes}
                  </p>
                )}
                {!selected.schedule_notes && selected.description && (
                  <p className="text-[13px] text-muted leading-relaxed line-clamp-3">
                    {selected.description}
                  </p>
                )}

                {/* ── Come raggiungerlo ── */}
                <div className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Navigation size={12} className="text-sienna shrink-0" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted/70">
                      Come raggiungerlo
                    </p>
                  </div>
                  <div className="px-4 py-4 space-y-3">

                    {/* Address */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sienna/8 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin size={13} className="text-sienna" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-espresso leading-snug">
                          {selected.address ?? selected.city}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">{selected.city}, {selected.region}</p>
                      </div>
                    </div>

                    {/* Google Maps CTA */}
                    <a
                      href={mapsUrl(selected)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 w-full bg-espresso text-parchment rounded-xl px-4 py-3 text-[13px] font-semibold hover:bg-coffee transition-colors duration-200"
                    >
                      <Navigation size={14} className="shrink-0" />
                      Apri in Google Maps
                      <ExternalLink size={11} className="ml-auto opacity-40" />
                    </a>

                    {/* Tips */}
                    {selected.tips && (
                      <div className="bg-cream rounded-xl px-3.5 py-3 text-[12px] text-muted leading-relaxed border border-border">
                        <span className="font-semibold text-espresso">Consiglio: </span>
                        {selected.tips}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA principale */}
                <Link
                  href={`/mercatini/${selected.id}`}
                  onClick={closeSheet}
                  className="flex items-center justify-center gap-2 w-full bg-sienna text-parchment rounded-xl py-3.5 text-[14px] font-bold hover:bg-rust transition-colors duration-200"
                >
                  Vai alla scheda completa
                  <ArrowRight size={14} />
                </Link>

                {/* safe-area padding */}
                <div className="h-2 sm:h-1" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
