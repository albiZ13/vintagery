export type UserRole = 'user' | 'shop_owner' | 'admin'
export type TrustTier = 'nuovo' | 'attivo' | 'fidato' | 'expert'
export type VatStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  trust_score: number
  trust_tier: TrustTier
  created_at: string
}

export interface Market {
  id: string
  name: string
  description: string | null
  address: string | null
  city: string
  region: string
  lat: number | null
  lng: number | null
  website: string | null
  instagram: string | null
  phone: string | null
  email: string | null
  frequency: 'settimanale' | 'mensile' | 'occasionale' | 'annuale' | null
  next_date: string | null
  schedule_notes: string | null
  categories: string[] | null
  image_url: string | null
  poster_url: string | null
  event_dates: string[] | null
  organizer_id: string | null
  organizer_name: string | null
  avg_rating: number
  review_count: number
  is_verified: boolean
  is_featured: boolean
  created_at: string
  tips: string | null
  start_time: string | null
  end_time: string | null
  price_info: string | null
  active_months: number[] | null
  tags: string[] | null
}

export interface Shop {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  address: string
  city: string
  region: string
  lat: number | null
  lng: number | null
  website: string | null
  instagram: string | null
  phone: string | null
  email: string | null
  categories: string[] | null
  image_url: string | null
  opening_hours: Record<string, string> | null
  vat_number: string | null
  vat_verified: boolean
  vat_status: VatStatus
  vat_name: string | null
  avg_rating: number
  review_count: number
  followers_count: number
  posts_count: number
  visibility_score: number
  is_verified: boolean
  is_featured: boolean
  plan: 'free' | 'premium'
  created_at: string
}

export interface ShopPost {
  id: string
  shop_id: string
  image_url: string
  caption: string | null
  tags: string[] | null
  price: number | null
  sold: boolean
  likes_count: number
  created_at: string
  shops?: Pick<Shop, 'name' | 'city' | 'image_url'>
}

export interface Review {
  id: string
  user_id: string
  target_type: 'market' | 'shop'
  target_id: string
  rating: number
  title: string | null
  body: string | null
  likes_count: number
  created_at: string
  profiles?: Pick<Profile, 'username' | 'full_name' | 'avatar_url' | 'trust_tier' | 'trust_score'>
}

export interface Purchase {
  id: string
  user_id: string
  shop_id: string | null
  market_id: string | null
  image_url: string | null
  description: string | null
  price: number | null
  category: string | null
  likes_count: number
  created_at: string
  profiles?: Pick<Profile, 'username' | 'full_name' | 'avatar_url'>
  shops?: Pick<Shop, 'name' | 'city'>
  markets?: Pick<Market, 'name' | 'city'>
}

export const ITALIAN_REGIONS = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
] as const

export const VINTAGE_CATEGORIES = [
  'Abbigliamento', 'Accessori', 'Vinili', 'Libri', 'Mobili',
  'Gioielli', 'Ceramiche', 'Oggetti da cucina', 'Arte', 'Giocattoli',
  'Fotografia', 'Elettronica vintage', 'Borse', 'Scarpe',
] as const

export const TRUST_TIER_LABELS: Record<TrustTier, { label: string; color: string }> = {
  nuovo:   { label: 'Nuovo',   color: 'text-muted bg-cream border-border' },
  attivo:  { label: 'Attivo',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  fidato:  { label: 'Fidato',  color: 'text-sienna bg-sienna/10 border-sienna/30' },
  expert:  { label: 'Expert',  color: 'text-gold bg-gold/10 border-gold/30' },
}

export interface MarketEvent {
  id: string
  name: string
  description: string | null
  event_type: string
  city: string
  region: string
  address: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  website: string | null
  instagram: string | null
  price_info: string | null
  organizer: string | null
  source?: string | null
  is_verified: boolean
  is_featured: boolean
  is_recurring: boolean
  categories: string[] | null
  tags: string[] | null
  tips: string | null
  avg_rating: number | null
  review_count: number
}

export const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
