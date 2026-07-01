import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

export const metadata: Metadata = {
  title: { default: 'Vintagery', template: '%s | Vintagery' },
  description: 'Scopri mercatini vintage, fiere di antiquariato e negozi in tutta Italia. Porta Portese, Gran Balon, Fiera Antiquaria Arezzo e molto altro.',
  keywords: ['mercatini vintage italia', 'negozi vintage', 'antiquariato', 'flea market italia', 'mercato delle pulci', 'vinokilo'],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'Vintagery',
    locale: 'it_IT',
    type: 'website',
    title: 'Vintagery — Mercatini & Negozi Vintage in Italia',
    description: 'La mappa del vintage italiano. Mercatini, fiere di antiquariato, negozi vintage in tutte le regioni.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vintagery — Mercatini & Negozi Vintage in Italia',
    description: 'La mappa del vintage italiano. Mercatini, fiere, negozi.',
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#1E1208',
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vintagery',
  url: SITE_URL,
  description: 'Directory italiana di mercatini vintage, antiquariato e negozi second hand.',
  inLanguage: 'it',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/negozi?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vintagery',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-192.png`,
  sameAs: ['https://www.tiktok.com/@vintagery_'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        {children}
        <Suspense fallback={null}><Analytics /></Suspense>
        <Suspense fallback={null}><SpeedInsights /></Suspense>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </body>
    </html>
  )
}
