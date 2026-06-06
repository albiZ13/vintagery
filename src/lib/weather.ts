export interface WeatherDay {
  date: string
  tempMax: number
  tempMin: number
  wmoCode: number
  precipProbability: number
}

const WMO: Record<number, { emoji: string; label: string }> = {
  0:  { emoji: '☀️',  label: 'Sereno' },
  1:  { emoji: '🌤️', label: 'Quasi sereno' },
  2:  { emoji: '⛅',  label: 'Parz. nuvoloso' },
  3:  { emoji: '☁️',  label: 'Coperto' },
  45: { emoji: '🌫️', label: 'Nebbia' },
  48: { emoji: '🌫️', label: 'Nebbia ghiacciata' },
  51: { emoji: '🌦️', label: 'Pioggerellina' },
  53: { emoji: '🌦️', label: 'Pioggia leggera' },
  55: { emoji: '🌧️', label: 'Pioggia' },
  61: { emoji: '🌧️', label: 'Pioggia leggera' },
  63: { emoji: '🌧️', label: 'Pioggia' },
  65: { emoji: '🌧️', label: 'Pioggia intensa' },
  71: { emoji: '🌨️', label: 'Neve leggera' },
  73: { emoji: '❄️',  label: 'Neve' },
  75: { emoji: '❄️',  label: 'Neve intensa' },
  77: { emoji: '🌨️', label: 'Neve granulare' },
  80: { emoji: '🌦️', label: 'Rovesci' },
  81: { emoji: '🌦️', label: 'Rovesci forti' },
  82: { emoji: '⛈️',  label: 'Rovesci violenti' },
  85: { emoji: '🌨️', label: 'Rovesci neve' },
  86: { emoji: '❄️',  label: 'Rovesci neve forti' },
  95: { emoji: '⛈️',  label: 'Temporale' },
  96: { emoji: '⛈️',  label: 'Temporale con grandine' },
  99: { emoji: '⛈️',  label: 'Temporale forte' },
}

export function wmoInfo(code: number): { emoji: string; label: string } {
  return WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { emoji: '🌡️', label: 'Meteo' }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWeatherForDates(
  city: string,
  dates: string[]
): Promise<WeatherDay[]> {
  if (!dates.length || !city) return []
  try {
    const geoRes = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it&format=json`,
      4000
    )
    if (!geoRes.ok) return []
    const geo = await geoRes.json()
    const loc = geo.results?.[0]
    if (!loc?.latitude || !loc?.longitude) return []

    const forecastRes = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&forecast_days=14&timezone=Europe%2FRome`,
      4000
    )
    if (!forecastRes.ok) return []
    const f = await forecastRes.json()

    if (!Array.isArray(f.daily?.time)) return []

    return dates.flatMap(date => {
      const idx: number = (f.daily.time as string[]).indexOf(date)
      if (idx < 0) return []
      return [{
        date,
        tempMax:           Math.round(f.daily.temperature_2m_max?.[idx] ?? 0),
        tempMin:           Math.round(f.daily.temperature_2m_min?.[idx] ?? 0),
        wmoCode:           (f.daily.weathercode?.[idx] ?? 0) as number,
        precipProbability: Math.round(f.daily.precipitation_probability_max?.[idx] ?? 0),
      }]
    })
  } catch {
    return []
  }
}
