'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import type { Shop, ShopPost } from '@/types'
import { ITALIAN_REGIONS, VINTAGE_CATEGORIES } from '@/types'
import {
  Store, Save, Plus, Trash2, Crown, BadgeCheck,
  BarChart2, Tag, Loader2, AlertCircle, Building2, MapPin,
} from 'lucide-react'
import MarketParticipationManager from '@/components/MarketParticipationManager'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = 'profilo' | 'post' | 'mercati' | 'stats' | 'piano'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profilo',  label: 'Profilo',     icon: <Store size={15} aria-hidden /> },
  { id: 'post',     label: 'Post',        icon: <Plus size={15} aria-hidden /> },
  { id: 'mercati',  label: 'Mercati',     icon: <MapPin size={15} aria-hidden /> },
  { id: 'stats',    label: 'Statistiche', icon: <BarChart2 size={15} aria-hidden /> },
  { id: 'piano',    label: 'Piano',       icon: <Crown size={15} aria-hidden /> },
]

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [shop, setShop]       = useState<Shop | null>(null)
  const [posts, setPosts]     = useState<ShopPost[]>([])
  const [form, setForm]       = useState<Partial<Shop>>({})
  const [tab, setTab]         = useState<Tab>('profilo')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Nuovo post
  const [newPost, setNewPost]         = useState({ image_url: '', caption: '', price: '', tags: '' })
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError]     = useState<string | null>(null)

  // P.IVA
  const [vatNumber, setVatNumber]     = useState('')
  const [vatLoading, setVatLoading]   = useState(false)
  const [vatResult, setVatResult]     = useState<string | null>(null)
  const [vatError, setVatError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Query sequenziale ottimizzata: prima shop, poi post con shop.id già noto
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (shopData) {
        setShop(shopData)
        setForm(shopData)
        setVatNumber(shopData.vat_number ?? '')

        const { data: postData } = await supabase
          .from('shop_posts')
          .select('*')
          .eq('shop_id', shopData.id)
          .order('created_at', { ascending: false })

        if (postData) setPosts(postData)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!shop) return
    setSaving(true)
    await supabase.from('shops').update(form).eq('id', shop.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function publishPost(e: React.FormEvent) {
    e.preventDefault()
    if (!shop) return
    if (!newPost.image_url) { setPostError('Inserisci un URL immagine'); return }
    setPostLoading(true); setPostError(null)

    const tags = newPost.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { data, error } = await supabase.from('shop_posts').insert({
      shop_id:   shop.id,
      image_url: newPost.image_url,
      caption:   newPost.caption   || null,
      price:     newPost.price ? parseFloat(newPost.price) : null,
      tags:      tags.length ? tags : null,
    }).select().single()

    setPostLoading(false)
    if (error) { setPostError('Errore pubblicazione. Riprova.'); return }
    setPosts(ps => [data as ShopPost, ...ps])
    setNewPost({ image_url: '', caption: '', price: '', tags: '' })
  }

  async function deletePost(postId: string) {
    if (!confirm('Eliminare questo post?')) return
    await supabase.from('shop_posts').delete().eq('id', postId)
    setPosts(ps => ps.filter(p => p.id !== postId))
  }

  async function verifyVat(e: React.FormEvent) {
    e.preventDefault()
    if (!shop || !vatNumber.trim()) return
    setVatLoading(true); setVatResult(null); setVatError(null)

    const res = await fetch('/api/verify-vat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vat_number: vatNumber.trim(), shop_id: shop.id }),
    })
    const json = await res.json()
    setVatLoading(false)

    if (!res.ok) {
      setVatError(json.error ?? 'Errore verifica P.IVA')
    } else {
      setVatResult(json.vat_name ?? 'Verifica avviata')
      // Aggiorna lo shop localmente
      setShop(s => s ? { ...s, vat_number: vatNumber, vat_status: 'pending' } : s)
    }
  }

  const field = useCallback((key: keyof Shop, value: string | string[]) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted">Caricamento...</div>

  if (!shop) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Store size={40} className="text-muted mx-auto mb-4" aria-hidden />
      <p className="font-serif text-[22px] text-espresso mb-2">Nessun negozio trovato</p>
      <p className="text-muted text-body-sm mb-6">Non hai ancora un profilo negozio.</p>
      <Link href="/auth/register?type=shop" className="btn-primary inline-block">Crea profilo negozio</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] font-bold text-espresso">{shop.name}</h1>
          <p className="text-muted text-body-sm flex items-center gap-2 mt-0.5">
            {shop.city}, {shop.region}
            {shop.vat_verified && (
              <span className="badge bg-green-50 text-green-700 border-green-200">P.IVA verificata</span>
            )}
            {shop.vat_status === 'pending' && (
              <span className="badge bg-yellow-50 text-yellow-700 border-yellow-200">Verifica in corso</span>
            )}
          </p>
        </div>
        <Link href={`/negozi/${shop.id}`} className="btn-outline text-sm">Vedi profilo</Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6" aria-label="Statistiche rapide">
        {[
          { label: 'Post',       value: shop.posts_count },
          { label: 'Follower',   value: shop.followers_count },
          { label: 'Recensioni', value: shop.review_count },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-border rounded-lg p-4 text-center">
            <span className="block font-serif font-bold text-[22px] text-espresso">{value ?? 0}</span>
            <span className="text-caption text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Sezioni dashboard" className="flex border-b border-border mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tabpanel-${t.id}`}
            id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-body-sm font-medium border-b-2 transition-colors',
              tab === t.id ? 'border-sienna text-sienna' : 'border-transparent text-muted hover:text-coffee'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB PROFILO ───────────────────────────────────────── */}
      {tab === 'profilo' && (
        <div role="tabpanel" id="tabpanel-profilo" aria-labelledby="tab-profilo">
          <form onSubmit={saveProfile} className="space-y-5">
            <section className="bg-white border border-border rounded-xl p-5">
              <h2 className="font-serif font-semibold text-[17px] text-espresso mb-4">Informazioni base</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['name',    'Nome negozio', 'Vintage Paradise'],
                  ['city',    'Città',        'Milano'],
                  ['address', 'Indirizzo',    'Via Brera 2'],
                ] as [keyof Shop, string, string][]).map(([k, label, ph]) => (
                  <div key={k}>
                    <label htmlFor={`field-${k}`} className="block text-caption font-medium text-coffee mb-1">{label}</label>
                    <input
                      id={`field-${k}`}
                      className="input" placeholder={ph}
                      value={(form[k] as string) ?? ''}
                      onChange={e => field(k, e.target.value)}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="field-region" className="block text-caption font-medium text-coffee mb-1">Regione</label>
                  <select id="field-region" className="input" value={form.region ?? ''} onChange={e => field('region', e.target.value)}>
                    <option value="">Seleziona</option>
                    {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="field-description" className="block text-caption font-medium text-coffee mb-1">Descrizione / Bio</label>
                <textarea id="field-description" className="input resize-none" rows={4} value={form.description ?? ''} onChange={e => field('description', e.target.value)} placeholder="Racconta il tuo negozio..." />
              </div>
            </section>

            <section className="bg-white border border-border rounded-xl p-5">
              <h2 className="font-serif font-semibold text-[17px] text-espresso mb-4">Contatti</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['phone',     'Telefono',          '+39 ...'],
                  ['email',     'Email',              'negozio@email.com'],
                  ['website',   'Sito web',           'https://...'],
                  ['instagram', 'Instagram',          '@nomenegozio'],
                  ['image_url', 'URL foto copertina', 'https://...'],
                ] as [keyof Shop, string, string][]).map(([k, label, ph]) => (
                  <div key={k}>
                    <label htmlFor={`field-${k}`} className="block text-caption font-medium text-coffee mb-1">{label}</label>
                    <input
                      id={`field-${k}`}
                      className="input" placeholder={ph}
                      value={(form[k] as string) ?? ''}
                      onChange={e => field(k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-border rounded-xl p-5">
              <h2 className="font-serif font-semibold text-[17px] text-espresso mb-4">Categorie</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Categorie vintage">
                {VINTAGE_CATEGORIES.map(c => {
                  const active = (form.categories ?? []).includes(c)
                  return (
                    <button
                      key={c} type="button"
                      aria-pressed={active}
                      onClick={() => {
                        const cats = form.categories ?? []
                        field('categories', active ? cats.filter(x => x !== c) : [...cats, c])
                      }}
                      className={cn(
                        'text-caption px-3 py-1.5 rounded-pill border transition-colors',
                        active ? 'bg-sienna text-parchment border-sienna' : 'bg-white text-coffee border-border hover:border-sienna'
                      )}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving
                  ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvataggio...</>
                  : <><Save size={15} aria-hidden /> Salva modifiche</>
                }
              </button>
              {saved && <span className="text-green-700 text-body-sm font-medium" role="status">Salvato!</span>}
            </div>
          </form>

          {/* Verifica P.IVA — separata dal form principale */}
          {!shop.vat_verified && (
            <section className="mt-6 bg-white border border-border rounded-xl p-5">
              <h2 className="font-serif font-semibold text-[17px] text-espresso mb-1 flex items-center gap-2">
                <Building2 size={16} className="text-sienna" aria-hidden /> Verifica P.IVA
              </h2>
              <p className="text-muted text-body-sm mb-4">
                {shop.vat_status === 'pending'
                  ? 'Verifica in corso. Ti contatteremo entro 24 ore.'
                  : 'Inserisci la tua Partita IVA per ottenere il badge verificato.'}
              </p>
              {shop.vat_status !== 'pending' && (
                <form onSubmit={verifyVat} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="vat-number" className="block text-caption font-medium text-coffee mb-1">Partita IVA</label>
                    <input
                      id="vat-number"
                      className="input font-mono"
                      placeholder="IT12345678901"
                      value={vatNumber}
                      onChange={e => setVatNumber(e.target.value.toUpperCase())}
                      maxLength={13}
                      pattern="[A-Z]{2}[0-9]{11}"
                    />
                  </div>
                  <button type="submit" disabled={vatLoading || !vatNumber.trim()} className="btn-outline flex items-center gap-2 h-10">
                    {vatLoading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <BadgeCheck size={14} aria-hidden />}
                    Verifica
                  </button>
                </form>
              )}
              {vatResult && (
                <p className="text-green-700 text-body-sm mt-2 flex items-center gap-1.5">
                  <BadgeCheck size={14} aria-hidden /> {vatResult} — richiesta inviata
                </p>
              )}
              {vatError && (
                <p className="text-red-600 text-body-sm mt-2 flex items-center gap-1.5" role="alert">
                  <AlertCircle size={14} aria-hidden /> {vatError}
                </p>
              )}
            </section>
          )}
        </div>
      )}

      {/* ── TAB POST ──────────────────────────────────────────── */}
      {tab === 'post' && (
        <div role="tabpanel" id="tabpanel-post" aria-labelledby="tab-post" className="space-y-6">
          <section className="bg-white border border-border rounded-xl p-5">
            <h2 className="font-serif font-semibold text-[17px] text-espresso mb-4">Pubblica nuova entrata</h2>
            <form onSubmit={publishPost} className="space-y-4">
              <div>
                <label htmlFor="post-image" className="block text-caption font-medium text-coffee mb-1">URL immagine *</label>
                <input
                  id="post-image"
                  className="input" placeholder="https://..."
                  value={newPost.image_url}
                  onChange={e => setNewPost(p => ({ ...p, image_url: e.target.value }))}
                />
                <p className="text-[11px] text-muted mt-1">Carica su Supabase Storage o usa un link diretto.</p>
              </div>
              {newPost.image_url && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-cream" aria-hidden>
                  <Image src={newPost.image_url} alt="" fill className="object-cover" unoptimized />
                </div>
              )}
              <div>
                <label htmlFor="post-caption" className="block text-caption font-medium text-coffee mb-1">Descrizione</label>
                <textarea id="post-caption" className="input resize-none" rows={3}
                  placeholder="Es: Giacca Levi's anni '80, taglia M, condizioni ottime..."
                  value={newPost.caption}
                  onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="post-price" className="block text-caption font-medium text-coffee mb-1">Prezzo (€)</label>
                  <input id="post-price" type="number" min="0" step="0.01" className="input" placeholder="45"
                    value={newPost.price} onChange={e => setNewPost(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="post-tags" className="block text-caption font-medium text-coffee mb-1">
                    <Tag size={12} className="inline mr-1" aria-hidden />Tag (separati da virgola)
                  </label>
                  <input id="post-tags" className="input" placeholder="jeans, denim, anni80"
                    value={newPost.tags} onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))} />
                </div>
              </div>
              {postError && <p className="text-red-600 text-body-sm" role="alert">{postError}</p>}
              <button type="submit" disabled={postLoading} className="btn-primary flex items-center gap-2">
                {postLoading
                  ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Pubblicazione...</>
                  : <><Plus size={15} aria-hidden /> Pubblica post</>
                }
              </button>
            </form>
          </section>

          <section aria-label={`I tuoi post (${posts.length})`}>
            <h2 className="font-serif font-semibold text-[17px] text-espresso mb-4">I tuoi post ({posts.length})</h2>
            {posts.length === 0 ? (
              <p className="text-muted text-body-sm text-center py-8 border border-dashed border-border rounded-xl">
                Nessun post ancora. Pubblica le tue prime entrate!
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {posts.map(p => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-cream group">
                    <Image src={p.image_url} alt={p.caption ?? 'Post negozio'} fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-espresso/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <span className="text-parchment text-[11px] text-center line-clamp-2">{p.caption}</span>
                      <button
                        onClick={() => deletePost(p.id)}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 text-caption"
                        aria-label={`Elimina post${p.caption ? `: ${p.caption.slice(0, 30)}` : ''}`}
                      >
                        <Trash2 size={12} aria-hidden /> Elimina
                      </button>
                    </div>
                    {p.price && (
                      <span className="absolute bottom-1 right-1 bg-espresso/80 text-parchment text-[10px] px-1.5 py-0.5 rounded">
                        €{p.price}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── TAB MERCATI ───────────────────────────────────────── */}
      {tab === 'mercati' && (
        <div role="tabpanel" id="tabpanel-mercati" aria-labelledby="tab-mercati">
          <MarketParticipationManager shopId={shop.id} />
        </div>
      )}

      {/* ── TAB STATS ─────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div role="tabpanel" id="tabpanel-stats" aria-labelledby="tab-stats" className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <h2 className="font-serif font-semibold text-[17px] text-espresso mb-4">Performance</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-soft rounded-lg">
                <span className="text-caption text-muted">Voto medio</span>
                <span className="block text-[28px] font-serif font-bold text-espresso mt-1">
                  {(shop.avg_rating ?? 0) > 0 ? (shop.avg_rating ?? 0).toFixed(1) : '—'}
                </span>
              </div>
              <div className="p-4 bg-surface-soft rounded-lg">
                <span className="text-caption text-muted">Visibility Score</span>
                <span className="block text-[28px] font-serif font-bold text-espresso mt-1">
                  {(shop.visibility_score ?? 0).toFixed(0)}
                </span>
                <span className="text-[11px] text-muted">Su ~200 max senza ads</span>
              </div>
            </div>
            <div className="mt-5 p-4 bg-cream rounded-lg border border-border">
              <p className="text-caption font-medium text-coffee mb-2">Come si calcola il Visibility Score</p>
              <p className="text-[11px] text-muted leading-relaxed">
                Voto medio ×40 + recensioni ×0.5 + follower ×0.2 + boost pubblicità (max 30pt).<br />
                La pubblicità vale al massimo il 30% del punteggio — il resto dipende dalla tua reputazione.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB PIANO ─────────────────────────────────────────── */}
      {tab === 'piano' && (
        <div role="tabpanel" id="tabpanel-piano" aria-labelledby="tab-piano" className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-semibold text-[17px] text-espresso">Piano attuale</h2>
              <span className={cn('badge', shop.plan === 'premium' ? 'badge-gold' : 'bg-cream text-muted border-border')}>
                {shop.plan === 'premium' ? '★ Premium' : 'Free'}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-body-sm list-none">
              {[
                ['Post illimitati',       true],
                ['Profilo pubblico',      true],
                ['Recensioni clienti',    true],
                ['Badge verificato',      shop.plan === 'premium'],
                ['In evidenza ricerche',  shop.plan === 'premium'],
                ['Statistiche avanzate',  shop.plan === 'premium'],
                ['Supporto prioritario',  shop.plan === 'premium'],
              ].map(([label, ok]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <span className={String(ok) === 'true' ? 'text-green-600' : 'text-muted'} aria-hidden>
                    {String(ok) === 'true' ? '✓' : '○'}
                  </span>
                  <span className={String(ok) !== 'true' ? 'text-muted' : 'text-coffee'}>{String(label)}</span>
                </li>
              ))}
            </ul>
          </div>

          {shop.trial_ends_at && new Date(shop.trial_ends_at) > new Date() && (
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-start gap-3">
              <Crown size={16} className="text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-espresso text-[14px]">Trial Premium attivo</p>
                <p className="text-muted text-[12px] mt-0.5">
                  Hai accesso gratuito a tutte le funzioni Premium fino al{' '}
                  <span className="font-medium text-espresso">
                    {new Date(shop.trial_ends_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>.
                </p>
              </div>
            </div>
          )}

          {shop.plan === 'free' && !(shop.trial_ends_at && new Date(shop.trial_ends_at) > new Date()) && (
            <div className="bg-espresso text-parchment rounded-xl p-6">
              <h2 className="font-serif font-bold text-[20px] mb-1">Passa a Premium</h2>
              <p className="text-parchment/60 text-body-sm mb-5">
                Badge verificato, posizione privilegiata nei risultati, statistiche dettagliate.
              </p>
              <ul className="grid grid-cols-2 gap-3 text-body-sm text-parchment/80 mb-6 list-none">
                <li>✓ Badge verificato</li>
                <li>✓ Posizione in evidenza</li>
                <li>✓ Statistiche avanzate</li>
                <li>✓ Supporto prioritario</li>
              </ul>
              <div className="flex items-end gap-2 mb-4">
                <span className="font-serif font-bold text-[32px] text-gold">€14</span>
                <span className="text-parchment/60 text-body-sm mb-1">/mese</span>
              </div>
              <button
                onClick={async () => {
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shop_id: shop.id, plan: 'premium' }),
                  })
                  const data = await res.json()
                  if (data.url) window.location.href = data.url
                }}
                className="bg-gold text-espresso font-semibold px-8 py-3 rounded hover:bg-gold/90 transition-colors text-body-sm w-full"
              >
                Passa a Premium
              </button>
              <p className="text-[11px] text-parchment/40 mt-3 text-center">
                Annulla quando vuoi. Nessun vincolo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
