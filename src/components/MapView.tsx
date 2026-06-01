'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Store, Map, Crosshair, Loader2, ChevronDown } from 'lucide-react'
import type { Market, Shop } from '@/types'
import type * as LeafletType from 'leaflet'

interface Props {
  markets: Market[]
  shops: Shop[]
}

type FilterType = 'all' | 'markets' | 'shops'

const SIENNA = '#8B4513'
const GOLD   = '#C9913A'

function makeIcon(L: typeof LeafletType, color: string, letter: string): LeafletType.DivIcon {
  const shadow = 'drop-shadow(0 3px 6px rgba(0,0,0,0.28))'
  return L.divIcon({
    className: '',
    html: `
      <div style="filter:${shadow};width:36px;height:44px;position:relative;cursor:pointer">
        <svg viewBox="0 0 36 44" width="36" height="44" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 26 14 26S32 26 32 16c0-7.732-6.268-14-14-14z"
            fill="${color}" stroke="white" stroke-width="2.5"/>
        </svg>
        <span style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:13px;font-weight:700;color:white;line-height:1;font-family:serif">${letter}</span>
      </div>`,
    iconSize:    [36, 44],
    iconAnchor:  [18, 44],
    popupAnchor: [0, -46],
  })
}

function starsHtml(rating: number | null) {
  if (!rating) return ''
  const full = Math.round(rating)
  return Array(5).fill(0).map((_, i) =>
    `<span style="color:${i < full ? '#C9913A' : '#D6C8BC'}">★</span>`
  ).join('')
}

function popupHtml(item: Market | Shop, type: 'market' | 'shop') {
  const color  = type === 'market' ? SIENNA : GOLD
  const href   = type === 'market' ? `/mercatini/${item.id}` : `/negozi/${item.id}`
  const badge  = item.is_verified ? `<span style="background:${color}20;color:${color};font-size:10px;font-weight:600;padding:1px 6px;border-radius:99px;margin-left:4px">✓ verificato</span>` : ''
  const rating = item.avg_rating
    ? `<div style="margin:4px 0 2px">${starsHtml(item.avg_rating)} <span style="color:#9B8B7A;font-size:11px">${Number(item.avg_rating).toFixed(1)} (${item.review_count ?? 0})</span></div>`
    : ''
  const extra = type === 'market' && 'frequency' in item && item.frequency
    ? `<div style="color:#9B8B7A;font-size:11px;margin-top:2px">📅 ${item.frequency}</div>`
    : ''

  return `
    <div style="font-family:Georgia,serif;min-width:180px;max-width:220px;padding:4px 2px">
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
        <span style="font-weight:700;font-size:14px;color:#2D1F14">${item.name}</span>${badge}
      </div>
      <div style="color:#9B8B7A;font-size:12px;margin-top:3px">${item.city}, ${item.region}</div>
      ${rating}${extra}
      <div style="margin-top:10px;border-top:1px solid #EDE8E2;padding-top:8px">
        <a href="${href}" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:${color};text-decoration:none">
          Vedi scheda →
        </a>
      </div>
    </div>`
}

const FREQ_LABELS: Record<string, string> = {
  settimanale: 'Settimanale',
  mensile: 'Mensile',
  occasionale: 'Occasionale',
  annuale: 'Annuale',
}

