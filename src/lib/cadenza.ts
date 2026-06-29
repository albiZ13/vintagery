export const FREQ_LABEL: Record<string, string> = {
  settimanale: 'Ogni settimana',
  mensile:     'Ogni mese',
  occasionale: 'Occasionale',
  annuale:     'Annuale',
}

const WEEKDAY_MAP: Record<string, number> = {
  'domenica': 0, 'lunedi': 1, 'martedi': 2, 'mercoledi': 3,
  'giovedi': 4, 'venerdi': 5, 'sabato': 6,
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function parseWeekday(s: string): number | null {
  const n = normalize(s)
  for (const [key, val] of Object.entries(WEEKDAY_MAP)) {
    if (n.includes(key)) return val
  }
  return null
}

export function nextWeekdayFrom(from: Date, weekday: number): Date {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const diff = ((weekday - d.getDay()) + 7) % 7
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
  return d
}

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  if (n === -1) {
    const candidates: Date[] = []
    const d = new Date(year, month, 1)
    while (d.getMonth() === month) {
      if (d.getDay() === weekday) candidates.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return candidates[candidates.length - 1] ?? new Date(year, month, 28)
  }
  let count = 0
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (d.getDay() === weekday) {
      count++
      if (count === n) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
  return new Date(year, month, 1)
}

function advanceMonth(year: number, month: number): { year: number; month: number } {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
}

/**
 * Calcola la prossima data futura dalla stringa di cadenza (es. "Ogni domenica", "Prima domenica del mese").
 * Accetta sia la stringa grezza che il campo description con "Cadenza: XXX" incorporato.
 */
export function computeNextDate(scheduleOrDescription: string | null, today: Date): string | null {
  if (!scheduleOrDescription) return null

  // Supporta sia schedule_notes diretto che description con "Cadenza: XXX"
  const cadenzaMatch = scheduleOrDescription.match(/Cadenza:\s*(.+?)(?:\n|$)/i)
  const raw = cadenzaMatch ? cadenzaMatch[1].trim() : scheduleOrDescription.trim()

  const c = normalize(raw)

  if (c.includes('tutti i giorni')) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return localDateStr(d)
  }

  const ORDINALS: [string, number][] = [
    ['prim', 1], ['second', 2], ['terz', 3], ['quart', 4], ['quint', 5], ['ultim', -1],
  ]

  if (c.includes('del mese') || c.includes('del mes')) {
    for (const [prefix, n] of ORDINALS) {
      if (c.includes(prefix)) {
        const wd = parseWeekday(c)
        if (wd !== null) {
          const todayStr = localDateStr(today)
          let result = nthWeekdayOfMonth(today.getFullYear(), today.getMonth(), wd, n)
          if (localDateStr(result) <= todayStr) {
            const next = advanceMonth(today.getFullYear(), today.getMonth())
            result = nthWeekdayOfMonth(next.year, next.month, wd, n)
          }
          return localDateStr(result)
        }
      }
    }
  }

  if (c.includes('ogni ')) {
    const wd = parseWeekday(c)
    if (wd !== null) return localDateStr(nextWeekdayFrom(today, wd))
  }

  return null
}

// ── resolveDisplayDate ────────────────────────────────────────────────────────

export interface DisplayDate {
  date:        Date | null
  isComputed:  boolean   // true = ricalcolata client-side (DB non ancora aggiornato)
  isOffSeason: boolean   // true = active_months esclude il mese corrente
}

/**
 * Restituisce sempre una data futura da mostrare in UI.
 * Se next_date è nel passato, la ricalcola dalla cadenza:
 *   - settimanale → +7 giorni dall'ultimo next_date (stesso giorno della settimana)
 *   - mensile/altro → computeNextDate da schedule_notes
 * Se non è possibile calcolarla, date = null.
 */
export function resolveDisplayDate(market: {
  next_date?:      string | null
  schedule_notes?: string | null
  frequency?:      string | null
  active_months?:  number[] | null
}): DisplayDate {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = localDateStr(today)

  // Fuori stagione
  const currentMonth = today.getMonth() + 1
  if (market.active_months?.length && !market.active_months.includes(currentMonth)) {
    return { date: null, isComputed: false, isOffSeason: true }
  }

  // next_date già futura o oggi → usa direttamente
  if (market.next_date && market.next_date >= todayStr) {
    return {
      date:        new Date(market.next_date + 'T12:00:00'),
      isComputed:  false,
      isOffSeason: false,
    }
  }

  // next_date passata o assente → ricalcola

  const freq = market.frequency?.toLowerCase()

  // Settimanale: mantieni lo stesso giorno della settimana, avanza di 7
  if (freq === 'settimanale' && market.next_date) {
    const base    = new Date(market.next_date + 'T12:00:00')
    const weekday = base.getDay()
    return {
      date:        nextWeekdayFrom(today, weekday),
      isComputed:  true,
      isOffSeason: false,
    }
  }

  // Mensile / altro: usa computeNextDate da schedule_notes
  if (market.schedule_notes) {
    const nextStr = computeNextDate(market.schedule_notes, today)
    if (nextStr) {
      return {
        date:        new Date(nextStr + 'T12:00:00'),
        isComputed:  true,
        isOffSeason: false,
      }
    }
  }

  // Non calcolabile
  return { date: null, isComputed: false, isOffSeason: false }
}
