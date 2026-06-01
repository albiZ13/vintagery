'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Camera, Loader2, LayoutGrid, Star, Bookmark,
  ShoppingBag, MapPin, Calendar, Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import UserFollowButton from '@/components/UserFollowButton'
import ShareButton from '@/components/ShareButton'
import TrustBadge from '@/components/TrustBadge'
import StarRating from '@/components/StarRating'
import MarketCard from '@/components/MarketCard'
import ShopCard from '@/components/ShopCard'
import type { Market, Shop } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'posts' | 'reviews' | 'saved'

interface ProfileShape {
  id: string
  username: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  trust_tier?: string | null
  trust_score?: number | null
  followers_count?: number | null
  following_count?: number | null
}

interface Purchase {
  id: string
  image_url?: string | null
  caption?: string | null
  price?: number | null
  markets?: { name: string; city: string } | null
  shops?: { name: string; city: string } | null
}

interface Review {
  id: string
  title?: string | null
  body?: string | null
  rating: number
  target_type: string
  target_id: string
  created_at: string
  markets?: { name: string; city: string } | null
  shops?: { name: string; city: string } | null
}

interface Props {
  profile: ProfileShape
  isOwn: boolean
  isFollowing: boolean
  initials: string
  color: string
  displayName: string
  purchases: Purchase[]
  reviews: Review[]
  savedMarkets: Market[] | null
  savedShops: Shop[] | null
}

