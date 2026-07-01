'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarPlus, X, MapPin, Clock, Euro, Calendar, RefreshCw } from 'lucide-react'

interface EventData {
  id: string
  name: string
  start_date: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  address?: string | null
  city: string
  region: string
  description?: string | null
  price_info?: string | null
  organizer?: string | null
  website?: string | null
  instagram?: string | null
  schedule_notes?: string | null
  frequency?: string | null
  tips?: string | null
  icsTable?: 'event' | 'market'
}

interface Props {
  event: EventData
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function addHours(timeStr: string, h: number): string {
  const [hh, mm] = timeStr.split(':').map(Number)
  const total = hh * 60 + (mm || 0) + h * 60
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildDetails(ev: EventData): string {
  return [
    ev.description?.split('\n')[0]?.replace(/\s*Cadenza:.*$/i, '').slice(0, 250) ?? null,
    ev.schedule_notes ? `📅 Cadenza: ${ev.schedule_notes}` : ev.frequency ? `📅 Cadenza: ${ev.frequency}` : null,
    ev.price_info     ? `🎟 Ingresso: ${ev.price_info}`    : null,
    ev.organizer      ? `👤 Organizzatore: ${ev.organizer}` : null,
    ev.tips           ? `💡 Consigli: ${ev.tips}`           : null,
    ev.instagram      ? `📸 Instagram: @${ev.instagram.replace(/^@/, '')}` : null,
    ev.website        ? `🌐 Sito: ${ev.website}`            : null,
  ].filter(Boolean).join('\n')
}

// ── ICS client-side ───────────────────────────────────────────────────────────

function escICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function foldICS(line: string): string {
  if (line.length <= 75) return line
  const out = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) { out.push(' ' + line.slice(i, i + 74)); i += 74 }
  return out.join('\r\n')
}

function toICSDate(dateStr: string, timeStr?: string | null): string {
  if (!timeStr) return dateStr.replace(/-/g, '')
  const d = new Date(`${dateStr}T${timeStr}`)
  if (isNaN(d.getTime())) return dateStr.replace(/-/g, '')
  return d.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
}

function buildICS(ev: EventData): string {
  const startDate = ev.start_date!
  const allDay    = !ev.start_time
  const endTime   = ev.end_time ?? (ev.start_time ? addHours(ev.start_time, 3) : null)
  const endDate   = ev.end_date ?? (allDay ? nextDay(startDate) : startDate)

  const dtstart     = toICSDate(startDate, ev.start_time)
  const dtend       = toICSDate(endDate, endTime)
  const dtStartLine = allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`
  const dtEndLine   = allDay ? `DTEND;VALUE=DATE:${dtend}`     : `DTEND:${dtend}`

  const location  = [ev.address, ev.city, ev.region].filter(Boolean).join(', ')
  const cadenza   = ev.schedule_notes ?? ev.frequency ?? null
  const mainDesc  = ev.description?.split('\n')[0]?.replace(/\s*Cadenza:.*$/i, '').trim() ?? ''
  const instagram = ev.instagram ? `@${ev.instagram.replace(/^@/, '')}` : null

  const desc = [
    mainDesc      ? escICS(mainDesc)                           : '',
    cadenza       ? `Cadenza: ${escICS(cadenza)}`              : '',
    ev.price_info ? `Ingresso: ${escICS(ev.price_info)}`       : '',
    ev.organizer  ? `Organizzatore: ${escICS(ev.organizer)}`   : '',
    ev.tips       ? `Consigli: ${escICS(ev.tips)}`             : '',
    instagram     ? `Instagram: ${instagram}`                  : '',
    ev.website    ? `Sito: ${escICS(ev.website)}`              : '',
  ].filter(Boolean).join('\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vintagery//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@vintagery.it`,
    dtStartLine,
    dtEndLine,
    foldICS(`SUMMARY:${escICS(ev.name)}`),
    location ? foldICS(`LOCATION:${escICS(location)}`) : '',
    desc     ? foldICS(`DESCRIPTION:${desc}`)          : '',
    `URL:https://vintagery.it/mercatini/${ev.id}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

function downloadICS(ev: EventData) {
  const content = buildICS(ev)
  const blob    = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url     = URL.createObjectURL(blob)
  const slug    = ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = `${slug}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Google / Outlook URL builders ─────────────────────────────────────────────

function toGoogleDate(dateStr: string, timeStr?: string | null): string {
  if (!timeStr) return dateStr.replace(/-/g, '')
  const dt = new Date(`${dateStr}T${timeStr}`)
  return isNaN(dt.getTime()) ? dateStr.replace(/-/g, '') : dt.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
}

function buildGoogleUrl(ev: EventData): string {
  const startDate = ev.start_date!
  const hasTime   = !!ev.start_time
  const endTime   = ev.end_time ?? (ev.start_time ? addHours(ev.start_time, 3) : null)
  const start     = toGoogleDate(startDate, ev.start_time)
  const endDate   = ev.end_date ?? (hasTime ? startDate : nextDay(startDate))
  const end       = toGoogleDate(endDate, endTime)
  const loc       = [ev.address, ev.city, ev.region].filter(Boolean).join(', ')
  const details   = buildDetails(ev)
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: ev.name, dates: `${start}/${end}`,
    ...(loc     && { location: loc }),
    ...(details && { details }),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function buildOutlookUrl(ev: EventData): string {
  const startDate = ev.start_date!
  const hasTime   = !!ev.start_time
  const endTime   = ev.end_time ?? (ev.start_time ? addHours(ev.start_time, 3) : null)
  const start     = hasTime ? `${startDate}T${ev.start_time}` : startDate
  const endDate   = ev.end_date ?? (hasTime ? startDate : nextDay(startDate))
  const end       = endTime ? `${endDate}T${endTime}` : endDate
  const loc       = [ev.address, ev.city, ev.region].filter(Boolean).join(', ')
  const body      = buildDetails(ev)
  const params = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent',
    subject: ev.name, startdt: start, enddt: end,
    ...(loc  && { location: loc }),
    ...(body && { body }),
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function OutlookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect width="24" height="24" rx="3" fill="#0078D4"/>
      <path fill="white" d="M6 6h6.5c2.49 0 4.5 2.01 4.5 4.5S14.99 15 12.5 15H6V6zm2 2v5h4.5c1.38 0 2.5-1.12 2.5-2.5S13.88 8 12.5 8H8z"/>
      <path fill="white" d="M17 13h1v5h-1v-5z"/>
      <path fill="white" d="M14 16h5v1h-5v-1z"/>
    </svg>
  )
}

function ICSIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

// ── Options ───────────────────────────────────────────────────────────────────

const OPTIONS = [
  { id: 'google',  label: 'Google Calendar', sublabel: 'Apre in una nuova scheda',         Icon: GoogleIcon,  bg: 'hover:bg-[#f8f4ff]' },
  { id: 'apple',   label: 'Apple Calendar',  sublabel: 'Calendario, Fantastical, Tempi…',  Icon: AppleIcon,   bg: 'hover:bg-gray-50'    },
  { id: 'outlook', label: 'Outlook',         sublabel: 'Outlook.com e Office 365',          Icon: OutlookIcon, bg: 'hover:bg-blue-50'    },
  { id: 'ics',     label: 'Scarica .ics',    sublabel: 'Compatibile con tutti i calendari', Icon: ICSIcon,     bg: 'hover:bg-cream'      },
]

// ── Formatters ────────────────────────────────────────────────────────────────

function formatPreviewDate(ev: EventData): string {
  if (!ev.start_date) return ''
  const d = new Date(ev.start_date + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
  let s = d.toLocaleDateString('it-IT', opts)
  if (ev.end_date && ev.end_date !== ev.start_date) {
    const e = new Date(ev.end_date + 'T12:00:00')
    s += ` – ${e.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddToCalendar({ event }: Props) {
  const [open, setOpen]   = useState(false)
  const [above, setAbove] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current   && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setAbove(rect.bottom + 340 > window.innerHeight)
    setOpen(o => !o)
  }

  function handleSelect(id: string) {
    setOpen(false)
    if (id === 'google') {
      window.open(buildGoogleUrl(event), '_blank', 'noopener noreferrer')
    } else if (id === 'apple' || id === 'ics') {
      downloadICS(event)
    } else if (id === 'outlook') {
      window.open(buildOutlookUrl(event), '_blank', 'noopener noreferrer')
    }
  }

  if (!event.start_date) return null

  const loc = [event.address, event.city].filter(Boolean).join(' · ')

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Aggiungi al calendario"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-coffee border border-border rounded-lg px-3 py-1.5 hover:border-sienna hover:text-sienna hover:bg-sienna/5 transition-all"
      >
        <CalendarPlus size={13} aria-hidden />
        <span>Aggiungi al calendario</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Aggiungi al calendario"
          className={`absolute ${above ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 w-72 bg-white border border-border rounded-2xl shadow-[0_8px_32px_rgba(28,46,74,0.14)] overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <span className="text-[11px] font-bold text-espresso uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={11} className="text-sienna" /> Aggiungi al calendario
            </span>
            <button onClick={() => setOpen(false)} aria-label="Chiudi" className="text-muted hover:text-espresso transition-colors">
              <X size={14} aria-hidden />
            </button>
          </div>

          {/* Event preview */}
          <div className="mx-3 mb-3 bg-surface-soft border border-border/60 rounded-xl px-3.5 py-3 space-y-1.5">
            <p className="font-serif font-semibold text-espresso text-[13px] leading-snug line-clamp-2">
              {event.name}
            </p>
            <div className="flex items-start gap-1.5 text-[11px] text-coffee">
              <Calendar size={10} className="text-sienna mt-0.5 flex-shrink-0" />
              <span>{formatPreviewDate(event)}</span>
            </div>
            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-1.5 text-[11px] text-coffee">
                <Clock size={10} className="text-sienna flex-shrink-0" />
                <span>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</span>
              </div>
            )}
            {loc && (
              <div className="flex items-start gap-1.5 text-[11px] text-coffee">
                <MapPin size={10} className="text-sienna mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{loc}</span>
              </div>
            )}
            {(event.schedule_notes || event.frequency) && (
              <div className="flex items-start gap-1.5 text-[11px] text-coffee">
                <RefreshCw size={10} className="text-sienna mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{event.schedule_notes ?? event.frequency}</span>
              </div>
            )}
            {event.price_info && (
              <div className="flex items-center gap-1.5 text-[11px] text-coffee">
                <Euro size={10} className="text-sienna flex-shrink-0" />
                <span>{event.price_info}</span>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="border-t border-border/60 pb-1.5">
            {OPTIONS.map(({ id, label, sublabel, Icon, bg }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`flex items-center gap-3 w-full text-left px-4 py-2.5 transition-colors ${bg}`}
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-espresso leading-none mb-0.5">{label}</p>
                  <p className="text-[10px] text-muted">{sublabel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
