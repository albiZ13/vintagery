'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Upload, ImageIcon, Video, FileText, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { prepareImage } from '@/lib/image-utils'

type PostType = 'photo' | 'video' | 'thought'

interface Props {
  userId: string
  onClose: () => void
  onPublished: (post: UserPost) => void
}

export interface UserPost {
  id: string
  user_id: string
  type: PostType
  image_url: string | null
  video_url: string | null
  caption: string | null
  likes_count: number
  created_at: string
}

const TYPE_CONFIG: Record<PostType, { label: string; icon: React.ElementType; accept: string; hint: string }> = {
  photo:   { label: 'Foto',     icon: ImageIcon,  accept: 'image/jpeg,image/png,image/webp,image/heic', hint: 'JPG, PNG, WebP · max 10 MB' },
  video:   { label: 'Video',    icon: Video,       accept: 'video/mp4,video/webm,video/quicktime',       hint: 'MP4, WebM · max 50 MB' },
  thought: { label: 'Pensiero', icon: FileText,    accept: '',                                           hint: 'Solo testo, nessun allegato' },
}

const THOUGHT_PALETTES = [
  ['#1c2e4a', '#f0ebe0'],
  ['#B53A1E', '#fdfbf7'],
  ['#4a3728', '#f5f0e8'],
  ['#2d4a3e', '#f0f5f0'],
  ['#1a1a2e', '#e8e4f0'],
]

