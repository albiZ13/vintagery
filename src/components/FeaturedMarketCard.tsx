import Link from 'next/link'
import { MapPin, Clock, Ticket, RefreshCw, Lightbulb, BadgeCheck, ArrowRight } from 'lucide-react'
import { REGION_CONFIG, AREA_PATTERNS, DEFAULT_CONFIG } from '@/lib/regions-config'
import type { Market } from '@/types'
import type { WeatherDay } from '@/lib/weather'
import { wmoInfo } from '@/lib/weather'
import AddToCalendar from './AddToCalendar'

const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const MONTHS_LONG  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DAYS_LONG    = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const DAYS_SHORT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
}

interface Props {
  market: Market
  weather: WeatherDay[]
}

export default function FeaturedMarketCard({ market, weather }: Props) {
  const cfg     = REGION_CONFIG[market.region] ?? DEFAULT_CONFIG
  const pattern = AREA_PATTERNS[cfg.area] ?? AREA_PATTERNS.default
  const [g1, g2] = cfg.gradient
  const accent  = cfg.accent

  const schedule = market.schedule_notes ?? (market.frequency ? FREQ_LABEL[market.frequency] : null)
  const desc     = market.description?.split('\n')[0] ?? null
  const isFree   = /gratuito|gratis|free/i.test(market.price_info ?? '')
  const typeLabel = (market.categories?.[0] ?? 'Mercato ricorrente')

  const d = market.next_date ? new Date(market.next_date + 'T12:00:00') : null

  const mapsUrl = market.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(market.address + ', ' + market.city)}`
    : null

  const maxPrecip = weather.length ? Math.max(...weather.map(w => w.precipProbability)) : 0

  return (
    <div className="bg-white border border-border/70 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(15,32,64,0.10)]">

      {/* ── HEADER GRADIENT ──────────────────────────────────────────── */}
      <div
        className="relative px-6 pt-5 pb-6"
        style={{
          background:          `linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundImage:     `${pattern}, linear-gradient(135deg, ${g1}, ${g2})`,
          backgroundBlendMode: 'overlay, normal',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/35 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">

          {/* Sinistra: chips + data + nome */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/50">
                {typeLabel}
              </span>
              {market.is_verified && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/90 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={8} /> Verificato
                </span>
              )}
              {schedule && (
                <span className="inline-flex items-center gap-1.5 bg-white/18 border border-white/25 rounded-full px-2.5 py-0.5">
                  <RefreshCw size={8} className="text-white/70" />
                  <span className="text-[9px] font-semibold text-white">{schedule}</span>
                </span>
              )}
            </div>

            {d && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 mb-2">
                {DAYS_LONG[d.getDay()]} {d.getDate()} {MONTHS_LONG[d.getMonth()]}
              </p>
            )}

            <h2 className="font-serif font-bold text-white leading-[1.1] mb-3"
              style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2rem)' }}>
              {market.name}
            </h2>

            <p className="flex items-center gap-1.5 text-white/70 text-[13px] font-medium">
              <MapPin size={12} className="text-white/50" />
              {market.city}, {market.region}
            </p>
          </div>

          {/* Destra: Meteo */}
          {weather.length > 0 && (
            <div
              className="flex-shrink-0 rounded-xl px-4 py-3.5 self-start"
              style={{
                background:           'rgba(0,0,0,0.25)',
                backdropFilter:       'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border:               '1px solid rgba(255,255,255,0.14)',
                minWidth:             '170px',
              }}
            >
              <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/40 mb-2.5">
                Meteo weekend
              </p>
              <div className="space-y-2.5">
                {weather.map(w => {
                  const day = new Date(w.date + 'T12:00:00')
                  const { emoji, label } = wmoInfo(w.wmoCode)
                  return (
                    <div key={w.date} className="flex items-center gap-2.5">
                      <span className="text-[18px] leading-none flex-shrink-0 w-7">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white leading-none">
                          {DAYS_SHORT[day.getDay()]} {d ? '' : `${day.getDate()} ${MONTHS_SHORT[day.getMonth()]}`}
                        </p>
                        <p className="text-[9px] text-white/45 mt-0.5 truncate">{label}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold text-white leading-none">{w.tempMax}°</p>
                        <p className="text-[10px] text-white/45 mt-0.5">{w.tempMin}°</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {maxPrecip > 5 && (
                <p className="text-[9px] text-white/35 mt-2.5 pt-2 border-t border-white/10">
                  ☔ {maxPrecip}% probabilità pioggia
                </p>
              )}
              <p className="text-[8px] text-white/20 mt-1.5">Open-Meteo</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}bb, transparent)` }} />

      {/* ── INFO ROW ─────────────────────────────────────────────────── */}
      <div className="px-6 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-border/50 bg-cream/30">
        {market.start_time && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-coffee font-medium">
            <Clock size={12} className="text-muted/60" />
            {market.start_time}{market.end_time ? `–${market.end_time}` : ''}
          </span>
        )}
        {market.price_info && (
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${isFree ? 'text-emerald-700' : 'text-coffee'}`}>
            <Ticket size={12} className="opacity-60" />
            {isFree ? 'Ingresso gratuito' : market.price_info}
          </span>
        )}
        {mapsUrl && market.address && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-sienna transition-colors">
            <MapPin size={11} className="opacity-60" />
            {market.address}
          </a>
        )}
      </div>

      {/* ── DESCRIZIONE ──────────────────────────────────────────────── */}
      {desc && (
        <div className="px-6 py-4 border-b border-border/50">
          <p className="text-[13px] text-coffee leading-[1.75] line-clamp-2">{desc}</p>
        </div>
      )}

      {/* ── TIP ──────────────────────────────────────────────────────── */}
      {market.tips && (
        <div className="mx-6 my-4 flex items-start gap-3 bg-[#fdf8ee] border border-[#e8d69a] rounded-xl px-4 py-3">
          <Lightbulb size={13} className="text-[#b8960a] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#5a4a00]/80 leading-[1.65] line-clamp-2">{market.tips}</p>
        </div>
      )}

      {/* ── AZIONI ───────────────────────────────────────────────────── */}
      <div className="px-6 pb-5 flex flex-wrap items-center gap-2">
        <Link href={`/mercatini/${market.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold transition-all"
          style={{ color: accent }}>
          Scopri di più <ArrowRight size={13} />
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          {market.next_date && (
            <AddToCalendar event={{
              id:          market.id,
              name:        market.name,
              start_date:  market.next_date,
              start_time:  market.start_time ?? undefined,
              end_time:    market.end_time ?? undefined,
              address:     market.address ?? undefined,
              city:        market.city,
              region:      market.region,
              description: market.description ?? undefined,
              price_info:  market.price_info ?? undefined,
            }} />
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold border border-border px-3 py-1.5 rounded-lg text-muted hover:text-espresso hover:border-espresso/30 transition-colors">
              <MapPin size={11} /> Maps
            </a>
          )}
        </div>
      </div>

    </div>
  )
}
