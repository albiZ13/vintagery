export const revalidate = 86400 // rigenera ogni 24h — dati mercato cambiano raramente

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Globe, Instagram, Phone, Mail, Calendar, BadgeCheck, ArrowLeft, Clock, Tag, Lightbulb } from 'lucide-react'
import { createServerClient } from '@/lib/supabase-server'
import StarRating from '@/components/StarRating'
import ReviewCard from '@/components/ReviewCard'
import ReviewForm from '@/components/ReviewForm'
import { formatRating, getFrequencyLabel } from '@/lib/utils'
import { REGION_CONFIG, DEFAULT_CONFIG } from '@/lib/regions-config'
import type { Metadata } from 'next'

interface Props { params: { id: string } }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('markets')
    .select('name,city,region,description,image_url,avg_rating,review_count')
    .eq('id', params.id)
    .single()
  if (!data) return {}

  const title = `${data.name} — ${data.city}`
  const description = data.description
    ? data.description.split('\n')[0].slice(0, 155)
    : `Scopri ${data.name}, mercatino a ${data.city} (${data.region}). Orari, info e recensioni su Vintagery.`
  const image = data.image_url ?? `${SITE_URL}/og-default.jpg`
  const url = `${SITE_URL}/mercatini/${params.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'it_IT',
      images: [{ url: image, width: 1200, height: 630, alt: data.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function MercatinoPage({ params }: Props) {
  const supabase = createServerClient()

  const [{ data: market }, { data: reviews }] = await Promise.all([
    supabase.from('markets').select('*').eq('id', params.id).single(),
    supabase.from('reviews')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('target_type', 'market')
      .eq('target_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!market) notFound()

  const cfg      = REGION_CONFIG[market.region] ?? DEFAULT_CONFIG
  const gradient = `linear-gradient(135deg, ${cfg.gradient[0]} 0%, ${cfg.gradient[1]} 100%)`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: market.name,
    description: market.description ?? undefined,
    url: `${SITE_URL}/mercatini/${market.id}`,
    location: {
      '@type': 'Place',
      name: market.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: market.address ?? undefined,
        addressLocality: market.city,
        addressRegion: market.region,
        addressCountry: 'IT',
      },
      ...(market.lat && market.lng ? { geo: { '@type': 'GeoCoordinates', latitude: market.lat, longitude: market.lng } } : {}),
    },
    image: market.image_url ? [market.image_url] : undefined,
    organizer: market.organizer_name ? { '@type': 'Organization', name: market.organizer_name } : undefined,
    ...(market.avg_rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: market.avg_rating,
        reviewCount: market.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  }

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/mercatini" className="inline-flex items-center gap-1 text-muted text-body-sm hover:text-sienna mb-6 transition-colors">
        <ArrowLeft size={14} /> Tutti i mercatini
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: main content */}
        <div className="lg:col-span-2">
          {/* Hero image / gradient fallback */}
          <div className="relative h-64 rounded-xl overflow-hidden mb-6" style={{ background: gradient }}>
            {market.image_url ? (
              <Image src={market.image_url} alt={market.name} fill className="object-cover" priority />
            ) : (
              <>
                <div className="absolute inset-0 opacity-[0.04]"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: cfg.accent }}>{market.region}</p>
                  <h2 className="font-serif font-bold text-parchment leading-tight" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>{market.city}</h2>
                </div>
              </>
            )}
            {market.is_featured && (
              <span className="absolute top-3 right-3 badge-gold">In evidenza</span>
            )}
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="font-serif text-display-md text-espresso mb-1 flex items-center gap-2">
              {market.name}
              {market.is_verified && <BadgeCheck size={22} className="text-sienna" />}
            </h1>
            <p className="text-muted text-body-sm flex items-center gap-1">
              <MapPin size={13} /> {market.address ? `${market.address}, ` : ''}{market.city} — {market.region}
            </p>

            {market.avg_rating > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarRating rating={market.avg_rating} size={18} />
                <span className="text-body font-semibold text-espresso">{formatRating(market.avg_rating)}</span>
                <span className="text-muted text-body-sm">({market.review_count} {market.review_count === 1 ? 'recensione' : 'recensioni'})</span>
              </div>
            )}
          </div>

          {/* Descrizione */}
          {market.description && (
            <div className="prose-sm text-coffee leading-relaxed mb-8">
              {market.description.split('\n').map((p: string, i: number) => <p key={i}>{p}</p>)}
            </div>
          )}

          {/* Categorie */}
          {market.categories?.length > 0 && (
            <div className="mb-8">
              <h2 className="font-serif font-semibold text-espresso text-[17px] mb-3">Cosa trovi</h2>
              <div className="flex flex-wrap gap-2">
                {market.categories.map((c: string) => (
                  <span key={c} className="px-3 py-1 rounded-pill bg-cream text-coffee border border-border text-body-sm">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {market.tips && (
            <div className="mb-8">
              <h2 className="font-serif font-semibold text-espresso text-[17px] mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-sienna" /> Consigli pratici
              </h2>
              <div className="bg-cream border border-border rounded-xl p-4 space-y-2">
                {market.tips.split('\n').filter(Boolean).map((p: string, i: number) => (
                  <p key={i} className="text-coffee text-[13px] leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Recensioni */}
          <div className="mb-8">
            <h2 className="font-serif font-semibold text-espresso text-[19px] mb-1">
              Recensioni
            </h2>
            <p className="text-caption text-muted mb-5">
              {reviews?.length ? `${reviews.length} recensioni` : 'Ancora nessuna recensione'}
            </p>

            {reviews?.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>

          {/* Form recensione */}
          <ReviewForm targetType="market" targetId={params.id} />
        </div>

        {/* Right: info sidebar */}
        <div className="space-y-4">
          {/* Info box — Airbnb style sticky card */}
          <div className="sticky top-20 bg-white border border-border rounded-xl p-5 shadow-card">
            <h3 className="font-serif font-semibold text-espresso text-[17px] mb-4">Informazioni</h3>

            <ul className="space-y-3 text-body-sm">
              {market.frequency && (
                <li className="flex items-start gap-3">
                  <Calendar size={15} className="text-sienna mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-espresso font-medium">{getFrequencyLabel(market.frequency)}</span>
                    {market.schedule_notes && (
                      <span className="block text-muted text-caption">{market.schedule_notes}</span>
                    )}
                    {market.next_date && (
                      <span className="block text-muted text-caption">
                        Prossima data:{' '}
                        {new Date(market.next_date).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })}
                      </span>
                    )}
                  </div>
                </li>
              )}

              {(market.start_time || market.end_time) && (
                <li className="flex items-center gap-3">
                  <Clock size={15} className="text-sienna flex-shrink-0" />
                  <span className="text-coffee">
                    {[market.start_time, market.end_time].filter(Boolean).join(' – ')}
                  </span>
                </li>
              )}

              {market.price_info && (
                <li className="flex items-center gap-3">
                  <Tag size={15} className="text-sienna flex-shrink-0" />
                  <span className="text-coffee">{market.price_info}</span>
                </li>
              )}

              {market.address && (
                <li className="flex items-start gap-3">
                  <MapPin size={15} className="text-sienna mt-0.5 flex-shrink-0" />
                  <span className="text-coffee">{market.address}, {market.city}</span>
                </li>
              )}

              {market.website && (
                <li className="flex items-center gap-3">
                  <Globe size={15} className="text-sienna flex-shrink-0" />
                  <a href={market.website} target="_blank" rel="noopener noreferrer"
                    className="text-sienna underline underline-offset-2 truncate">
                    Sito web
                  </a>
                </li>
              )}

              {market.instagram && (
                <li className="flex items-center gap-3">
                  <Instagram size={15} className="text-sienna flex-shrink-0" />
                  <a href={`https://instagram.com/${market.instagram.replace('@','')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sienna underline underline-offset-2">
                    @{market.instagram.replace('@','')}
                  </a>
                </li>
              )}

              {market.phone && (
                <li className="flex items-center gap-3">
                  <Phone size={15} className="text-sienna flex-shrink-0" />
                  <a href={`tel:${market.phone}`} className="text-coffee">{market.phone}</a>
                </li>
              )}

              {market.email && (
                <li className="flex items-center gap-3">
                  <Mail size={15} className="text-sienna flex-shrink-0" />
                  <a href={`mailto:${market.email}`} className="text-sienna underline underline-offset-2 truncate">
                    {market.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
