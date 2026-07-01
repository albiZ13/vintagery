import { createServerClient } from '@/lib/supabase-server'

function toSlug(city: string): string {
  return city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const KEYWORDS = [
  "mercatini dell'usato", 'fiere di antiquariato', 'mercato delle pulci',
  'vintage anni 70', 'modernariato', 'svuotacantine', 'negozi second-hand',
  'vinokilo', 'brocantage', 'mercatini weekend', 'antiquariato italia',
  'mercato vintage itinerante', 'dischi in vinile', 'mobili d\'epoca',
]

export default async function LandingSEO() {
  const supabase = createServerClient()
  const { data } = await supabase.from('markets').select('city, region').order('region')
  if (!data) return null

  const byRegion: Record<string, Set<string>> = {}
  for (const row of data) {
    if (!byRegion[row.region]) byRegion[row.region] = new Set()
    byRegion[row.region].add(row.city)
  }
  const regions = Object.entries(byRegion).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div style={{ overflow: 'hidden', maxHeight: 0 }} aria-hidden="true">
      {regions.map(([region, cities]) => (
        <div key={region}>
          <span>{region}</span>
          {Array.from(cities).sort().map(city => (
            <a key={city} href={`/mercatini/citta/${toSlug(city)}`} tabIndex={-1}>
              {city}
            </a>
          ))}
        </div>
      ))}
      {KEYWORDS.map(kw => <span key={kw}>{kw}</span>)}
    </div>
  )
}
