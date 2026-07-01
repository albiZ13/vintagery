'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle2, Loader2, AlertCircle, MapPin, Globe, Instagram, Calendar, RefreshCw, FileText, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { ITALIAN_REGIONS } from '@/types'

const EVENT_TYPES = [
  { value: 'mercatino',     label: 'Mercatino vintage',    emoji: '🛍',  desc: 'Usato, vintage, seconda mano' },
  { value: 'antiquariato',  label: 'Antiquariato',         emoji: '🏺',  desc: 'Fiere e mercati d\'epoca' },
  { value: 'vinokilo',      label: 'Kilo vintage',         emoji: '⚖️',  desc: 'Vendita al chilo' },
  { value: 'svuotacantina', label: 'Svuotacantina',        emoji: '📦',  desc: 'Privati e garage sale' },
  { value: 'brand_sale',    label: 'Brand sale',           emoji: '🏷️',  desc: 'Svendite e sample sale' },
  { value: 'vinili',        label: 'Vinili & fumetti',     emoji: '🎵',  desc: 'Dischi, libri, collectibles' },
]

const FREQUENCY_OPTIONS = [
  { value: '',             label: 'Non so / una tantum' },
  { value: 'settimanale',  label: 'Ogni settimana' },
  { value: 'mensile',      label: 'Una volta al mese' },
  { value: 'occasionale',  label: 'Qualche volta l\'anno' },
  { value: 'annuale',      label: 'Una volta l\'anno' },
]

function SectionLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
      <Icon size={13} className="text-gold" />
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{children}</span>
    </div>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-coffee uppercase tracking-[0.08em] mb-1.5">
        {label}
        {optional && <span className="ml-1.5 text-muted font-normal normal-case">— opzionale</span>}
      </label>
      {children}
    </div>
  )
}

export default function ProponiMercatinoPage() {
  const [name, setName]               = useState('')
  const [city, setCity]               = useState('')
  const [region, setRegion]           = useState('')
  const [address, setAddress]         = useState('')
  const [website, setWebsite]         = useState('')
  const [instagram, setInstagram]     = useState('')
  const [schedule, setSchedule]       = useState('')
  const [frequency, setFrequency]     = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType]     = useState('mercatino')
  const [email, setEmail]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

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
    } catch {
      setError('Errore durante l\'invio. Riprova tra qualche momento.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setDone(false); setName(''); setCity(''); setRegion(''); setAddress('')
    setWebsite(''); setInstagram(''); setSchedule(''); setFrequency('')
    setDescription(''); setEmail(''); setEventType('mercatino')
  }

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} className="text-gold" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-espresso mb-3">Grazie!</h1>
          <p className="text-muted text-[15px] leading-relaxed max-w-xs mx-auto mb-8">
            La tua segnalazione è arrivata. La valutiamo e, se tutto è a posto, il mercatino apparirà su Vintagery.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/mercatini" className="btn-primary px-6 py-2.5">Torna ai mercatini</Link>
            <button onClick={resetForm} className="btn-outline px-6 py-2.5">Segnala un altro</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="bg-espresso relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #C4A030 0%, transparent 60%), radial-gradient(circle at 80% 20%, #B53A1E 0%, transparent 50%)' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-6">
            <MapPin size={11} className="text-gold" />
            <span className="text-[11px] font-semibold text-gold uppercase tracking-[0.15em]">Segnalazione mercatino</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-parchment mb-4 leading-tight">
            Conosci un mercatino<br />
            <span className="text-gold">non ancora su Vintagery?</span>
          </h1>
          <p className="text-parchment/60 text-[15px] max-w-md mx-auto leading-relaxed">
            Segnalacelo in due minuti. Se è verificabile, lo aggiungiamo alla directory e lo vedono tutti.
          </p>
        </div>
      </div>

      {/* ── FORM ─────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Tipo evento */}
          <div>
            <SectionLabel icon={FileText}>Che tipo di evento è?</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEventType(t.value)}
                  className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
                    eventType === t.value
                      ? 'border-gold bg-gold/5 shadow-[0_0_0_1px_rgba(196,160,48,0.2)]'
                      : 'border-border bg-white hover:border-border-strong hover:shadow-sm'
                  }`}
                >
                  <span className="text-2xl leading-none block mb-1.5">{t.emoji}</span>
                  <p className={`text-[12px] font-semibold leading-snug ${eventType === t.value ? 'text-espresso' : 'text-coffee'}`}>
                    {t.label}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5 leading-snug">{t.desc}</p>
                  {eventType === t.value && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-gold" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Informazioni base */}
          <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <SectionLabel icon={MapPin}>Dove si trova</SectionLabel>

            <Field label="Nome del mercatino *">
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="input" placeholder="es. Mercatino dell'Antiquariato di Ferrara" maxLength={150} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Città *">
                <input type="text" required value={city} onChange={e => setCity(e.target.value)}
                  className="input" placeholder="es. Ferrara" maxLength={80} />
              </Field>
              <Field label="Regione *">
                <select required value={region} onChange={e => setRegion(e.target.value)} className="input">
                  <option value="">Seleziona...</option>
                  {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Indirizzo" optional>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                className="input" placeholder="es. Piazza Castello" maxLength={200} />
            </Field>
          </div>

          {/* Quando si tiene */}
          <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <SectionLabel icon={Calendar}>Quando si tiene</SectionLabel>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Frequenza">
                <select value={frequency} onChange={e => setFrequency(e.target.value)} className="input">
                  {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </Field>
              <Field label="Quando esattamente" optional>
                <input type="text" value={schedule} onChange={e => setSchedule(e.target.value)}
                  className="input" placeholder="es. Prima domenica del mese" maxLength={200} />
              </Field>
            </div>
          </div>

          {/* Online */}
          <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <SectionLabel icon={Globe}>Riferimenti online</SectionLabel>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sito web" optional>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                  className="input" placeholder="https://..." maxLength={300} />
              </Field>
              <Field label="Instagram" optional>
                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
                  className="input" placeholder="@nomeutente" maxLength={60} />
              </Field>
            </div>
          </div>

          {/* Note + contatto */}
          <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <SectionLabel icon={FileText}>Note e contatto</SectionLabel>

            <Field label="Note aggiuntive" optional>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="input resize-none" rows={3}
                placeholder="Tipo di merce, area espositiva, accesso, parcheggio…" maxLength={500} />
            </Field>

            <Field label="La tua email" optional>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input pl-8" placeholder="tu@email.it — per ricevere aggiornamenti" maxLength={150} />
              </div>
            </Field>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-espresso hover:bg-coffee text-parchment font-semibold text-[14px] py-3.5 rounded-xl transition-colors shadow-[0_2px_12px_rgba(15,32,64,0.18)]">
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> Invio in corso…</>
                : <><Send size={15} /> Invia segnalazione</>}
            </button>
            <p className="text-[11px] text-muted text-center">
              Inviando accetti la nostra{' '}
              <Link href="/privacy" className="text-sienna hover:underline">privacy policy</Link>.
              Non usiamo questi dati per altri scopi.
            </p>
          </div>

        </form>
      </div>
    </div>
  )
}
