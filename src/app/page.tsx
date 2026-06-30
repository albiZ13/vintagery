import LandingNav from '@/components/sections/landing/LandingNav'
import LandingHero from '@/components/sections/landing/LandingHero'
import LandingLatest from '@/components/sections/landing/LandingLatest'
import LandingStats from '@/components/sections/landing/LandingStats'
import LandingHowItWorks from '@/components/sections/landing/LandingHowItWorks'
import LandingCities from '@/components/sections/landing/LandingCities'
import LandingForShops from '@/components/sections/landing/LandingForShops'
import LandingNewsletter from '@/components/sections/landing/LandingNewsletter'
import LandingSEO from '@/components/sections/landing/LandingSEO'
import LandingCTA from '@/components/sections/landing/LandingCTA'
import Footer from '@/components/Footer'

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
      <LandingSEO />
      <LandingCTA />
      <Footer />
    </div>
  )
}
