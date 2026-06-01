'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  rating: number
  max?: number
  size?: number
  interactive?: boolean
  onChange?: (v: number) => void
  className?: string
}

export default function StarRating({ rating, max = 5, size = 14, interactive = false, onChange, className }: Props) {
  return (
    <div
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Valutazione' : undefined}
      className={cn('flex items-center gap-0.5', className)}
    >
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(rating)
        const label  = `${i + 1} ${i + 1 === 1 ? 'stella' : 'stelle'}`

        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i + 1 === Math.round(rating)}
              aria-label={label}
              onClick={() => onChange?.(i + 1)}
              className={cn(
                'transition-colors cursor-pointer hover:text-gold hover:fill-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-sienna rounded-sm',
                filled ? 'text-gold' : 'text-border-strong',
              )}
            >
              <Star size={size} className={cn('transition-colors', filled ? 'fill-gold' : 'fill-none')} />
            </button>
          )
        }

        return (
          <Star
            key={i}
            size={size}
            aria-hidden
            className={cn('transition-colors', filled ? 'fill-gold text-gold' : 'fill-none text-border-strong')}
          />
        )
      })}
    </div>
  )
}
