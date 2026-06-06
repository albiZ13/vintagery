export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import ProfileClient from '@/components/ProfileClient'
import type { Market, Shop } from '@/types'
import { avatarColor } from '@/lib/utils'

interface Props { params: { username: string } }

function getInitials(first?: string | null, last?: string | null, username?: string | null) {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0].toUpperCase()
  if (username) return username[0].toUpperCase()
  return '?'
}

const MARKET_COLS = 'id,name,description,city,region,address,schedule_notes,next_date,frequency,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,event_dates,organizer_id,organizer_name,created_at'
const SHOP_COLS   = 'id,name,city,region,image_url,plan,is_featured,is_verified,avg_rating,review_count,followers_count,categories,posts_count'

export default async function ProfilePage({ params }: Props) {
  const supabase = createServerClient()
  const { data: { user: me } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .maybeSingle()

  if (!profile) notFound()

  const isOwn = me?.id === profile.id

  const [
    { data: purchases },
    { data: reviews },
    { data: following },
    { data: favMarketIds },
    { data: favShopIds },
  ] = await Promise.all([
    supabase.from('purchases')
      .select('*, markets(name, city), shops(name, city)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('reviews')
      .select('*, markets(name, city), shops(name, city)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
    me
      ? supabase.from('user_follows').select('follower_id')
          .eq('follower_id', me.id).eq('following_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isOwn
      ? supabase.from('user_favorites').select('target_id')
          .eq('user_id', profile.id).eq('target_type', 'market').limit(20)
      : Promise.resolve({ data: null }),
    isOwn
      ? supabase.from('user_favorites').select('target_id')
          .eq('user_id', profile.id).eq('target_type', 'shop').limit(20)
      : Promise.resolve({ data: null }),
  ])

  const [{ data: savedMarkets }, { data: savedShops }] = await Promise.all([
    favMarketIds?.length
      ? supabase.from('markets').select(MARKET_COLS).in('id', favMarketIds.map(f => f.target_id))
      : Promise.resolve({ data: null }),
    favShopIds?.length
      ? supabase.from('shops').select(SHOP_COLS).in('id', favShopIds.map(f => f.target_id))
      : Promise.resolve({ data: null }),
  ])

  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.full_name ?? profile.username ?? 'Utente'

  const initials = getInitials(profile.first_name, profile.last_name, profile.username)
  const color    = avatarColor(profile.username ?? profile.id)

  return (
    <ProfileClient
      profile={profile}
      isOwn={isOwn}
      isFollowing={!!following}
      initials={initials}
      color={color}
      displayName={displayName}
      purchases={purchases ?? []}
      reviews={reviews ?? []}
      savedMarkets={savedMarkets as Market[] | null}
      savedShops={savedShops as Shop[] | null}
    />
  )
}
