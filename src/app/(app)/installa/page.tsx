'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

type OS      = 'iphone' | 'android'
type Browser = 'safari' | 'chrome'

// ── Phone shell ───────────────────────────────────────────────────────────────

function PhoneShell({ dark = false, android = false, children }: { dark?: boolean; android?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      'relative mx-auto overflow-hidden shadow-card-hover flex flex-col',
      android ? 'w-[148px] h-[292px] rounded-[20px] border-[3px]' : 'w-[148px] h-[292px] rounded-[28px] border-[3px]',
      dark ? 'border-espresso bg-espresso' : 'border-espresso bg-[#f8f7f5]',
    )}>
      {!android && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[46px] h-[14px] rounded-full bg-espresso/[0.18] z-10" />
      )}
      {android && (
        <div className={cn('h-6 flex-shrink-0 flex items-center px-3', dark ? 'bg-espresso' : 'bg-cream')}>
          <span className={cn('text-[8px] font-medium', dark ? 'text-white/50' : 'text-espresso/50')}>9:41</span>
        </div>
      )}
      <div className={cn('flex-1 overflow-hidden flex flex-col', !android && 'mt-8')}>
        {children}
      </div>
      {!android && (
        <div className={cn('absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full', dark ? 'bg-white/20' : 'bg-espresso/15')} />
      )}
    </div>
  )
}

// ── Safari iPhone mockups ─────────────────────────────────────────────────────

function SafariMock1() {
  return (
    <PhoneShell>
      <div className="bg-cream px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 bg-white rounded-lg h-[22px] flex items-center justify-center border border-border">
          <span className="text-[8px] text-muted">vintagery.it</span>
        </div>
      </div>
      <div className="flex-1 bg-white px-2 pt-2 space-y-1.5">
        <div className="h-3 bg-espresso/[0.07] rounded-sm w-full" />
        <div className="h-2 bg-espresso/[0.05] rounded-sm w-4/5" />
        <div className="h-2 bg-espresso/[0.04] rounded-sm w-3/4" />
        <div className="h-2 bg-espresso/[0.03] rounded-sm w-2/3" />
        <div className="h-2 bg-espresso/[0.03] rounded-sm w-1/2" />
      </div>
      {/* Safari bottom bar — share highlighted */}
      <div className="bg-cream px-2 py-1.5 flex items-center justify-around flex-shrink-0 mb-4">
        <span className="text-espresso/25 text-[16px] leading-none">‹</span>
        <span className="text-espresso/25 text-[16px] leading-none">›</span>
        <div className="w-8 h-8 rounded-[9px] ring-2 ring-gold bg-gold/10 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </div>
        <span className="text-espresso/25 text-[13px]">⊞</span>
        <span className="text-espresso/25 text-[13px]">⋯</span>
      </div>
    </PhoneShell>
  )
}

function ShareSheetMock() {
  return (
    <PhoneShell>
      <div className="bg-cream px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 bg-white rounded-lg h-[22px] flex items-center justify-center border border-border">
          <span className="text-[8px] text-muted">vintagery.it</span>
        </div>
      </div>
      <div className="flex-1 bg-white/50" />
      {/* Share sheet */}
      <div className="bg-white rounded-t-[14px] border-t border-border flex-shrink-0">
        <div className="flex gap-2 px-2 py-2">
          {[...Array(4)].map((_, i) => <div key={i} className="w-9 h-9 rounded-[10px] bg-cream border border-border/50" />)}
        </div>
        <div className="border-t border-border/60" />
        <div className="text-[8.5px] text-coffee px-3 py-1.5 border-b border-border/60">Copia</div>
        <div className="text-[8.5px] font-bold text-gold px-3 py-2 bg-gold/[0.09] border-b border-gold/20 flex items-center justify-between">
          <span>Aggiungi a Home</span>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
        <div className="text-[8.5px] text-coffee px-3 py-1.5">Stampa</div>
      </div>
    </PhoneShell>
  )
}

