import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

export const revalidate = 86400 // ricostruisce ogni 24h

const CITIES = [
  'milano', 'roma', 'firenze', 'torino', 'bologna', 'napoli',
  'venezia', 'genova', 'palermo', 'catania', 'bari', 'brescia',
  'padova', 'verona', 'trieste', 'modena', 'parma', 'ferrara',
  'perugia', 'ancona', 'pescara', 'cagliari', 'reggio-emilia',
  'livorno', 'prato', 'bergamo', 'lecce', 'siena', 'arezzo',
  'pistoia', 'pisa', 'lucca',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let markets: { id: string; updated_at: string | null }[] = []
  let shops:   { id: string; created_at: string | null }[]  = []

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from('markets').select('id,updated_at').order('created_at', { ascending: false }),
      supabase.from('shops').select('id,created_at').order('created_at', { ascending: false }),
    ])
    markets = m ?? []
    shops   = s ?? []
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/mercatini`,          lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/negozi`,             lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/proponi-mercatino`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/termini`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const cityRoutes: MetadataRoute.Sitemap = CITIES.map(city => ({
    url:             `${SITE_URL}/mercatini/citta/${city}`,
    lastModified:    new Date(),
    changeFrequency: 'weekly' as const,
    priority:        0.8,
  }))

  const marketRoutes: MetadataRoute.Sitemap = markets.map(m => ({
    url:             `${SITE_URL}/mercatini/${m.id}`,
    lastModified:    m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority:        0.7,
  }))

  const shopRoutes: MetadataRoute.Sitemap = shops.map(s => ({
    url:             `${SITE_URL}/negozi/${s.id}`,
    lastModified:    s.created_at ? new Date(s.created_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority:        0.6,
  }))

  return [...staticRoutes, ...cityRoutes, ...marketRoutes, ...shopRoutes]
}
