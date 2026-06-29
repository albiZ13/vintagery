'use client'

import { useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref      = useRef<HTMLDivElement>(null)
  const first    = useRef(true)

  useEffect(() => {
    // skip initial hydration — content already visible from SSR
    if (first.current) { first.current = false; return }
    const el = ref.current
    if (!el) return
    const anim = el.animate(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)'    },
      ],
      { duration: 360, easing: 'cubic-bezier(0.22,0.68,0,1.2)', fill: 'both' }
    )
    return () => anim.cancel()
  }, [pathname])

  return <div ref={ref}>{children}</div>
}
