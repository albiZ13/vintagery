interface Props {
  title?: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({
  title = 'Nessun contenuto trovato',
  description = 'Prova con criteri diversi.',
  action,
}: Props) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-border/70 rounded-2xl bg-white/50">
      <div className="w-12 h-12 rounded-2xl bg-cream border border-border/60 flex items-center justify-center mx-auto mb-4">
        <span className="text-[22px] leading-none select-none" aria-hidden>✦</span>
      </div>
      <h3 className="font-serif text-[18px] font-semibold text-espresso mb-1.5">{title}</h3>
      <p className="text-muted text-[13px] max-w-sm mx-auto leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  )
}