function AddToHomeMock() {
  return (
    <PhoneShell>
      <div className="bg-cream px-2 py-1.5 flex items-center justify-between flex-shrink-0">
        <span className="text-[8px] text-[#007aff]">Annulla</span>
        <span className="text-[8px] font-semibold text-espresso">Aggiungi a Home</span>
        <div className="px-1.5 py-0.5 bg-gold/10 ring-2 ring-gold rounded-[6px]">
          <span className="text-[8px] font-bold text-gold">Aggiungi</span>
        </div>
      </div>
      <div className="flex-1 bg-white px-3 pt-4 flex flex-col items-center gap-1.5">
        <div className="w-14 h-14 rounded-[16px] bg-espresso flex items-center justify-center shadow-card">
          <svg viewBox="28 40 64 104" width="22" height="36" fill="none">
            <path d="M60,142 C40,108 30,94 30,72 A30,30 0 1 1 90,72 C90,94 80,108 60,142 Z" fill="white"/>
            <polygon points="60,50 63.54,68.46 82,72 63.54,75.54 60,94 56.46,75.54 38,72 56.46,68.46" fill="#C4A030"/>
          </svg>
        </div>
        <span className="text-[9px] font-bold text-espresso mt-1">Vintagery</span>
        <div className="w-full border border-border rounded-[7px] px-2 py-1 mt-1">
          <span className="text-[8px] text-coffee">Vintagery</span>
        </div>
        <span className="text-[8px] text-muted">vintagery.it</span>
      </div>
    </PhoneShell>
  )
}

function IphoneHomeMock() {
  return (
    <PhoneShell dark>
      <div className="flex-1 px-2 pt-1">
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(12)].map((_, i) => i === 5 ? (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 rounded-[11px] bg-espresso border-[2px] border-gold/80 flex items-center justify-center" style={{ boxShadow: '0 0 10px rgba(196,160,48,0.35)' }}>
                <svg viewBox="28 40 64 104" width="14" height="22" fill="none">
                  <path d="M60,142 C40,108 30,94 30,72 A30,30 0 1 1 90,72 C90,94 80,108 60,142 Z" fill="white"/>
                  <polygon points="60,50 63.54,68.46 82,72 63.54,75.54 60,94 56.46,75.54 38,72 56.46,68.46" fill="#C4A030"/>
                </svg>
              </div>
              <span className="text-[6px] text-white leading-none">Vintagery</span>
            </div>
          ) : (
            <div key={i} className="w-9 h-9 rounded-[11px] bg-white/10" />
          ))}
        </div>
      </div>
    </PhoneShell>
  )
}

// ── Chrome iPhone mockups ─────────────────────────────────────────────────────

function ChromeIphoneMock1() {
  return (
    <PhoneShell>
      {/* Chrome address bar */}
      <div className="bg-[#f1f3f4] px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 bg-white rounded-full h-[22px] flex items-center px-2 gap-1 border border-border">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>
          <span className="text-[8px] text-muted flex-1 text-center">vintagery.it</span>
        </div>
      </div>
      <div className="flex-1 bg-white px-2 pt-2 space-y-1.5">
        <div className="h-3 bg-espresso/[0.07] rounded-sm w-full" />
        <div className="h-2 bg-espresso/[0.05] rounded-sm w-4/5" />
        <div className="h-2 bg-espresso/[0.04] rounded-sm w-3/4" />
        <div className="h-2 bg-espresso/[0.03] rounded-sm w-2/3" />
        <div className="h-2 bg-espresso/[0.03] rounded-sm w-1/2" />
      </div>
      {/* Chrome bottom toolbar — share highlighted */}
      <div className="bg-[#f1f3f4] px-2 py-1.5 flex items-center justify-around flex-shrink-0 mb-4">
        <span className="text-espresso/25 text-[16px] leading-none">‹</span>
        <span className="text-espresso/25 text-[16px] leading-none">›</span>
        {/* Share button highlighted */}
        <div className="w-8 h-8 rounded-[9px] ring-2 ring-gold bg-gold/10 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="w-6 h-6 rounded border border-espresso/30 flex items-center justify-center">
          <span className="text-[9px] text-espresso/40 font-bold">2</span>
        </div>
        <div className="flex flex-col items-center gap-[2.5px]">
          {[...Array(3)].map((_, i) => <div key={i} className="w-[3.5px] h-[3.5px] rounded-full bg-espresso/30" />)}
        </div>
      </div>
    </PhoneShell>
  )
}

function ChromeIphoneMock2() {
  return (
    <PhoneShell>
      <div className="bg-[#f1f3f4] px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 bg-white rounded-full h-[22px] flex items-center px-2 border border-border">
          <span className="text-[8px] text-muted flex-1 text-center">vintagery.it</span>
        </div>
      </div>
      <div className="flex-1 bg-white/50" />
      {/* iOS Share Sheet (same as Safari — it's Apple's system sheet) */}
      <div className="bg-white rounded-t-[14px] border-t border-border flex-shrink-0">
        <div className="flex gap-2 px-2 py-2">
          {[...Array(4)].map((_, i) => <div key={i} className="w-9 h-9 rounded-[10px] bg-cream border border-border/50" />)}
        </div>
        <div className="border-t border-border/60" />
        <div className="text-[8.5px] text-coffee px-3 py-1.5 border-b border-border/60">Copia link</div>
        <div className="text-[8.5px] font-bold text-gold px-3 py-2 bg-gold/[0.09] border-b border-gold/20 flex items-center justify-between">
          <span>Aggiungi a Home</span>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#C4A030" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
        <div className="text-[8.5px] text-coffee px-3 py-1.5">Altre opzioni…</div>
      </div>
    </PhoneShell>
  )
}

