import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'

function toSlug(city: string): string {
  return city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

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
    <section className="bg-white border-t border-border py-20">
      <div className="max-w-5xl mx-auto px-4">

        {/* Intro copy — ricco di keyword per Google */}
        <div className="max-w-2xl mb-16">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-sienna/50 mb-4">
            La directory
          </p>
          <h2
            className="font-serif font-bold text-espresso leading-[1.08] tracking-[-0.015em] mb-5"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Mercatini vintage e antiquariato in tutta Italia
          </h2>
          <p className="text-[15px] text-muted leading-relaxed mb-4">
            Vintagery raccoglie oltre 200 mercatini dell'usato, fiere di antiquariato e mercati vintage
            in tutte e 20 le regioni italiane. Ogni mese aggiorniamo date, orari e informazioni
            su Porta Portese a Roma, il Gran Balon di Torino, la Fiera Antiquaria di Arezzo,
            il Mercatone dell'Antiquariato sui Navigli di Milano e centinaia di altri appuntamenti.
          </p>
          <p className="text-[15px] text-muted leading-relaxed">
            Che tu cerchi vintage anni '70, modernariato, libri usati, dischi in vinile o mobili
            d'epoca — trovi il mercatino più vicino a te con date sempre aggiornate,
            orari di apertura e indicazioni stradali.
          </p>
        </div>

        {/* Regioni e città */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
          {regions.map(([region, cities]) => (
            <div key={region}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-espresso/40 mb-3">
                {region}
              </h3>
              <ul className="space-y-1.5">
                {Array.from(cities).sort().map(city => (
                  <li key={city}>
                    <Link
                      href={`/mercatini/citta/${toSlug(city)}`}
                      className="text-[13px] text-muted hover:text-sienna transition-colors capitalize"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Keyword naturali per SEO long-tail */}
        <div className="mt-16 pt-12 border-t border-border grid sm:grid-cols-3 gap-8">
          <div>
            <h3 className="text-[13px] font-semibold text-espresso mb-2">Mercatini dell'usato</h3>
            <p className="text-[12px] text-muted/70 leading-relaxed">
              Svuotacantine, mercati delle pulci e brocantage ogni weekend in tutta Italia.
              Trova il prossimo appuntamento nella tua città.
            </p>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-espresso mb-2">Fiere di antiquariato</h3>
            <p className="text-[12px] text-muted/70 leading-relaxed">
              Dalle grandi fiere nazionali come Arezzo e Parma ai mercati mensili locali.
              Date aggiornate ogni mese.
            </p>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-espresso mb-2">Negozi vintage</h3>
            <p className="text-[12px] text-muted/70 leading-relaxed">
              Directory dei negozi second-hand, vintage e di modernariato in Italia.
              Leggi le recensioni della community.
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
