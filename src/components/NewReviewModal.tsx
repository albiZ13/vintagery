'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Search, Loader2, Star, ImagePlus, Trash2, Store, MapPin, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { prepareImage } from '@/lib/image-utils'
import { cn } from '@/lib/utils'

type Step = 'search' | 'write'
type TargetType = 'market' | 'shop'

interface Target {
  id: string
  name: string
  city: string
  type: TargetType
}

interface Props {
  userId: string
  onClose: () => void
  onPublished?: () => void
  prefilledTarget?: Target
}

interface MediaItem {
  file: File
  preview: string
  isVideo: boolean
}

const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

function StarFill({ fill, size = 12 }: { fill: 'full' | 'half' | 'empty'; size?: number }) {
  if (fill === 'full')  return <svg width={size} height={size} viewBox="0 0 20 20" fill="#C4A030"><path d={STAR_PATH} /></svg>
  if (fill === 'empty') return <svg width={size} height={size} viewBox="0 0 20 20" fill="#d1cbc4"><path d={STAR_PATH} /></svg>
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="#d1cbc4" className="absolute inset-0"><path d={STAR_PATH} /></svg>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="#C4A030" className="absolute inset-0" style={{ clipPath: 'inset(0 50% 0 0)' }}><path d={STAR_PATH} /></svg>
    </span>
  )
}

export function HalfStars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <StarFill
          key={i}
          size={size}
          fill={rating >= i ? 'full' : rating >= i - 0.5 ? 'half' : 'empty'}
        />
      ))}
    </div>
  )
}

function HalfStarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>, i: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    setHover(e.clientX - rect.left < rect.width / 2 ? i - 0.5 : i)
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>, i: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    onChange(e.clientX - rect.left < rect.width / 2 ? i - 0.5 : i)
  }

  const SIZE = 32
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseMove={e => handleMouseMove(e, i)}
          onMouseLeave={() => setHover(0)}
          onClick={e => handleClick(e, i)}
          className="focus:outline-none p-0.5 rounded"
          aria-label={`${i} stelle`}
        >
          <StarFill
            size={SIZE}
            fill={display >= i ? 'full' : display >= i - 0.5 ? 'half' : 'empty'}
          />
        </button>
      ))}
    </div>
  )
}

function ratingLabel(v: number) {
  const labels: Record<number, string> = {
    0.5: 'Pessimo', 1: 'Brutto', 1.5: 'Scarso', 2: 'Mediocre', 2.5: 'Così così',
    3: 'Nella media', 3.5: 'Discreto', 4: 'Buono', 4.5: 'Ottimo', 5: 'Eccellente',
  }
  return labels[v] ?? ''
}

function checkVideoDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.src = URL.createObjectURL(file)
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration) }
    v.onerror = () => resolve(Infinity)
  })
}

