import type { Metadata } from 'next'
import LandingNav from '@/components/sections/landing/LandingNav'
import LandingHero from '@/components/sections/landing/LandingHero'
import LandingLatest from '@/components/sections/landing/LandingLatest'
import LandingStats from '@/components/sections/landing/LandingStats'
import LandingHowItWorks from '@/components/sections/landing/LandingHowItWorks'
import LandingCities from '@/components/sections/landing/LandingCities'
import LandingForShops from '@/components/sections/landing/LandingForShops'
import LandingNewsletter from '@/components/sections/landing/LandingNewsletter'
import LandingCTA from '@/components/sections/landing/LandingCTA'
import LandingSEO from '@/components/sections/landing/LandingSEO'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Mercatini Vintage e Antiquariato in Italia | Vintagery',
  description: 'Directory di oltre 200 mercatini vintage, fiere di antiquariato e negozi second hand in tutta Italia. Date aggiornate ogni mese, filtra per città e regione. Porta Portese, Gran Balon, Fiera Antiquaria Arezzo e molto altro.',
  alternates: { canonical: 'https://vintagery.it' },
  openGraph: {
    title: 'Mercatini Vintage e Antiquariato in Italia | Vintagery',
    description: 'Oltre 200 mercatini vintage, fiere di antiquariato e negozi second hand in tutte e 20 le regioni italiane. Date sempre aggiornate.',
    url: 'https://vintagery.it',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-parchment">
      <LandingNav />
      <LandingHero />
      <LandingLatest />
      <LandingStats />
      <LandingHowItWorks />
      <LandingCities />
      <LandingForShops />
      <LandingNewsletter />
      <LandingCTA />
      <LandingSEO />
      <Footer />
    </div>
  )
}
