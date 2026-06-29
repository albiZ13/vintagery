'use client'

import { useRef, useEffect } from 'react'

interface Props {
  value:    number
  suffix?:  string
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

export default function AnimatedStat({ value, suffix = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const duration = 1400
        const start    = performance.now()

        function tick(now: number) {
          const t        = Math.min((now - start) / duration, 1)
          const progress = easeOutCubic(t)
          el!.textContent = Math.round(progress * value) + suffix
          if (t < 1) requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
        io.unobserve(el)
      },
      { threshold: 0.6 }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [value, suffix])

  return <span ref={ref}>0{suffix}</span>
}
