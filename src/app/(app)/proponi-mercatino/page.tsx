'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ITALIAN_REGIONS } from '@/types'
import type { Metadata } from 'next'

const EVENT_TYPES = [
  { value: 'mercatino',     label: 'Mercatino vintage / usato' },
  { value: 'antiquariato',  label: 'Fiera di antiquariato' },
  { value: 'vinokilo',      label: 'Kilo vintage' },
  { value: 'svuotacantina', label: 'Svuotacantina' },
  { value: 'brand_sale',    label: 'Brand sale / svendita' },
  { value: 'vinili',        label: 'Vinili & fumetti' },
]

const FREQUENCY_OPTIONS = [
  { value: '',             label: 'Non so / una tantum' },
  { value: 'settimanale',  label: 'Ogni settimana' },
  { value: 'mensile',      label: 'Una volta al mese' },
  { value: 'occasionale',  label: 'Qualche volta l\'anno' },
  { value: 'annuale',      label: 'Una volta l\'anno' },
]

export default function ProponiMercatinoPage() {
  const router = useRouter()

  const [name, setName]             = useState('')
  const [city, setCity]             = useState('')
  const [region, setRegion]         = useState('')
  const [address, setAddress]       = useState('')
  const [website, setWebsite]       = useState('')
  const [instagram, setInstagram]   = useState('')
  const [schedule, setSchedule]     = useState('')
  const [frequency, setFrequency]   = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType]   = useState('mercatino')
  const [email, setEmail]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !city.trim() || !region) {
      setError('Nome, città e regione sono obbligatori.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error: err } = await supabase.from('market_proposals').insert({
        name:        name.trim(),
        city:        city.trim(),
        region,
        address:     address.trim()  || null,
        website:     website.trim()  || null,
        instagram:   instagram.replace(/^@/, '').trim() || null,
        schedule:    schedule.trim() || null,
        frequency:   frequency       || null,
        description: description.trim() || null,
        event_type:  eventType,
        email:       email.trim()    || user?.email || null,
        user_id:     user?.id        ?? null,
      })

      if (err) throw err
      setDone(true)
    } catch (err) {
      setError('Errore durante l\'invio. Riprova tra qualche momento.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-espresso mb-2">Proposta inviata!</h1>
        <p className="text-muted text-sm max-w-xs mx-auto mb-8">
          Grazie per il contributo. Valuteremo la tua proposta e, se approvata, apparirà su Vintagery.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/mercatini" className="btn-primary px-6 py-2.5">Torna ai mercatini</Link>
          <button onClick={() => { setDone(false); setName(''); setCity(''); setRegion(''); setAddress(''); setWebsite(''); setInstagram(''); setSchedule(''); setFrequency(''); setDescription(''); setEmail('') }}
            className="btn-outline px-6 py-2.5">
            Proponi un altro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-espresso mb-1">Proponi un mercatino</h1>
        <p className="text-muted text-sm">
          Conosci un mercatino, una fiera o un evento vintage non ancora su Vintagery?
          Segnalacelo — lo valutiamo e, se tutto è a posto, lo aggiungiamo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-6 shadow-soft space-y-5">

        {/* Tipo */}
        <div>
          <label htmlFor="event-type" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
            Tipo *
          </label>
          <select id="event-type" value={eventType} onChange={e => setEventType(e.target.value)} className="input">
            {EVENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
            Nome del mercatino *
          </label>
          <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)}
            className="input" placeholder="es. Mercatino dell'Antiquariato di Ferrara" maxLength={150} />
        </div>

        {/* Città + Regione */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="city" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Città *
            </label>
            <input id="city" type="text" required value={city} onChange={e => setCity(e.target.value)}
              className="input" placeholder="es. Ferrara" maxLength={80} />
          </div>
          <div>
            <label htmlFor="region" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Regione *
            </label>
            <select id="region" required value={region} onChange={e => setRegion(e.target.value)} className="input">
              <option value="">Seleziona...</option>
              {ITALIAN_REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Indirizzo */}
        <div>
          <label htmlFor="address" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
            Indirizzo <span className="text-muted font-normal normal-case">— opzionale</span>
          </label>
          <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)}
            className="input" placeholder="es. Piazza Castello, Ferrara" maxLength={200} />
        </div>

        {/* Cadenza */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="frequency" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Con quale frequenza
            </label>
            <select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value)} className="input">
              {FREQUENCY_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="schedule" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Quando si tiene <span className="text-muted font-normal normal-case">— opz.</span>
            </label>
            <input id="schedule" type="text" value={schedule} onChange={e => setSchedule(e.target.value)}
              className="input" placeholder="es. Prima domenica del mese" maxLength={200} />
          </div>
        </div>

        {/* Website + Instagram */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="website" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Sito web <span className="text-muted font-normal normal-case">— opz.</span>
            </label>
            <input id="website" type="url" value={website} onChange={e => setWebsite(e.target.value)}
              className="input" placeholder="https://..." maxLength={300} />
          </div>
          <div>
            <label htmlFor="instagram" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
              Instagram <span className="text-muted font-normal normal-case">— opz.</span>
            </label>
            <input id="instagram" type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
              className="input" placeholder="@nomeutente" maxLength={60} />
          </div>
        </div>

        {/* Descrizione */}
        <div>
          <label htmlFor="description" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
            Note aggiuntive <span className="text-muted font-normal normal-case">— opzionale</span>
          </label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)}
            className="input resize-none" rows={3}
            placeholder="Qualsiasi informazione utile: tipo di merce, area espositiva, accesso..." maxLength={500} />
        </div>

        {/* Email di contatto */}
        <div>
          <label htmlFor="email" className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
            La tua email <span className="text-muted font-normal normal-case">— opzionale, per aggiornamenti</span>
          </label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="input" placeholder="tu@email.it" maxLength={150} />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2.5" role="alert">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2 !py-3">
          {submitting
            ? <><Loader2 size={16} className="animate-spin" /> Invio in corso...</>
            : <><Send size={16} /> Invia proposta</>
          }
        </button>

        <p className="text-[11px] text-muted text-center">
          Inviando accetti la nostra{' '}
          <Link href="/privacy" className="text-sienna hover:underline">privacy policy</Link>.
          Non usiamo questi dati per altri scopi.
        </p>
      </form>
    </div>
  )
}
