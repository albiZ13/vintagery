import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/mercatini`)
  }

  const supabase = getServiceClient()

  const { error } = await supabase
    .from('region_subscriptions')
    .update({ active: false })
    .eq('unsubscribe_token', token)

  if (error) {
    console.error('[unsubscribe]', error.message)
  }

  return NextResponse.redirect(`${SITE_URL}/mercatini?unsubscribed=1`)
}
