'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Move, Check, X, ImagePlus, Loader2 } from 'lucide-react'

interface Props {
  coverUrl: string | null
  positionY: number
  uploading: boolean
  onUpload: (file: File) => void
  onSavePosition: (y: number) => Promise<void>
}

export default function CoverPositioner({ coverUrl, positionY, uploading, onUpload, onSavePosition }: Props) {
  const fileRef      = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [mode,      setMode]      = useState<'view' | 'drag'>('view')
  const [draftY,    setDraftY]    = useState(positionY)
  const [saving,    setSaving]    = useState(false)
  const [startY,    setStartY]    = useState<number | null>(null)
  const [startDraft, setStartDraft] = useState(50)

  useEffect(() => { setDraftY(positionY) }, [positionY])

  const clamp = (v: number) => Math.max(0, Math.min(100, v))

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (mode !== 'drag') return
    e.currentTarget.setPointerCapture(e.pointerId)
    setStartY(e.clientY)
    setStartDraft(draftY)
  }, [mode, draftY])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (mode !== 'drag' || startY === null) return
    const h = containerRef.current?.clientHeight ?? 176
    const delta = (e.clientY - startY) / h * 100
    setDraftY(clamp(startDraft - delta))
  }, [mode, startY, startDraft])

  const onPointerUp = useCallback(() => {
    setStartY(null)
  }, [])

  async function confirmPosition() {
    setSaving(true)
    await onSavePosition(Math.round(draftY))
    setSaving(false)
    setMode('view')
  }

  function cancelDrag() {
    setDraftY(positionY)
    setMode('view')
  }

  const displayY = mode === 'drag' ? draftY : positionY

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-coffee mb-2">
        Foto copertina <span className="text-red-500">*</span>
      </p>

      {/* Preview container — stesse proporzioni della pagina negozio */}
      <div
        ref={containerRef}
        className={`relative w-full rounded-xl overflow-hidden bg-cream border-2 ${
          mode === 'drag'
            ? 'border-sienna cursor-grab active:cursor-grabbing select-none'
            : 'border-dashed border-border'
        }`}
        style={{ height: '176px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {coverUrl ? (
          <>
            <Image
              src={coverUrl}
              alt="Cover negozio"
              fill
              className="object-cover transition-none"
              style={{ objectPosition: `center ${displayY}%` }}
              unoptimized
              draggable={false}
            />

            {/* Drag mode overlay */}
            {mode === 'drag' && (
              <div className="absolute inset-0 bg-espresso/20 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-espresso shadow">
                  <Move size={13} /> Trascina per riposizionare
                </div>
              </div>
            )}

            {/* View mode overlay — hover */}
            {mode === 'view' && !uploading && (
              <div className="absolute inset-0 bg-espresso/0 hover:bg-espresso/25 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="bg-white/90 text-espresso text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow hover:bg-white transition-colors"
                >
                  <ImagePlus size={12} /> Cambia
                </button>
                <button
                  type="button"
                  onClick={() => setMode('drag')}
                  className="bg-white/90 text-espresso text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow hover:bg-white transition-colors"
                >
                  <Move size={12} /> Riposiziona
                </button>
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 bg-espresso/40 flex items-center justify-center">
                <Loader2 size={22} className="text-white animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-muted/50 cursor-pointer hover:bg-cream/60 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? <Loader2 size={28} className="animate-spin mb-2" />
              : <ImagePlus size={28} className="mb-2" />
            }
            <span className="text-[11px]">Carica copertina</span>
          </div>
        )}
      </div>

      {/* Drag mode — confirm / cancel bar */}
      {mode === 'drag' && (
        <div className="flex items-center justify-between mt-2.5 bg-espresso/5 border border-espresso/10 rounded-xl px-3 py-2">
          <p className="text-[11px] text-muted">Trascina l&apos;immagine su o giù per centrare il soggetto</p>
          <div className="flex gap-2 flex-shrink-0 ml-3">
            <button
              type="button"
              onClick={cancelDrag}
              className="text-[11px] font-semibold text-muted hover:text-espresso px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={12} /> Annulla
            </button>
            <button
              type="button"
              onClick={confirmPosition}
              disabled={saving}
              className="text-[11px] font-bold bg-espresso text-parchment px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-sienna transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {saving ? 'Salvo…' : 'Conferma'}
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && (
        <p className="text-[10px] text-muted mt-1.5">
          {coverUrl ? 'Passa il mouse sulla copertina per cambiarla o riposizionarla' : 'Formato 16:9 o orizzontale consigliato · JPG o PNG'}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { onUpload(f); e.target.value = '' } }}
      />
    </div>
  )
}
