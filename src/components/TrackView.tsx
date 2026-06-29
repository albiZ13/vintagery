'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const SESSION_KEY    = 'vg_sid'
const SESSION_TS_KEY = 'vg_sts'
const LAST_PATH_KEY  = 'vg_lp'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 min inactivity → new session

function getOrCreateSession(): string {
  try {
    const sid = sessionStorage.getItem(SESSION_KEY)
    const ts  = Number(sessionStorage.getItem(SESSION_TS_KEY) ?? 0)
    const now = Date.now()

    if (sid && now - ts < SESSION_TTL_MS) {
      sessionStorage.setItem(SESSION_TS_KEY, String(now))
      return sid
    }

    const newSid = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY,    newSid)
    sessionStorage.setItem(SESSION_TS_KEY, String(now))
    return newSid
  } catch {
    return 'anon'
  }
}

function getLastPathInfo(): { path: string; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(LAST_PATH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function setLastPathInfo(path: string) {
  try {
    sessionStorage.setItem(LAST_PATH_KEY, JSON.stringify({ path, ts: Date.now() }))
  } catch {}
}

interface Props {
  marketId?: string
  shopId?: string
}

export default function TrackView({ marketId, shopId }: Props) {
  const pathname    = usePathname()
  const prevPath    = useRef<string | null>(null)
  const pageEnterTs = useRef<number>(Date.now())

  useEffect(() => {
    // Skip the same path if navigated twice without change
    if (prevPath.current === pathname) return
    prevPath.current = pathname
    pageEnterTs.current = Date.now()

    const sessionId = getOrCreateSession()
    const last      = getLastPathInfo()

    // Calculate duration spent on the PREVIOUS page
    const durationSec = last
      ? Math.round((Date.now() - last.ts) / 1000)
      : null

    setLastPathInfo(pathname)

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path:         pathname,
        market_id:    marketId ?? null,
        shop_id:      shopId   ?? null,
        session_id:   sessionId,
        duration_sec: durationSec && durationSec > 0 && durationSec < 3600
          ? durationSec
          : null,
      }),
    }).catch(() => {})
  }, [pathname, marketId, shopId])

  return null
}
