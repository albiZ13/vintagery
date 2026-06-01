import { cn } from '@/lib/utils'
import { TRUST_TIER_LABELS, type TrustTier } from '@/types'

interface Props {
  tier: TrustTier
  score?: number
  size?: 'sm' | 'md'
}

export default function TrustBadge({ tier, score, size = 'sm' }: Props) {
  const { label, color } = TRUST_TIER_LABELS[tier]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-pill border font-medium',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-caption px-2.5 py-1',
      color,
    )}>
      {tier === 'expert' && '★ '}
      {label}
      {score !== undefined && size === 'md' && <span className="opacity-60">· {score}pt</span>}
    </span>
  )
}
