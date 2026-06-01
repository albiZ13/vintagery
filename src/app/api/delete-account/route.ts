import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

export async function DELETE() {
  // 1. Verify the user is authenticated
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  // 2. Use admin client to delete user from auth
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Delete profile data first (cascade should handle the rest)
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete auth user
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('[delete-account]', deleteError)
    return NextResponse.json({ error: 'Errore durante la cancellazione. Riprova.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
