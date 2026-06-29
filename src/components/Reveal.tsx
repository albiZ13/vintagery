'use client'

import { useRef, useEffect, type ReactNode } from 'react'

interface Props {
  children:   ReactNode
  delay?:     number           // ms
  from?:      'up' | 'left' | 'right'
  distance?:  number           // px
  duration?:  number           // ms
  className?: string
}

export default function Reveal({
  children,
  delay    = 0,
  from     = 'up',
  distance = 30,
  duration = 600,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const start: Keyframe = {
      opacity: 0,
      transform:
        from === 'up'    ? `translateY(${distance}px)` :
        from === 'left'  ? `translateX(-${distance}px)` :
                           `translateX(${distance}px)`,
    }

    let anim: Animation | null = null

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        anim = el.animate(
          [start, { opacity: 1, transform: 'none' }],
          { duration, delay, easing: 'cubic-bezier(0.22,0.68,0,1.2)', fill: 'both' }
        )
        io.unobserve(el)
      },
      { threshold: 0.07, rootMargin: '0px 0px -20px 0px' }
    )

    io.observe(el)
    return () => { io.disconnect(); anim?.cancel() }
  }, [delay, from, distance, duration])

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, willChange: 'opacity, transform' }}
    >
      {children}
    </div>
  )
}