export default function NewReviewModal({ userId, onClose, onPublished, prefilledTarget }: Props) {
  const sbRef    = useRef(createClient())
  const supabase = sbRef.current
  const fileRef  = useRef<HTMLInputElement>(null)

  const [step,       setStep]      = useState<Step>(prefilledTarget ? 'write' : 'search')
  const [query,      setQuery]     = useState('')
  const [results,    setResults]   = useState<Target[]>([])
  const [searching,  setSearching] = useState(false)
  const [selected,   setSelected]  = useState<Target | null>(prefilledTarget ?? null)

  const [rating,     setRating]    = useState(0)
  const [title,      setTitle]     = useState('')
  const [body,       setBody]      = useState('')
  const [media,      setMedia]     = useState<MediaItem[]>([])
  const [uploading,  setUploading] = useState(false)
  const [error,      setError]     = useState<string | null>(null)
  const [publishing, setPublishing]= useState(false)

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const [{ data: markets }, { data: shops }] = await Promise.all([
      supabase.from('markets').select('id,name,city').ilike('name', `%${q}%`).limit(6),
      supabase.from('shops').select('id,name,city').ilike('name', `%${q}%`).limit(6),
    ])
    setResults([
      ...(markets ?? []).map(m => ({ ...m, type: 'market' as TargetType })),
      ...(shops   ?? []).map(s => ({ ...s, type: 'shop'   as TargetType })),
    ])
    setSearching(false)
  }, [supabase])

  function pickTarget(t: Target) { setSelected(t); setStep('write'); setResults([]) }

  async function addMedia(files: FileList | null) {
    if (!files) return
    setError(null)
    const remaining = 4 - media.length
    const newItems: MediaItem[] = []

    for (const file of Array.from(files).slice(0, remaining)) {
      const isVideo = file.type.startsWith('video/')
      if (isVideo) {
        const dur = await checkVideoDuration(file)
        if (dur > 15) {
          setError(`Il video "${file.name}" supera i 15 secondi.`); continue
        }
        newItems.push({ file, preview: URL.createObjectURL(file), isVideo })
      } else {
        try {
          const ready = await prepareImage(file)
          newItems.push({ file: ready, preview: URL.createObjectURL(ready), isVideo: false })
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Impossibile caricare l\'immagine.')
        }
      }
    }
    setMedia(prev => [...prev, ...newItems])
  }

  function removeMedia(i: number) {
    setMedia(prev => prev.filter((_, idx) => idx !== i))
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !rating) { setError('Seleziona un voto prima di pubblicare'); return }
    setPublishing(true); setError(null)

    let uploadedUrls: string[] = []
    if (media.length > 0) {
      setUploading(true)
      const urls = await Promise.all(media.map(async (item, i) => {
        try {
          const ready = item.isVideo ? item.file : await prepareImage(item.file)
          const ext   = ready.name.split('.').pop()?.toLowerCase() ?? (item.isVideo ? 'mp4' : 'jpg')
          const path  = `${userId}/${Date.now()}_${i}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('review-images')
            .upload(path, ready, { contentType: ready.type })
          if (upErr) return null
          const publicUrl = supabase.storage.from('review-images').getPublicUrl(path).data.publicUrl

          // moderate asynchronously — fail open if API unavailable
          try {
            const mod = await fetch('/api/reviews/moderate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: publicUrl }),
            })
            const { approved, reason } = await mod.json()
            if (!approved) {
              await supabase.storage.from('review-images').remove([path])
              throw new Error(reason ?? 'Immagine non consentita')
            }
          } catch (modErr) {
            if (modErr instanceof Error && modErr.message !== 'Immagine non consentita') {
              // network/moderation service error → accept image
            } else if (modErr instanceof Error) {
              throw modErr
            }
          }
          return publicUrl
        } catch { return null }
      }))
      uploadedUrls = urls.filter(Boolean) as string[]
      setUploading(false)
    }

    const { error: err } = await supabase.from('reviews').insert({
      user_id:     userId,
      target_type: selected.type,
      target_id:   selected.id,
      rating,
      title:       title.trim() || null,
      body:        body.trim()  || null,
      images:      uploadedUrls.length > 0 ? uploadedUrls : null,
    })

    setPublishing(false)
    if (err) {
      if (err.code === '23505') setError('Hai già recensito questo posto.')
      else setError('Errore durante il salvataggio. Riprova.')
      return
    }
    onPublished?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-espresso/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-parchment rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'write' && !prefilledTarget && (
              <button onClick={() => setStep('search')} className="text-muted hover:text-espresso transition-colors">←</button>
            )}
            <div>
              <h2 className="font-serif font-bold text-espresso text-[17px] leading-tight">
                {step === 'search' ? 'Scegli cosa recensire' : 'Scrivi la recensione'}
              </h2>
              {step === 'write' && selected && (
                <p className="text-[12px] text-sienna font-semibold mt-0.5">{selected.name} · {selected.city}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream hover:bg-border transition-colors flex items-center justify-center flex-shrink-0">
            <X size={15} className="text-espresso" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Step 1: Search ── */}
          {step === 'search' && (
            <div className="p-5">
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => search(e.target.value)}
                  placeholder="Cerca mercatino o negozio…"
                  className="w-full input pl-9 pr-4"
                />
                {searching && <Loader2 size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
              </div>

              {results.length > 0 && (
                <ul className="space-y-1">
                  {results.map(t => (
                    <li key={`${t.type}-${t.id}`}>
                      <button
                        onClick={() => pickTarget(t)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream transition-colors text-left"
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', t.type === 'market' ? 'bg-sienna/10' : 'bg-gold/10')}>
                          {t.type === 'market' ? <MapPin size={14} className="text-sienna" /> : <Store size={14} className="text-gold" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-espresso truncate">{t.name}</p>
                          <p className="text-[11px] text-muted">{t.city} · {t.type === 'market' ? 'Mercatino' : 'Negozio'}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-[13px] text-muted text-center py-6">Nessun risultato per &ldquo;{query}&rdquo;</p>
              )}
              {query.length < 2 && (
                <p className="text-[13px] text-muted text-center py-6">Digita almeno 2 caratteri per cercare.</p>
              )}
            </div>
          )}

          {/* ── Step 2: Write ── */}
          {step === 'write' && selected && (
            <form id="review-form" onSubmit={publish} className="p-5 space-y-5">

              {/* Rating */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-2">Voto *</p>
                <div className="flex items-center gap-3">
                  <HalfStarPicker value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <span className="text-[13px] font-semibold text-gold">{rating} — {ratingLabel(rating)}</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">
                  Titolo <span className="font-normal normal-case tracking-normal text-muted">· opzionale</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Un titolo per la tua recensione"
                  className="w-full input"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-1.5">Racconta la tua esperienza</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={1000}
                  rows={5}
                  placeholder="Cosa ti è piaciuto? Torneresti?"
                  className="w-full input resize-none"
                />
                <p className="text-[11px] text-muted/60 mt-1 text-right">{body.length}/1000</p>
              </div>

              {/* Media */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-2">
                  Foto / Video <span className="font-normal normal-case tracking-normal text-muted">· opzionale, max 4 · video max 15 sec</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {media.map((item, i) => (
                    <div key={item.preview} className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream flex-shrink-0">
                      {item.isVideo ? (
                        <video src={item.preview} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <Image src={item.preview} alt="" fill className="object-cover" sizes="80px" />
                      )}
                      {item.isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Play size={18} className="text-white drop-shadow" fill="white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-espresso/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {media.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-sienna/40 bg-cream hover:bg-sienna/5 flex flex-col items-center justify-center gap-1 transition-colors text-muted hover:text-sienna flex-shrink-0"
                    >
                      <ImagePlus size={18} />
                      <span className="text-[10px] font-semibold">Aggiungi</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => addMedia(e.target.files)}
                />
              </div>

              {error && (
                <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
              )}
            </form>
          )}
        </div>

        {/* Footer CTA */}
        {step === 'write' && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0 bg-parchment">
            <button
              form="review-form"
              type="submit"
              disabled={!rating || publishing || uploading}
              className="w-full flex items-center justify-center gap-2 bg-espresso text-parchment font-semibold py-3 rounded-xl text-[14px] hover:bg-sienna transition-colors disabled:opacity-40"
            >
              {uploading    && <><Loader2 size={15} className="animate-spin" /> Caricamento...</>}
              {publishing   && !uploading && <><Loader2 size={15} className="animate-spin" /> Pubblicazione...</>}
              {!publishing  && !uploading && <><Star size={15} /> Pubblica recensione</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
