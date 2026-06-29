'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const KEY = 'vintagery_region'

export default function RegionPersist() {
  const searchParams = useSearchParams()
  const router      = useRouter()
  const pathname    = usePathname()
  const region      = searchParams.get('region') ?? 'all'

  // Salva la provincia ogni volta che cambia
  useEffect(() => {
    if (region !== 'all') localStorage.setItem(KEY, region)
  }, [region])

  // Al mount: se nessuna provincia è selezionata, ripristina l'ultima usata
  useEffect(() => {
    if (region !== 'all') return
    const saved = localStorage.getItem(KEY)
    if (!saved || saved === 'all') return
    const params = new URLSearchParams(searchParams.toString())
    params.set('region', saved)
    router.replace(`${pathname}?${params.toString()}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
