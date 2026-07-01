import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vintagery — Mercatini & Negozi Vintage in Italia'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1c2e4a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* decorative circle */}
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'rgba(201,168,76,0.08)',
          top: -100,
          right: -100,
          display: 'flex',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <p style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#f0ebe0',
            letterSpacing: '-1px',
            margin: 0,
          }}>
            <span style={{ color: '#c9a84c' }}>V</span>intagery
          </p>
          <p style={{
            fontSize: 26,
            color: '#c9a84c',
            margin: 0,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Mercatini &amp; Negozi Vintage in Italia
          </p>
        </div>

        <p style={{
          position: 'absolute',
          bottom: 36,
          fontSize: 18,
          color: 'rgba(240,235,224,0.35)',
          margin: 0,
        }}>
          vintagery.it
        </p>
      </div>
    ),
    { ...size },
  )
}
