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

function nextWeekdayFrom(from: Date, weekday: number): Date {
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
 * Dato il campo `description` di un market_event (contiene "Cadenza: XXX"),
 * restituisce la prossima data futura nel formato YYYY-MM-DD.
 * Restituisce null se la cadenza non è riconoscibile.
 */
export function computeNextDate(description: string | null, today: Date): string | null {
  if (!description) return null

  const m = description.match(/Cadenza:\s*(.+?)(?:\n|$)/i)
  if (!m) return null

  const c = normalize(m[1].trim())

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
