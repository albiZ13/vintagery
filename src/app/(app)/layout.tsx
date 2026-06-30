import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner'
import EmailVerificationBanner from '@/components/EmailVerificationBanner'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import FeedbackWidget from '@/components/FeedbackWidget'
import { createServerClient } from '@/lib/supabase-server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <Navbar />
      {user && !user.email_confirmed_at && user.email && (
        <EmailVerificationBanner email={user.email} />
      )}
      <ProfileCompletionBanner />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <PWAInstallBanner />
      {user && <FeedbackWidget userId={user.id} />}
    </>
  )
}
