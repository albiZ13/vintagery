import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'

function slugToCity(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function Image({ params }: { params: { city: string } }) {
  const cityName = slugToCity(decodeURIComponent(params.city))

  return new ImageResponse(
    (
      <div
        style={{
          background: '#1c2e4a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/* decorative circle */}
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(201,168,76,0.07)',
          top: -80,
          right: -80,
          display: 'flex',
        }} />

        {/* Top: logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '-0.5px' }}>V</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#f0ebe0', letterSpacing: '-0.5px' }}>intagery</span>
        </div>

        {/* Middle: city */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#c9a84c', margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Mercatini vintage a
          </p>
          <p style={{ fontSize: 80, fontWeight: 700, color: '#f0ebe0', margin: 0, lineHeight: 1.05, letterSpacing: '-1px' }}>
            {cityName}
          </p>
        </div>

        {/* Bottom: tagline */}
        <p style={{ fontSize: 20, color: 'rgba(240,235,224,0.4)', margin: 0 }}>
          Date, orari e info aggiornate — vintagery.it
        </p>
      </div>
    ),
    { ...size },
  )
}
