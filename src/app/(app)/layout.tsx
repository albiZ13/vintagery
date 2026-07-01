import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner'
import EmailVerificationBanner from '@/components/EmailVerificationBanner'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import FeedbackWidget from '@/components/FeedbackWidget'
import UsernameSetupModal from '@/components/UsernameSetupModal'
import { createServerClient } from '@/lib/supabase-server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

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
      <UsernameSetupModal />
    </>
  )
}
