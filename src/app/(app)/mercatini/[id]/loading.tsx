export default function MarketDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
      {/* Hero image */}
      <div className="aspect-[21/9] bg-cream rounded-xl mb-8" />

      {/* Title */}
      <div className="h-9 bg-cream rounded w-2/3 mb-3" />
      <div className="h-5 bg-cream rounded w-1/3 mb-8" />

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 bg-cream rounded w-1/3" />
            <div className="h-5 bg-cream rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="space-y-2 mb-8">
        {[100, 90, 95, 80].map(w => (
          <div key={w} className="h-4 bg-cream rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
