'use client'

import { useState } from 'react'
import StarRating from './StarRating'
import { createClient } from '@/lib/supabase'

interface Props {
  targetType: 'market' | 'shop'
  targetId: string
  onSuccess?: () => void
}

export default function ReviewForm({ targetType, targetId, onSuccess }: Props) {
  const supabase = createClient()
  const [rating, setRating]   = useState(0)
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Seleziona un voto'); return }
    setLoading(true); setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Devi accedere per lasciare una recensione'); setLoading(false); return }

    const { error: err } = await supabase.from('reviews').insert({
      user_id: user.id, target_type: targetType, target_id: targetId,
      rating, title: title || null, body: body || null,
    })

    setLoading(false)
    if (err) {
      if (err.code === '23505') setError('Hai già recensito questo posto')
      else setError('Errore durante il salvataggio. Riprova.')
    } else {
      setRating(0); setTitle(''); setBody('')
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface-soft border border-border rounded-lg p-5" aria-label="Modulo recensione">
      <h3 className="font-serif font-semibold text-espresso text-[17px] mb-4">Scrivi una recensione</h3>

      <div className="mb-4">
        <p id="rating-label" className="text-caption text-muted mb-2">Il tuo voto *</p>
        <StarRating rating={rating} size={28} interactive onChange={setRating} aria-labelledby="rating-label" />
      </div>

      <div className="mb-3">
        <label htmlFor="review-title" className="sr-only">Titolo recensione</label>
        <input
          id="review-title"
          className="input"
          placeholder="Titolo (opzionale)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="review-body" className="sr-only">Testo recensione</label>
        <textarea
          id="review-body"
          className="input resize-none"
          rows={4}
          placeholder="Racconta la tua esperienza..."
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={1000}
        />
        <p className="text-[11px] text-muted mt-1 text-right" aria-live="polite">{body.length}/1000</p>
      </div>

      {error && <p role="alert" className="text-red-600 text-body-sm mb-3">{error}</p>}

      <button type="submit" disabled={loading || !rating} className="btn-primary w-full disabled:opacity-60">
        {loading ? 'Salvataggio...' : 'Pubblica recensione'}
      </button>
    </form>
  )
}
