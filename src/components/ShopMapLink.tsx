'use client'

import { MapPin } from 'lucide-react'

interface Props {
  shopId:  string
  address: string
  city:    string
  lat?:    number | null
  lng?:    number | null
}

export default function ShopMapLink({ shopId, address, city, lat, lng }: Props) {
  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}`)}`

  function handleClick() {
    fetch(`/api/shops/${shopId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'map_click' }),
    }).catch(() => {})
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="text-caption text-sienna flex items-center gap-1 hover:underline"
    >
      <MapPin size={12} /> {address}
    </a>
  )
}
