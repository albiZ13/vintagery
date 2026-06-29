// Centralized Supabase SELECT column strings.
// Must be string literals (no concatenation) so Supabase TypeScript can infer return types.

export const MARKET_COLS = 'id,name,description,city,region,address,lat,lng,website,instagram,phone,email,schedule_notes,next_date,frequency,active_months,closed_weekdays,categories,image_url,poster_url,is_featured,is_verified,avg_rating,review_count,tips,start_time,end_time,price_info,tags,event_dates,organizer_id,organizer_name,created_at,market_type' as const

// Hides unverified irregular/annual markets from public listings.
// Show if verified OR frequency is not in the uncertain set.
export const PUBLIC_MARKET_FILTER = 'is_verified.eq.true,frequency.not.in.(irregolare,annuale)' as const

export const EVENT_COLS = 'id,name,description,event_type,city,region,address,start_date,end_date,start_time,end_time,website,instagram,price_info,organizer,source,is_verified,is_featured,is_recurring,is_sponsored,shop_id,categories,tags,tips' as const

export const SHOP_COLS = 'id,name,description,city,region,address,categories,image_url,cover_url,badge,plan,is_featured,is_verified,avg_rating,review_count,followers_count,posts_count,website,instagram' as const

export const SHOP_COLS_SLIM = 'id,name,city,region,image_url,plan,is_featured,is_verified,avg_rating,review_count,followers_count,categories,posts_count' as const
