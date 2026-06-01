export default function ShopDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
      {/* Cover */}
      <div className="aspect-[21/9] bg-cream rounded-xl mb-8" />

      {/* Title + rating */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="h-9 bg-cream rounded w-2/3 mb-3" />
          <div className="h-4 bg-cream rounded w-1/4 mb-2" />
          <div className="flex gap-1 mt-2">
            {[50, 60, 55].map(w => (
              <div key={w} className="h-6 bg-cream rounded-pill" style={{ width: w }} />
            ))}
          </div>
        </div>
        <div className="w-24 h-24 bg-cream rounded-xl" />
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 bg-cream rounded w-1/3" />
            <div className="h-5 bg-cream rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