// ── Android mockups ───────────────────────────────────────────────────────────

function AndroidMock1() {
  return (
    <PhoneShell android>
      <div className="bg-cream px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 bg-white rounded-[7px] h-[22px] flex items-center justify-center border border-border">
          <span className="text-[8px] text-muted">vintagery.it</span>
        </div>
        <div className="w-8 h-8 rounded-[6px] ring-2 ring-gold bg-gold/10 flex flex-col items-center justify-center gap-[2.5px]">
          {[...Array(3)].map((_, i) => <div key={i} className="w-[4px] h-[4px] rounded-full bg-gold" />)}
        </div>
      </div>
      <div className="flex-1 bg-white px-2 pt-2 space-y-1.5">
        <div className="h-3 bg-espresso/[0.07] rounded-sm w-full" />
        <div className="h-2 bg-espresso/[0.05] rounded-sm w-4/5" />
        <div className="h-2 bg-espresso/[0.04] rounded-sm w-3/4" />
        <div className="h-2 bg-espresso/[0.03] rounded-sm w-2/3" />
        <div className="h-2 bg-espresso/[0.03] rounded-sm w-1/2" />
      </div>
    </PhoneShell>
  )
}

function AndroidMock2() {
  return (
    <PhoneShell android>
      <div className="bg-cream px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 bg-white rounded-[7px] h-[22px] flex items-center justify-center border border-border">
          <span className="text-[8px] text-muted">vintagery.it</span>
        </div>
        <div className="w-8 h-8 flex flex-col items-center justify-center gap-[2.5px]">
          {[...Array(3)].map((_, i) => <div key={i} className="w-[4px] h-[4px] rounded-full bg-coffee/40" />)}
        </div>
      </div>
      <div className="flex-1 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[130px] bg-white rounded-bl-[10px] shadow-card-hover border border-border z-10 overflow-hidden">
          <div className="text-[8px] text-coffee px-2.5 py-1.5 border-b border-border/60">Nuova scheda</div>
          <div className="text-[8px] text-coffee px-2.5 py-1.5 border-b border-border/60">Preferiti</div>
          <div className="text-[8.5px] font-bold text-gold px-2.5 py-2 bg-gold/[0.08] border-b border-gold/20">
            Aggiungi a Home
          </div>
          <div className="text-[8px] text-coffee px-2.5 py-1.5 border-b border-border/60">Condividi...</div>
          <div className="text-[8px] text-coffee px-2.5 py-1.5">Impostazioni</div>
        </div>
      </div>
    </PhoneShell>
  )
}

function AndroidMock3() {
  return (
    <PhoneShell android>
      <div className="flex-1 bg-white/40 flex items-center justify-center px-3">
        <div className="w-full bg-white rounded-[14px] shadow-card-hover border border-border p-3 flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 rounded-[16px] bg-espresso flex items-center justify-center shadow-card">
            <svg viewBox="28 40 64 104" width="22" height="36" fill="none">
              <path d="M60,142 C40,108 30,94 30,72 A30,30 0 1 1 90,72 C90,94 80,108 60,142 Z" fill="white"/>
              <polygon points="60,50 63.54,68.46 82,72 63.54,75.54 60,94 56.46,75.54 38,72 56.46,68.46" fill="#C4A030"/>
            </svg>
          </div>
          <span className="text-[9px] font-bold text-espresso">Vintagery</span>
          <span className="text-[7px] text-muted">vintagery.it</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] text-coffee px-2">Annulla</span>
            <div className="px-2.5 py-1 bg-gold/10 ring-2 ring-gold rounded-[7px]">
              <span className="text-[8px] font-bold text-gold">Installa</span>
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  )
}

