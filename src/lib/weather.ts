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
  56: { emoji: '🌧️', label: 'Pioggia gelata' },
  57: { emoji: '🌧️', label: 'Pioggia gelata' },
  61: { emoji: '🌧️', label: 'Pioggia leggera' },
  63: { emoji: '🌧️', label: 'Pioggia' },
  65: { emoji: '🌧️', label: 'Pioggia intensa' },
  71: { emoji: '🌨️', label: 'Neve leggera' },
  73: { emoji: '❄️',  label: 'Neve' },
  75: { emoji: '❄️',  label: 'Neve intensa' },
  77: { emoji: '🌨️', label: 'Granelli di neve' },
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

export async function fetchWeatherForDates(
  city: string,
  dates: string[]
): Promise<WeatherDay[]> {
  if (!dates.length) return []
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it&format=json`,
      { next: { revalidate: 86400 } }
    )
    if (!geoRes.ok) return []
    const geo = await geoRes.json()
    const loc = geo.results?.[0]
    if (!loc) return []

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&forecast_days=14&timezone=Europe%2FRome`,
      { next: { revalidate: 3600 } }
    )
    if (!forecastRes.ok) return []
    const f = await forecastRes.json()

    return dates.flatMap(date => {
      const idx: number = (f.daily.time as string[]).indexOf(date)
      if (idx < 0) return []
      return [{
        date,
        tempMax:           Math.round(f.daily.temperature_2m_max[idx]),
        tempMin:           Math.round(f.daily.temperature_2m_min[idx]),
        wmoCode:           f.daily.weathercode[idx] as number,
        precipProbability: Math.round(f.daily.precipitation_probability_max?.[idx] ?? 0),
      }]
    })
  } catch {
    return []
  }
}
