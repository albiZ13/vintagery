'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, CheckCircle } from 'lucide-react'
import { ITALIAN_REGIONS, MONTHS_IT } from '@/types'
import { cn } from '@/lib/utils'

interface MarketForm {
  name: string
  city: string
  region: string
  address: string
  description: string
  website: string
  instagram: string
  phone: string
  organizer_name: string
  frequency: string
  schedule_notes: string
  next_date: string
  start_time: string
  end_time: string
  price_info: string
  categories: string
  tips: string
  active_months: number[]
  is_verified: boolean
  is_featured: boolean
}

export interface SavedMarket {
  id: string
  name: string
  city: string
  region: string
  next_date: string | null
  is_verified: boolean
  is_featured: boolean
  categories: string[]
  frequency: string | null
}

const EMPTY: MarketForm = {
  name: '', city: '', region: '', address: '', description: '',
  website: '', instagram: '', phone: '', organizer_name: '', frequency: '',
  schedule_notes: '', next_date: '', start_time: '', end_time: '',
  price_info: '', categories: '', tips: '', active_months: [],
  is_verified: false, is_featured: false,
}

async function adminAction(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

interface Props {
  marketId: string | 'new'
  initialData?: Partial<MarketForm>
  onClose: () => void
  onSaved: (market: SavedMarket, isNew: boolean) => void
}

export default function MarketEditor({ marketId, initialData, onClose, onSaved }: Props) {
  const [form, setForm]     = useState<MarketForm>(initialData ? { ...EMPTY, ...initialData } : EMPTY)
  const [loading, setLoading] = useState(marketId !== 'new')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [saved, setSaved]   = useState(false)

  const isNew = marketId === 'new'

  useEffect(() => {
    if (isNew) { setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY); return }
    setLoading(true)
    adminAction({ type: 'market_get', id: marketId }).then(res => {
      const d = res.data
      if (!d) { setLoading(false); return }
      setForm({
        name:           d.name            ?? '',
        city:           d.city            ?? '',
        region:         d.region          ?? '',
        address:        d.address         ?? '',
        description:    d.description     ?? '',
        website:        d.website         ?? '',
        instagram:      d.instagram       ?? '',
        phone:          d.phone           ?? '',
        organizer_name: d.organizer_name  ?? '',
        frequency:      d.frequency       ?? '',
        schedule_notes: d.schedule_notes  ?? '',
        next_date:      d.next_date       ?? '',
        start_time:     d.start_time      ?? '',
        end_time:       d.end_time        ?? '',
        price_info:     d.price_info      ?? '',
        categories:     (d.categories ?? []).join(', '),
        tips:           d.tips            ?? '',
        active_months:  d.active_months   ?? [],
        is_verified:    d.is_verified     ?? false,
        is_featured:    d.is_featured     ?? false,
      })
      setLoading(false)
    })
  }, [marketId, isNew])

  function set<K extends keyof MarketForm>(key: K, val: MarketForm[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleMonth(m: number) {
    setForm(f => ({
      ...f,
      active_months: f.active_months.includes(m)
        ? f.active_months.filter(x => x !== m)
        : [...f.active_months, m].sort((a, b) => a - b),
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.city.trim() || !form.region) {
      setError('Nome, città e regione sono obbligatori.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await adminAction({
      type:           'market_upsert',
      ...(isNew ? {} : { id: marketId }),
      name:           form.name.trim(),
      city:           form.city.trim(),
      region:         form.region,
      address:        form.address.trim()        || null,
      description:    form.description.trim()    || null,
      website:        form.website.trim()         || null,
      instagram:      form.instagram.replace(/^@/, '').trim() || null,
      phone:          form.phone.trim()           || null,
      organizer_name: form.organizer_name.trim()  || null,
      frequency:      form.frequency              || null,
      schedule_notes: form.schedule_notes.trim()  || null,
      next_date:      form.next_date              || null,
      start_time:     form.start_time             || null,
      end_time:       form.end_time               || null,
      price_info:     form.price_info.trim()      || null,
      categories:     form.categories
        ? form.categories.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : [],
      tips:           form.tips.trim()            || null,
      active_months:  form.active_months.length   ? form.active_months : null,
      is_verified:    form.is_verified,
      is_featured:    form.is_featured,
    })

    setSaving(false)

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved({
        id:          res.id ?? marketId as string,
        name:        form.name.trim(),
        city:        form.city.trim(),
        region:      form.region,
        next_date:   form.next_date   || null,
        is_verified: form.is_verified,
        is_featured: form.is_featured,
        categories:  form.categories
          ? form.categories.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
          : [],
        frequency:   form.frequency || null,
      }, isNew)
      if (isNew) setForm(EMPTY)
    } else {
      setError(res.error ?? 'Errore durante il salvataggio. Riprova.')
    }
  }

  const inp = "w-full bg-white border border-border rounded-xl px-3 py-2 text-[13px] text-espresso placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-espresso/20 focus:border-espresso/40"
  const lbl = "block text-[10px] font-bold uppercase tracking-[0.15em] text-coffee/70 mb-1.5"

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#f4f2ef] z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border/60 flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-espresso text-[16px]">
              {isNew ? 'Nuovo mercatino' : 'Modifica mercatino'}
            </h2>
            {!isNew && !loading && form.name && (
              <p className="text-[11px] text-muted mt-0.5 truncate max-w-[280px]">{form.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-green-700">
                <CheckCircle size={13} /> Salvato
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-muted hover:text-espresso hover:bg-cream transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
            <div className="px-6 py-5 space-y-6 flex-1">

              {/* Stato toggles */}
              <div className="flex items-center gap-5 bg-white border border-border rounded-xl px-4 py-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => set('is_verified', !form.is_verified)}
                    className={cn(
                      'w-9 h-5 rounded-full relative transition-colors cursor-pointer',
                      form.is_verified ? 'bg-green-500' : 'bg-border'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      form.is_verified ? 'translate-x-4' : 'translate-x-0.5'
                    )} />
                  </div>
                  <span className="text-[12px] font-semibold text-coffee">Verificato</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => set('is_featured', !form.is_featured)}
                    className={cn(
                      'w-9 h-5 rounded-full relative transition-colors cursor-pointer',
                      form.is_featured ? 'bg-gold' : 'bg-border'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      form.is_featured ? 'translate-x-4' : 'translate-x-0.5'
                    )} />
                  </div>
                  <span className="text-[12px] font-semibold text-coffee">In evidenza</span>
                </label>
              </div>

              {/* ── Identità ── */}
              <section className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted/50">Identità</p>
                <div>
                  <label className={lbl}>Nome *</label>
                  <input type="text" className={inp} required maxLength={200}
                    placeholder="es. Fiera Antiquaria di Arezzo"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Frequenza</label>
                    <select className={inp} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                      <option value="">— nessuna —</option>
                      <option value="settimanale">Settimanale</option>
                      <option value="mensile">Mensile</option>
                      <option value="occasionale">Occasionale</option>
                      <option value="annuale">Annuale</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Categorie</label>
                    <input type="text" className={inp}
                      placeholder="antiquariato, vintage"
                      value={form.categories} onChange={e => set('categories', e.target.value)} />
                    <p className="text-[10px] text-muted mt-1">separate da virgola, minuscolo</p>
                  </div>
                </div>
              </section>

              {/* ── Luogo ── */}
              <section className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted/50">Luogo</p>
                <div>
                  <label className={lbl}>Indirizzo</label>
                  <input type="text" className={inp}
                    placeholder="es. Piazza Grande, Arezzo"
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Città *</label>
                    <input type="text" className={inp} required
                      placeholder="es. Arezzo"
                      value={form.city} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Regione *</label>
                    <select className={inp} required value={form.region} onChange={e => set('region', e.target.value)}>
                      <option value="">Seleziona...</option>
                      {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* ── Calendario ── */}
              <section className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted/50">Calendario</p>
                <div>
                  <label className={lbl}>Note cadenza</label>
                  <input type="text" className={inp}
                    placeholder="es. Prima domenica del mese, ore 8-19"
                    value={form.schedule_notes} onChange={e => set('schedule_notes', e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Prossima data</label>
                    <input type="date" className={inp}
                      value={form.next_date} onChange={e => set('next_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Apertura</label>
                    <input type="time" className={inp}
                      value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Chiusura</label>
                    <input type="time" className={inp}
                      value={form.end_time} onChange={e => set('end_time', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Mesi attivi</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MONTHS_IT.map((month, i) => {
                      const m = i + 1
                      const active = form.active_months.includes(m)
                      return (
                        <button key={m} type="button" onClick={() => toggleMonth(m)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                            active
                              ? 'bg-espresso text-parchment border-espresso'
                              : 'bg-white text-muted border-border hover:border-espresso/30',
                          )}>
                          {month.slice(0, 3)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className={lbl}>Ingresso</label>
                  <input type="text" className={inp}
                    placeholder="es. Ingresso gratuito, oppure €5"
                    value={form.price_info} onChange={e => set('price_info', e.target.value)} />
                </div>
              </section>

              {/* ── Contatti ── */}
              <section className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted/50">Link e contatti</p>
                <div>
                  <label className={lbl}>Sito web</label>
                  <input type="url" className={inp}
                    placeholder="https://..."
                    value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Instagram</label>
                    <input type="text" className={inp}
                      placeholder="@nomeutente"
                      value={form.instagram} onChange={e => set('instagram', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Telefono</label>
                    <input type="tel" className={inp}
                      placeholder="+39 000 000 0000"
                      value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Organizzatore</label>
                  <input type="text" className={inp}
                    placeholder="es. Comune di Arezzo"
                    value={form.organizer_name} onChange={e => set('organizer_name', e.target.value)} />
                </div>
              </section>

              {/* ── Contenuto ── */}
              <section className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted/50">Contenuto</p>
                <div>
                  <label className={lbl}>Descrizione</label>
                  <textarea
                    className={`${inp} resize-none`}
                    rows={5}
                    maxLength={2000}
                    placeholder="Storia, carattere, cosa si trova…"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                </div>
                <div>
                  <label className={lbl}>Consiglio pratico</label>
                  <textarea
                    className={`${inp} resize-none`}
                    rows={3}
                    maxLength={500}
                    placeholder="Un consiglio specifico per i visitatori…"
                    value={form.tips}
                    onChange={e => set('tips', e.target.value)}
                  />
                </div>
              </section>

              {error && (
                <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-border/60 px-6 py-4 flex items-center gap-3 flex-shrink-0">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-espresso text-parchment font-semibold py-2.5 rounded-xl text-[13px] hover:bg-sienna transition-colors disabled:opacity-40"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvataggio…</>
                  : <><Save size={14} /> {isNew ? 'Crea mercatino' : 'Salva modifiche'}</>
                }
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted hover:border-espresso/30 hover:text-espresso transition-colors"
              >
                Chiudi
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
