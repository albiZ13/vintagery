import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <ProfileCompletionBanner />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
