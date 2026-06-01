import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  href?: string
  hrefLabel?: string
}

export default function SectionHeader({ eyebrow, title, subtitle, href, hrefLabel = 'Vedi tutti' }: Props) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-sienna/60 mb-2">{eyebrow}</p>
        )}
        <h2 className="font-serif text-[22px] font-bold text-espresso leading-tight tracking-[-0.01em]">{title}</h2>
        {subtitle && <p className="text-muted text-[13px] mt-1">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-sienna hover:text-coffee transition-colors flex-shrink-0 ml-4"
        >
          {hrefLabel} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}