function AndroidHomeMock() {
  return (
    <PhoneShell android dark>
      <div className="flex-1 px-2 pt-1">
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(12)].map((_, i) => i === 7 ? (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 rounded-[10px] bg-espresso border-[2px] border-gold/80 flex items-center justify-center" style={{ boxShadow: '0 0 10px rgba(196,160,48,0.35)' }}>
                <svg viewBox="28 40 64 104" width="14" height="22" fill="none">
                  <path d="M60,142 C40,108 30,94 30,72 A30,30 0 1 1 90,72 C90,94 80,108 60,142 Z" fill="white"/>
                  <polygon points="60,50 63.54,68.46 82,72 63.54,75.54 60,94 56.46,75.54 38,72 56.46,68.46" fill="#C4A030"/>
                </svg>
              </div>
              <span className="text-[6px] text-white leading-none">Vintagery</span>
            </div>
          ) : (
            <div key={i} className="w-9 h-9 rounded-[10px] bg-white/10" />
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3">
          {['◁','○','□'].map(s => <span key={s} className="text-[10px] text-white/30">{s}</span>)}
        </div>
      </div>
    </PhoneShell>
  )
}

// ── Steps data ────────────────────────────────────────────────────────────────

const SAFARI_STEPS = [
  {
    title: 'Apri Safari e vai su vintagery.it',
    desc: 'Assicurati di usare Safari (il browser predefinito di Apple). In basso trovi la barra degli strumenti con l\'icona di condivisione.',
    Mock: SafariMock1,
  },
  {
    title: 'Tocca il pulsante Condividi (↑)',
    desc: 'In basso al centro, tocca l\'icona con la freccia verso l\'alto. Si apre il foglio di condivisione di iOS.',
    Mock: ShareSheetMock,
  },
  {
    title: 'Tocca "Aggiungi a Home" e conferma',
    desc: 'Scorri il menu e tocca "Aggiungi a schermata Home". Nella schermata successiva tocca "Aggiungi" in alto a destra.',
    Mock: AddToHomeMock,
  },
  {
    title: 'Vintagery è sulla tua schermata Home',
    desc: 'Si apre come un\'app vera — a schermo intero, senza barra del browser. Cercala tra le altre app.',
    Mock: IphoneHomeMock,
  },
]

const CHROME_IPHONE_STEPS = [
  {
    title: 'Apri Chrome e vai su vintagery.it',
    desc: 'Apri Chrome su iPhone. In basso trovi la barra degli strumenti. Tocca l\'icona Condividi (la freccia verso l\'alto, al centro).',
    Mock: ChromeIphoneMock1,
  },
  {
    title: 'Nel foglio iOS tocca "Aggiungi a Home"',
    desc: 'Si apre il foglio di condivisione di Apple. Scorri verso il basso fino a "Aggiungi a schermata Home" e toccalo.',
    Mock: ChromeIphoneMock2,
  },
  {
    title: 'Conferma il nome e tocca "Aggiungi"',
    desc: 'Appare la stessa schermata di Safari. Il nome è già "Vintagery" — tocca "Aggiungi" in alto a destra per completare.',
    Mock: AddToHomeMock,
  },
  {
    title: 'Vintagery è sulla tua schermata Home',
    desc: 'L\'icona compare tra le tue app e si apre a schermo intero, esattamente come un\'app nativa.',
    Mock: IphoneHomeMock,
  },
]

const ANDROID_STEPS = [
  {
    title: 'Apri Chrome e vai su vintagery.it',
    desc: 'Usa Chrome (o Samsung Internet). In alto a destra trovi il menu con i tre puntini verticali — toccalo.',
    Mock: AndroidMock1,
  },
  {
    title: 'Tocca "Aggiungi a schermata Home"',
    desc: 'Nel menu a tendina cerca "Aggiungi a schermata Home" o "Installa app". La voce cambia leggermente a seconda della versione di Chrome.',
    Mock: AndroidMock2,
  },
  {
    title: 'Tocca "Installa" nella finestra di conferma',
    desc: 'Appare una finestra con l\'icona dell\'app. Tocca "Installa" per aggiungere Vintagery alla schermata Home.',
    Mock: AndroidMock3,
  },
  {
    title: 'Vintagery è sulla tua schermata Home',
    desc: 'L\'icona compare tra le tue app. Si apre a schermo intero, esattamente come un\'app scaricata da Google Play.',
    Mock: AndroidHomeMock,
  },
]

// ── Icon components ───────────────────────────────────────────────────────────

function AppleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function AndroidIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 0 0 6 7h12a5.983 5.983 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
    </svg>
  )
}

function ChromeIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <circle cx="12" cy="12" r="10" fill="#4285F4"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
      <path d="M12 8h8.66A10 10 0 0 0 4 7.26L8 14a4 4 0 0 1 4-6z" fill="#EA4335"/>
      <path d="M6.35 17.24L2.7 11A10 10 0 0 0 12 22l4-6.93a4 4 0 0 1-9.65 2.17z" fill="#34A853"/>
      <path d="M12 8h8.66a10 10 0 0 1-6.01 14.07L10.64 15A4 4 0 0 0 16 12h-4V8z" fill="#FBBC05"/>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InstallaPage() {
  const [os,      setOs]      = useState<OS>('iphone')
  const [browser, setBrowser] = useState<Browser>('safari')

  const steps = os === 'android'
    ? ANDROID_STEPS
    : browser === 'safari'
    ? SAFARI_STEPS
    : CHROME_IPHONE_STEPS

  return (
    <div className="min-h-screen bg-parchment">

      <div className="max-w-2xl mx-auto px-4 pt-5">
        <Link href="/home" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-espresso transition-colors">
          <ArrowLeft size={14} />
          Indietro
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">

        {/* Hero */}
        <div className="pt-6 pb-8 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-espresso flex items-center justify-center mx-auto mb-5 shadow-card-hover">
            <Smartphone size={28} className="text-gold" />
          </div>
          <h1 className="font-serif font-bold text-[28px] text-espresso mb-2 tracking-tight">Installa Vintagery</h1>
          <p className="text-[14px] text-muted max-w-xs mx-auto leading-relaxed">
            Non serve l'App Store o Google Play. Aggiungi Vintagery direttamente alla schermata Home del tuo telefono.
          </p>
        </div>

        {/* OS selector */}
        <div className="flex items-center gap-1.5 p-1 bg-cream rounded-[14px] border border-border mb-4 max-w-[280px] mx-auto">
          <button
            onClick={() => setOs('iphone')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[11px] text-[13px] font-semibold transition-all',
              os === 'iphone' ? 'bg-white text-espresso shadow-card' : 'text-muted hover:text-coffee',
            )}
          >
            <AppleIcon /> iPhone · iPad
          </button>
          <button
            onClick={() => setOs('android')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[11px] text-[13px] font-semibold transition-all',
              os === 'android' ? 'bg-white text-espresso shadow-card' : 'text-muted hover:text-coffee',
            )}
          >
            <AndroidIcon /> Android
          </button>
        </div>

        {/* Browser sub-selector (iPhone only) */}
        {os === 'iphone' && (
          <div className="flex items-center gap-2 max-w-[280px] mx-auto mb-10">
            <button
              onClick={() => setBrowser('safari')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[12px] font-medium border transition-all',
                browser === 'safari'
                  ? 'border-espresso/30 bg-espresso/[0.05] text-espresso'
                  : 'border-border text-muted hover:text-coffee hover:border-espresso/20',
              )}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/>
                <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
              </svg>
              Safari
            </button>
            <button
              onClick={() => setBrowser('chrome')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[12px] font-medium border transition-all',
                browser === 'chrome'
                  ? 'border-espresso/30 bg-espresso/[0.05] text-espresso'
                  : 'border-border text-muted hover:text-coffee hover:border-espresso/20',
              )}
            >
              <ChromeIcon /> Chrome
            </button>
          </div>
        )}

        {/* Spacer when Android (no sub-selector) */}
        {os === 'android' && <div className="mb-10" />}

        {/* Steps */}
        <div className="space-y-8">
          {steps.map(({ title, desc, Mock }, i) => (
            <div key={`${os}-${browser}-${i}`} className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <Mock />
              </div>
              <div className="flex-1 sm:pt-8">
                <div className="flex items-start gap-3 mb-2">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-espresso text-parchment text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <h2 className="font-serif font-bold text-[17px] text-espresso leading-snug">{title}</h2>
                </div>
                <p className="text-[13px] text-coffee leading-relaxed pl-9">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Note PWA */}
        <div className="mt-10 p-4 bg-cream border border-border rounded-xl text-center">
          <p className="text-[13px] text-coffee font-medium mb-1">Perché non c'è nell'App Store?</p>
          <p className="text-[12px] text-muted leading-relaxed">
            Vintagery è una Progressive Web App (PWA). Funziona come un'app nativa — si apre a schermo intero, riceve notifiche, funziona offline — senza dover essere approvata e distribuita dagli store.
          </p>
        </div>

        <div className="mt-4 p-4 bg-espresso/[0.04] border border-espresso/10 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-espresso/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F2040" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-espresso mb-0.5">App nativa in arrivo</p>
            <p className="text-[12px] text-muted leading-relaxed">
              L'obiettivo è rilasciare Vintagery come app nativa su App Store e Google Play. Nel frattempo, la versione PWA offre già un'esperienza completa direttamente dalla schermata Home.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
