import LandingNav from '@/components/sections/landing/LandingNav'
import LandingHero from '@/components/sections/landing/LandingHero'
import LandingHowItWorks from '@/components/sections/landing/LandingHowItWorks'
import LandingForShops from '@/components/sections/landing/LandingForShops'
import LandingCTA from '@/components/sections/landing/LandingCTA'
import Footer from '@/components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-parchment">
      <LandingNav />
      <LandingHero />
      <LandingHowItWorks />
      <LandingForShops />
      <LandingCTA />
      <Footer />
    </div>
  )
}
