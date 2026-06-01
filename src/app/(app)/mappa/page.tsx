export const revalidate = 86400 // rigenera ogni 24h — posizioni cambiano raramente

import withDynamic from 'next/dynamic'
import { createServerClient } from '@/lib/supabase-server'

const MapView = withDynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-cream" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-sienna border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm">Caricamento mappa...</p>
      </div>
    </div>
  ),
})

export const metadata = { title: 'Mappa' }

export default async function MappaPage() {
  const supabase = createServerClient()

  const [{ data: markets }, { data: shops }] = await Promise.all([
    supabase.from('markets').select('id, name, city, region, lat, lng, frequency, avg_rating, review_count, next_date, is_verified'),
    supabase.from('shops').select('id, name, city, region, lat, lng, avg_rating, review_count, plan, is_verified'),
  ])

  const marketList = (markets ?? []).filter(m => m.lat && m.lng)
  const shopList   = (shops   ?? []).filter(s => s.lat && s.lng)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="px-5 py-3.5 bg-white border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-serif text-lg font-semibold text-espresso leading-tight">Mappa del vintage italiano</h1>
          <p className="text-muted text-xs mt-0.5">
            {marketList.length} mercatin{marketList.length === 1 ? 'o' : 'i'} · {shopList.length} negoz{shopList.length === 1 ? 'io' : 'i'} con coordinate
          </p>
        </div>
      </div>
      <MapView markets={marketList as any} shops={shopList as any} />
    </div>
  )
}