export default function ProfileClient({
  profile, isOwn, isFollowing, initials, color, displayName,
  purchases, reviews, savedMarkets, savedShops,
}: Props) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      setAvatarUrl(url)
    }
    setUploading(false)
  }

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'posts',   icon: LayoutGrid, label: 'Acquisti' },
    { id: 'reviews', icon: Star,       label: 'Recensioni' },
    ...(isOwn ? [{ id: 'saved' as Tab, icon: Bookmark, label: 'Salvati' }] : []),
  ]

  return (
    <div>
      {/* ── Cover ─────────────────────────────────────────── */}
      <div
        className="h-36 md:h-44 w-full relative"
        style={{ background: `linear-gradient(150deg, ${color}38 0%, ${color}12 55%, transparent 100%)` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 60px, ${color}06 60px, ${color}06 61px)`,
          }}
        />
      </div>

      {/* ── Profile header ────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-end justify-between -mt-12 md:-mt-14 mb-5">

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-white shadow-lg relative"
              style={{ boxShadow: `0 0 0 4px white, 0 0 0 5px ${color}30` }}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-2xl md:text-3xl"
                  style={{ background: color }}
                >
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <Loader2 size={26} className="text-white animate-spin" />
                </div>
              )}
            </div>

            {isOwn && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-espresso border-2 border-white flex items-center justify-center shadow-md hover:bg-sienna transition-colors disabled:opacity-60"
                  aria-label="Cambia foto profilo"
                >
                  <Camera size={13} className="text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }}
                />
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-1">
            {isOwn ? (
              <Link
                href="/impostazioni"
                className="inline-flex items-center gap-1.5 bg-white border border-border text-espresso font-semibold rounded-full px-4 py-2 text-[13px] hover:border-espresso/40 transition-colors shadow-sm"
              >
                <Settings size={13} /> Modifica profilo
              </Link>
            ) : (
              <UserFollowButton
                targetUserId={profile.id}
                initialFollowing={isFollowing}
                initialCount={profile.followers_count ?? 0}
              />
            )}
            <ShareButton title={`Profilo di ${displayName} su Vintagery`} />
          </div>
        </div>

        {/* Name + username + trust */}
        <div className="mb-2">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="font-serif text-[21px] font-bold text-espresso leading-tight">{displayName}</h1>
            {profile.trust_tier && (
              <TrustBadge tier={profile.trust_tier as any} score={profile.trust_score ?? undefined} size="sm" />
            )}
          </div>
          <p className="text-muted text-[13px] mt-0.5">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-coffee text-[14px] leading-relaxed mb-4 max-w-sm">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-5 mb-7">
          {([
            { n: purchases.length,              label: 'acquisti' },
            { n: reviews.length,                label: 'recensioni' },
            { n: profile.followers_count ?? 0,  label: 'seguaci' },
            { n: profile.following_count ?? 0,  label: 'seguiti' },
          ] as const).map(({ n, label }) => (
            <div key={label} className="text-center">
              <span className="block font-serif font-bold text-[20px] text-espresso leading-none">{n}</span>
              <span className="text-muted text-[11px] mt-1 block">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────── */}
      <div className="border-y border-border bg-white sticky top-14 z-30">
        <div className="max-w-3xl mx-auto px-4 flex">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors border-b-2 -mb-px',
                activeTab === id
                  ? 'border-espresso text-espresso'
                  : 'border-transparent text-muted hover:text-coffee'
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6 min-h-[40vh]">

        {/* ACQUISTI */}
        {activeTab === 'posts' && (
          purchases.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5 -mx-0.5">
              {purchases.map(p => (
                <div key={p.id} className="relative aspect-square group overflow-hidden bg-cream cursor-pointer">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.caption ?? 'Acquisto'} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={28} className="text-muted/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/65 transition-all duration-200 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-3 gap-1">
                    {p.price && (
                      <p className="text-gold font-serif font-bold text-[15px]">€{Number(p.price).toFixed(0)}</p>
                    )}
                    {p.caption && (
                      <p className="text-parchment text-[11px] text-center line-clamp-2 leading-snug">{p.caption}</p>
                    )}
                    {(p.markets?.name ?? p.shops?.name) && (
                      <p className="text-parchment/55 text-[10px] flex items-center gap-0.5 mt-0.5">
                        <MapPin size={8} /> {p.markets?.name ?? p.shops?.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShoppingBag}
              title="Nessun acquisto condiviso"
              subtitle={isOwn
                ? 'Condividi i pezzi vintage che hai trovato e acquistato'
                : 'Questo utente non ha ancora condiviso acquisti'}
            />
          )
        )}

        {/* RECENSIONI */}
        {activeTab === 'reviews' && (
          reviews.length > 0 ? (
            <div className="flex flex-col gap-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-white border border-border rounded-2xl p-5 hover:border-border-strong transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1 min-w-0">
                      {r.title && (
                        <p className="font-semibold text-[14px] text-espresso mb-0.5 leading-snug">{r.title}</p>
                      )}
                      <p className="text-muted text-[12px] flex items-center gap-1 flex-wrap">
                        <MapPin size={10} />
                        {r.target_type === 'market'
                          ? <Link href={`/mercatini/${r.target_id}`} className="hover:text-sienna transition-colors">{r.markets?.name}</Link>
                          : <Link href={`/negozi/${r.target_id}`} className="hover:text-sienna transition-colors">{r.shops?.name}</Link>
                        }
                        {(r.markets?.city ?? r.shops?.city) && (
                          <span className="text-muted/50">· {r.markets?.city ?? r.shops?.city}</span>
                        )}
                      </p>
                    </div>
                    <StarRating rating={r.rating} size={13} />
                  </div>
                  {r.body && (
                    <p className="text-coffee text-[13px] leading-relaxed line-clamp-4">{r.body}</p>
                  )}
                  <p className="text-muted/50 text-[11px] mt-3 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(r.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title="Nessuna recensione"
              subtitle={isOwn
                ? 'Le tue recensioni di mercatini e negozi appariranno qui'
                : 'Questo utente non ha ancora scritto recensioni'}
            />
          )
        )}

        {/* SALVATI */}
        {activeTab === 'saved' && isOwn && (
          (savedMarkets?.length ?? 0) === 0 && (savedShops?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Nessun elemento salvato"
              subtitle="Salva mercatini e negozi per ritrovarli qui"
            />
          ) : (
            <div className="space-y-8">
              {(savedMarkets?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted/50 mb-4">Mercatini</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(savedMarkets as Market[]).map(m => <MarketCard key={m.id} market={m} compact />)}
                  </div>
                </div>
              )}
              {(savedShops?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted/50 mb-4">Negozi</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(savedShops as Shop[]).map(s => <ShopCard key={s.id} shop={s} />)}
                  </div>
                </div>
              )}
            </div>
          )
        )}

      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ElementType
  title: string
  subtitle: string
}) {
  return (
    <div className="py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-cream border border-border/60 flex items-center justify-center mx-auto mb-4">
        <Icon size={22} className="text-muted/40" />
      </div>
      <p className="font-serif text-[17px] font-semibold text-espresso mb-1.5">{title}</p>
      <p className="text-muted text-[13px] max-w-xs mx-auto leading-relaxed">{subtitle}</p>
    </div>
  )
}