export default function NewPostModal({ userId, onClose, onPublished }: Props) {
  const [type, setType]         = useState<PostType>('photo')
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [caption, setCaption]   = useState('')
  const [palette, setPalette]   = useState(0)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  function selectFile(f: File) {
    setFile(f)
    setError(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) selectFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) selectFile(f)
  }, [])

  function switchType(t: PostType) {
    setType(t)
    setFile(null)
    setPreview(null)
    setError(null)
  }

  async function publish() {
    if (type !== 'thought' && !file) { setError('Seleziona un file prima di pubblicare'); return }
    if (type === 'thought' && !caption.trim()) { setError('Scrivi qualcosa prima di pubblicare'); return }
    setUploading(true)
    setError(null)

    let image_url: string | null = null
    let video_url: string | null = null

    if (file && (type === 'photo' || type === 'video')) {
      let ready = file
      if (type === 'photo') {
        try { ready = await prepareImage(file) }
        catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Errore immagine.')
          setUploading(false); return
        }
      }
      const ext  = ready.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('user-posts')
        .upload(path, ready, { contentType: ready.type })

      if (uploadErr) { setError('Errore nel caricamento del file. Riprova.'); setUploading(false); return }

      const { data: { publicUrl } } = supabase.storage.from('user-posts').getPublicUrl(path)
      if (type === 'photo') image_url = publicUrl
      if (type === 'video') video_url = publicUrl
    }

    const thoughtMeta = type === 'thought'
      ? { bg: THOUGHT_PALETTES[palette][0], fg: THOUGHT_PALETTES[palette][1] }
      : null

    const { data: post, error: insertErr } = await supabase
      .from('user_posts')
      .insert({
        user_id:   userId,
        type,
        image_url,
        video_url,
        caption:   caption.trim() || null,
        ...(thoughtMeta ? { image_url: null, video_url: null } : {}),
      })
      .select()
      .single()

    if (insertErr || !post) { setError('Errore nella pubblicazione. Riprova.'); setUploading(false); return }

    // Salva metadati palette per i pensieri come prefisso nella caption
    if (type === 'thought' && thoughtMeta) {
      const meta = `__palette:${palette}__`
      await supabase.from('user_posts').update({ caption: meta + (caption.trim() || '') }).eq('id', post.id)
      post.caption = meta + (caption.trim() || '')
    }

    setUploading(false)
    onPublished(post as UserPost)
  }

  const cfg = TYPE_CONFIG[type]
  const [bgColor, fgColor] = THOUGHT_PALETTES[palette]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,32,64,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:w-[480px] sm:max-h-[90vh] bg-parchment rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white">
          <h2 className="font-serif font-bold text-espresso text-[17px]">Nuovo post</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-cream flex items-center justify-center transition-colors">
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-2 px-5 pt-4 pb-1">
          {(Object.entries(TYPE_CONFIG) as [PostType, typeof TYPE_CONFIG[PostType]][]).map(([t, c]) => {
            const Icon = c.icon
            return (
              <button
                key={t}
                onClick={() => switchType(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border transition-all ${
                  type === t
                    ? 'bg-espresso text-parchment border-espresso'
                    : 'bg-white text-muted border-border hover:border-espresso/40 hover:text-espresso'
                }`}
              >
                <Icon size={13} /> {c.label}
              </button>
            )
          })}
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">

            {/* Area upload / anteprima (per foto e video) */}
            {type !== 'thought' && (
              !preview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`h-52 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition-all ${
                    dragging ? 'border-sienna bg-sienna/5' : 'border-border/60 bg-white hover:border-espresso/30 hover:bg-cream/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cream border border-border/60 flex items-center justify-center">
                    <Upload size={18} className="text-muted" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-espresso">Carica {type === 'photo' ? 'una foto' : 'un video'}</p>
                    <p className="text-[11px] text-muted mt-0.5">{cfg.hint}</p>
                  </div>
                </div>
              ) : (
                <div className="relative h-52 rounded-2xl overflow-hidden bg-cream group">
                  {type === 'photo' && preview && (
                    <Image src={preview} alt="Anteprima" fill className="object-cover" />
                  )}
                  {type === 'video' && (
                    <video src={preview} className="w-full h-full object-cover" muted />
                  )}
                  <button
                    onClick={() => { setFile(null); setPreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-espresso/80 flex items-center justify-center hover:bg-espresso transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={13} className="text-white" />
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 text-[10px] font-bold bg-white/90 text-espresso px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Cambia
                  </button>
                </div>
              )
            )}

            {/* Anteprima pensiero */}
            {type === 'thought' && (
              <div
                className="h-40 rounded-2xl flex items-center justify-center p-6 transition-colors"
                style={{ background: bgColor }}
              >
                <p
                  className="font-serif text-center text-[16px] leading-snug font-semibold"
                  style={{ color: fgColor, opacity: caption ? 1 : 0.35 }}
                >
                  {caption || 'Il tuo pensiero apparirà così…'}
                </p>
              </div>
            )}

            {/* Selezione palette (solo pensieri) */}
            {type === 'thought' && (
              <div className="flex gap-2 justify-center">
                {THOUGHT_PALETTES.map(([bg], i) => (
                  <button
                    key={i}
                    onClick={() => setPalette(i)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${palette === i ? 'border-espresso scale-110' : 'border-transparent scale-100'}`}
                    style={{ background: bg }}
                  />
                ))}
              </div>
            )}

            {/* Caption */}
            <div>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder={type === 'thought' ? 'Scrivi il tuo pensiero…' : 'Aggiungi una didascalia (opzionale)…'}
                rows={type === 'thought' ? 1 : 3}
                maxLength={500}
                className="w-full bg-white border border-border rounded-xl px-4 py-3 text-[13px] text-espresso resize-none focus:outline-none focus:border-espresso/40 focus:ring-2 focus:ring-espresso/10 placeholder:text-muted/50"
              />
              <p className="text-[10px] text-muted/50 text-right mt-1">{caption.length}/500</p>
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-white flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-[13px] font-semibold text-muted hover:text-espresso hover:border-espresso/40 transition-all">
            Annulla
          </button>
          <button
            onClick={publish}
            disabled={uploading}
            className="flex-1 py-2.5 rounded-xl bg-espresso text-parchment text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-sienna transition-colors disabled:opacity-60"
          >
            {uploading
              ? <><Loader2 size={14} className="animate-spin" /> Pubblicazione…</>
              : <><CheckCircle size={14} /> Pubblica</>
            }
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={cfg.accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
