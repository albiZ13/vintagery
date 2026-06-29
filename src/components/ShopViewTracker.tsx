'use client'

import { useEffect } from 'react'

export default function ShopViewTracker({ shopId }: { shopId: string }) {
  useEffect(() => {
    fetch(`/api/shops/${shopId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'view' }),
    }).catch(() => {})
  }, [shopId])

  return null
}