export default function MapView({ markets, shops }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LeafletType.Map | null>(null)
  const markersRef   = useRef<LeafletType.Marker[]>([])
  const locMarkerRef = useRef<LeafletType.CircleMarker | null>(null)

  const [filter,   setFilter]   = useState<FilterType>('all')
  const [category, setCategory] = useState<string>('all')
  const [freq,     setFreq]     = useState<string>('all')
  const [locating, setLocating] = useState(false)
  const [located,  setLocated]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Categorie disponibili aggregate da markets + shops
  const allCategories = Array.from(new Set([
    ...(markets.flatMap(m => m.categories ?? [])),
    ...(shops.flatMap(s => s.categories ?? [])),
  ])).sort()

  function applyFilters(markets: Market[], shops: Shop[], f: FilterType, cat: string, fr: string) {
    const filteredMarkets = markets.filter(m => {
      if (f === 'shops') return false
      if (cat !== 'all' && !m.categories?.includes(cat)) return false
      if (fr  !== 'all' && m.frequency !== fr) return false
      return true
    })
    const filteredShops = shops.filter(s => {
      if (f === 'markets') return false
      if (cat !== 'all' && !s.categories?.includes(cat)) return false
      return true
    })
    return { filteredMarkets, filteredShops }
  }

  const renderMarkers = useCallback((L: typeof LeafletType, map: LeafletType.Map, f: FilterType, cat: string, fr: string) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const { filteredMarkets, filteredShops } = applyFilters(markets, shops, f, cat, fr)

    filteredMarkets.forEach(m => {
      if (!m.lat || !m.lng) return
      const marker = L.marker([m.lat, m.lng], { icon: makeIcon(L, SIENNA, 'M') })
        .addTo(map)
        .bindPopup(popupHtml(m, 'market'), { maxWidth: 240, className: 'vtg-popup' })
      markersRef.current.push(marker)
    })

    filteredShops.forEach(s => {
      if (!s.lat || !s.lng) return
      const marker = L.marker([s.lat, s.lng], { icon: makeIcon(L, GOLD, 'N') })
        .addTo(map)
        .bindPopup(popupHtml(s, 'shop'), { maxWidth: 240, className: 'vtg-popup' })
      markersRef.current.push(marker)
    })
  }, [markets, shops])

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !containerRef.current) return

    import('leaflet').then(L => {
      if (mapRef.current) return

      const map = L.map(containerRef.current!, {
        center: [42.5, 12.5],
        zoom: 6,
        zoomControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapRef.current = map
      renderMarkers(L, map, 'all', 'all', 'all')
    }).catch(() => setError('Impossibile caricare la mappa. Controlla la connessione.'))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [renderMarkers])

  function refresh(newFilter: FilterType, newCat: string, newFreq: string) {
    if (!mapRef.current) return
    import('leaflet').then(L => renderMarkers(L, mapRef.current!, newFilter, newCat, newFreq))
  }

  function handleFilter(f: FilterType) {
    setFilter(f)
    refresh(f, category, freq)
  }

  function handleCategory(c: string) {
    setCategory(c)
    refresh(filter, c, freq)
  }

  function handleFreq(f: string) {
    setFreq(f)
    refresh(filter, category, f)
  }

  function handleLocate() {
    if (!navigator.geolocation) { setError('Geolocalizzazione non supportata dal browser.'); return }
    if (!mapRef.current) return
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        import('leaflet').then(L => {
          if (locMarkerRef.current) locMarkerRef.current.remove()
          const { latitude: lat, longitude: lng } = pos.coords
          locMarkerRef.current = L.circleMarker([lat, lng], {
            radius: 8, color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 2.5,
          }).addTo(mapRef.current!).bindPopup('Sei qui')
          mapRef.current!.flyTo([lat, lng], 12, { duration: 1.2 })
          setLocated(true)
        })
        setLocating(false)
      },
      () => { setError('Posizione non disponibile o accesso negato.'); setLocating(false) },
      { timeout: 8000 }
    )
  }

  const { filteredMarkets, filteredShops } = applyFilters(markets, shops, filter, category, freq)
  const visible = filteredMarkets.length + filteredShops.length

  const hasActiveFilters = category !== 'all' || freq !== 'all'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar principale */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white border-b border-border flex-shrink-0">
        {/* Toggle tipo */}
        <div className="flex items-center gap-1.5 bg-cream rounded-full p-1">
          {([
            ['all',     'Tutti',     Map    ],
            ['markets', 'Mercatini', MapPin ],
            ['shops',   'Negozi',    Store  ],
          ] as const).map(([val, label, Icon]) => (
            <button key={val} onClick={() => handleFilter(val)}
              aria-pressed={filter === val}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                filter === val ? 'bg-espresso text-parchment shadow-sm' : 'text-coffee hover:text-espresso'
              }`}>
              <Icon size={12} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted ml-1">{visible} location{visible !== 1 ? 's' : ''}</span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Filtri avanzati toggle */}
          <button
            onClick={() => setShowMoreFilters(o => !o)}
            aria-expanded={showMoreFilters}
            aria-controls="map-advanced-filters"
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              hasActiveFilters
                ? 'bg-sienna text-parchment border-sienna'
                : 'bg-white text-coffee border-border hover:border-sienna'
            }`}
          >
            Filtri
            {hasActiveFilters && <span className="w-4 h-4 rounded-full bg-white/30 text-[9px] flex items-center justify-center font-bold">
              {(category !== 'all' ? 1 : 0) + (freq !== 'all' ? 1 : 0)}
            </span>}
            <ChevronDown size={11} className={showMoreFilters ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden />
          </button>

          {/* Legenda */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: SIENNA }} aria-hidden /> M Mercatino
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: GOLD }} aria-hidden /> N Negozio
            </span>
          </div>

          {/* Vicino a me */}
          <button onClick={handleLocate} disabled={locating}
            aria-label={locating ? 'Localizzazione in corso' : 'Mostra location vicino a me'}
            aria-pressed={located}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              located
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-coffee border-border hover:border-sienna hover:text-sienna'
            } disabled:opacity-60`}>
            {locating
              ? <Loader2 size={12} className="animate-spin" aria-hidden />
              : <Crosshair size={12} aria-hidden />}
            {locating ? 'Localizzazione…' : located ? 'Posizione attiva' : 'Vicino a me'}
          </button>
        </div>
      </div>

      {/* Filtri avanzati */}
      {showMoreFilters && (
        <div id="map-advanced-filters" className="px-4 py-3 bg-cream border-b border-border flex flex-wrap gap-3 items-start">
          {/* Categoria */}
          {allCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Categoria</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => handleCategory('all')}
                  aria-pressed={category === 'all'}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    category === 'all' ? 'bg-espresso text-parchment border-espresso' : 'bg-white text-coffee border-border hover:border-sienna'
                  }`}>
                  Tutte
                </button>
                {allCategories.map(c => (
                  <button key={c} onClick={() => handleCategory(c)}
                    aria-pressed={category === c}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      category === c ? 'bg-espresso text-parchment border-espresso' : 'bg-white text-coffee border-border hover:border-sienna'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Frequenza — solo per mercatini */}
          {filter !== 'shops' && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Frequenza</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => handleFreq('all')}
                  aria-pressed={freq === 'all'}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    freq === 'all' ? 'bg-espresso text-parchment border-espresso' : 'bg-white text-coffee border-border hover:border-sienna'
                  }`}>
                  Tutte
                </button>
                {Object.entries(FREQ_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => handleFreq(val)}
                    aria-pressed={freq === val}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      freq === val ? 'bg-espresso text-parchment border-espresso' : 'bg-white text-coffee border-border hover:border-sienna'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => { setCategory('all'); setFreq('all'); refresh(filter, 'all', 'all') }}
              className="text-[11px] text-rust underline self-end pb-0.5"
            >
              Rimuovi filtri
            </button>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="font-medium hover:underline ml-4" aria-label="Chiudi avviso">Chiudi</button>
        </div>
      )}

      {/* Map container */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" role="application" aria-label="Mappa interattiva mercatini e negozi vintage" />

        {visible === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm border border-border rounded-xl px-6 py-4 text-center shadow-card max-w-xs">
              <MapPin size={28} className="text-muted mx-auto mb-2" aria-hidden />
              <p className="font-semibold text-espresso text-sm">Nessuna location con questi filtri</p>
              <p className="text-muted text-xs mt-1">Prova a cambiare la categoria o la frequenza.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .vtg-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          border: 1px solid #EDE8E2;
          padding: 0;
        }
        .vtg-popup .leaflet-popup-content { margin: 14px 16px; }
        .vtg-popup .leaflet-popup-tip { background: white; }
        .leaflet-container { font-family: Georgia, serif; }
      `}</style>
    </div>
  )
}
