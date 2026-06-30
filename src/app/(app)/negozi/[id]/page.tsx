export const revalidate = 3600 // rigenera ogni ora — post e review cambiano

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Globe, Instagram, Phone, Mail, Clock, BadgeCheck, Crown, ArrowLeft, Grid3X3, Star, Calendar } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import StarRating from '@/components/StarRating'
import ReviewCard from '@/components/ReviewCard'
import ReviewForm from '@/components/ReviewForm'
import TrustBadge from '@/components/TrustBadge'
import ShopProfileClient from '@/components/ShopProfileClient'
import ContactShopButton from '@/components/ContactShopButton'
import ShopMapLink from '@/components/ShopMapLink'
import { formatRating } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props { params: { id: string } }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('shops')
    .select('name,city,region,description,image_url,avg_rating,review_count,categories')
    .eq('id', params.id)
    .single()
  if (!data) return {}

  const title = `${data.name} — Negozio Vintage a ${data.city}`
  const cats  = data.categories?.slice(0, 3).join(', ') ?? 'vintage'
  const description = data.description
    ? data.description.slice(0, 155)
    : `${data.name} è un negozio vintage a ${data.city} (${data.region}). Specializzato in ${cats}. Scopri recensioni e novità su Vintagery.`
  const image = data.image_url ?? `${SITE_URL}/og-default.jpg`
  const url   = `${SITE_URL}/negozi/${params.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, type: 'website', locale: 'it_IT',
      images: [{ url: image, width: 1200, height: 630, alt: data.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

const DAYS_IT: Record<string, string> = {
  mon:'Lun', tue:'Mar', wed:'Mer', thu:'Gio', fri:'Ven', sat:'Sab', sun:'Dom',
}

const PLACEHOLDER_BANNER = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80'
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&q=80'

export default async function NegozioPage({ params }: Props) {
  const supabase = createServerClient()

  const [{ data: shop }, { data: posts }, { data: reviews }, { data: marketPart }] = await Promise.all([
    supabase.from('shops').select('*').eq('id', params.id).single(),
    supabase.from('shop_posts')
      .select('*')
      .eq('shop_id', params.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('reviews')
      .select('*, profiles(username, full_name, avatar_url, trust_tier, trust_score)')
      .eq('target_type', 'shop')
      .eq('target_id', params.id)
      .order('likes_count', { ascending: false })
      .limit(20),
    supabase.from('shop_market_participations')
      .select('market_event_id, market_events(id, name, city, region, description, event_type)')
      .eq('shop_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!shop) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    description: shop.description ?? undefined,
    url: `${SITE_URL}/negozi/${shop.id}`,
    image: shop.image_url ?? undefined,
    telephone: shop.phone ?? undefined,
    email: shop.email ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address,
      addressLocality: shop.city,
      addressRegion: shop.region,
      addressCountry: 'IT',
    },
    ...(shop.lat && shop.lng ? { geo: { '@type': 'GeoCoordinates', latitude: shop.lat, longitude: shop.lng } } : {}),
    ...(shop.website ? { sameAs: [shop.website] } : {}),
    ...(shop.avg_rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: shop.avg_rating,
        reviewCount: shop.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  }

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/negozi" className="inline-flex items-center gap-1 text-muted text-body-sm hover:text-sienna mb-4 transition-colors">
        <ArrowLeft size={14} /> Tutti i negozi
      </Link>

      {/* ── Header stile Instagram ─────────────────────────────── */}
      <div className="mb-6">
        {/* Banner */}
        <div className="relative h-40 rounded-xl overflow-hidden bg-cream mb-4">
          <Image
            src={shop.image_url ?? PLACEHOLDER_BANNER}
            alt={shop.name}
            fill
            className="object-cover"
            priority
          />
          {shop.plan === 'premium' && (
            <span className="absolute top-3 left-3 badge bg-gold text-espresso flex items-center gap-1">
              <Crown size={10} /> Premium
            </span>
          )}
        </div>

        {/* Profile row */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-soft flex-shrink-0 -mt-10 bg-cream">
            <Image
              src={shop.image_url ?? PLACEHOLDER_AVATAR}
              alt={shop.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Nome + stats */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif font-bold text-espresso text-[22px] leading-tight">
                {shop.name}
              </h1>
              {shop.is_verified && <BadgeCheck size={18} className="text-sienna" />}
              {shop.vat_verified && (
                <span className="badge bg-green-50 text-green-700 border border-green-200 text-[10px]">
                  P.IVA verificata
                </span>
              )}
            </div>

            <p className="text-body-sm text-muted flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {shop.city}, {shop.region}
            </p>

            {/* Stats row — come Instagram */}
            <div className="flex gap-5 mt-3 text-body-sm">
              <div className="text-center">
                <span className="block font-semibold text-espresso">{shop.posts_count}</span>
                <span className="text-muted text-caption">post</span>
              </div>
              <div className="text-center">
                <span className="block font-semibold text-espresso">{shop.followers_count}</span>
                <span className="text-muted text-caption">follower</span>
              </div>
              <div className="text-center">
                <span className="block font-semibold text-espresso">{shop.review_count}</span>
                <span className="text-muted text-caption">recensioni</span>
              </div>
              {shop.avg_rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={13} className="fill-gold text-gold" />
                  <span className="font-semibold text-espresso">{formatRating(shop.avg_rating)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Follow + Contatta (client components) */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <ShopProfileClient shopId={shop.id} />
            <ContactShopButton shopId={shop.id} shopOwnerId={shop.owner_id ?? undefined} />
          </div>
        </div>

        {/* Bio / descrizione */}
        {shop.description && (
          <p className="text-body-sm text-coffee leading-relaxed mt-4">{shop.description}</p>
        )}

        {/* Categorie */}
        {shop.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {shop.categories.map((c: string) => (
              <span key={c} className="text-[11px] px-2.5 py-1 rounded-pill bg-cream border border-border text-coffee">
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Info contatto */}
        <div className="flex flex-wrap gap-3 mt-3">
          {shop.address && (
            <ShopMapLink shopId={shop.id} address={shop.address} city={shop.city} lat={shop.lat} lng={shop.lng} />
          )}
          {shop.website && (
            <a href={shop.website} target="_blank" rel="noopener noreferrer"
              className="text-caption text-sienna flex items-center gap-1 hover:underline">
              <Globe size={12} /> Sito web
            </a>
          )}
          {shop.instagram && (
            <a href={`https://instagram.com/${shop.instagram.replace('@','')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-caption text-sienna flex items-center gap-1 hover:underline">
              <Instagram size={12} /> @{shop.instagram.replace('@','')}
            </a>
          )}
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className="text-caption text-coffee flex items-center gap-1">
              <Phone size={12} /> {shop.phone}
            </a>
          )}
          {shop.opening_hours && (
            <span className="text-caption text-muted flex items-center gap-1">
              <Clock size={12} />
              {Object.entries(shop.opening_hours).slice(0,2).map(([d, h]) => `${DAYS_IT[d]}: ${h}`).join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* ── Griglia Post ──────────────────────────────────────── */}
      <div className="border-t border-border pt-6 mb-8">
        <div className="flex items-center gap-2 mb-4 text-caption font-medium text-espresso">
          <Grid3X3 size={14} /> POST
        </div>
        {/* Client component per la griglia interattiva con modal */}
        <ShopProfileClient shopId={shop.id} posts={posts ?? []} mode="grid" />
      </div>

      {/* ── Mercati a cui partecipo ──────────────────────────── */}
      {(marketPart?.length ?? 0) > 0 && (
        <div className="border-t border-border pt-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} className="text-sienna" />
            <h2 className="font-serif font-semibold text-espresso text-[19px]">Mercati</h2>
            <span className="text-caption text-muted">— presente a {marketPart!.length} mercato{marketPart!.length !== 1 ? 'i' : ''}</span>
          </div>
          <div className="space-y-2">
            {marketPart!.map((p: any) => {
              const m = p.market_events
              const schedule = m.description?.match(/Cadenza:\s*(.+?)(?:\n|$)/i)?.[1]?.trim()
              return (
                <Link
                  key={p.market_event_id}
                  href={`/mercatini/eventi/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-xl hover:border-sienna/30 hover:shadow-sm transition-all group"
                >
                  <MapPin size={13} className="text-sienna flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-espresso group-hover:text-sienna transition-colors truncate">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {m.city}, {m.region}
                      {schedule && <> · <span>{schedule}</span></>}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-sienna opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    Vedi →
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recensioni ───────────────────────────────────────── */}
      <div className="border-t border-border pt-6 mb-8">
        <h2 className="font-serif font-semibold text-espresso text-[19px] mb-1">Recensioni</h2>
        <p className="text-caption text-muted mb-5">
          {reviews?.length ? `${reviews.length} recensioni` : 'Ancora nessuna recensione — sii il primo'}
        </p>
        {reviews?.map(r => (
          <div key={r.id} className="py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sienna/15 flex items-center justify-center text-sienna font-semibold text-sm flex-shrink-0">
                {(r.profiles?.full_name ?? r.profiles?.username ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-body-sm font-semibold text-espresso">
                    {r.profiles?.full_name ?? r.profiles?.username ?? 'Utente'}
                  </span>
                  {r.profiles?.trust_tier && r.profiles.trust_tier !== 'nuovo' && (
                    <TrustBadge tier={r.profiles.trust_tier} />
                  )}
                  <StarRating rating={r.rating} size={12} />
                </div>
                {r.title && <p className="text-body-sm font-medium text-espresso">{r.title}</p>}
                {r.body  && <p className="text-body-sm text-coffee mt-0.5 leading-relaxed">{r.body}</p>}
                <div className="mt-2">
                  {/* like recensione inline */}
                  <span className="text-caption text-muted">{r.likes_count > 0 && `${r.likes_count} utili`}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ReviewForm targetType="shop" targetId={params.id} />
    </div>
    </>
  )
}
