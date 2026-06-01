export default function NegoziLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Search bar skeleton */}
      <div className="h-12 bg-cream rounded-xl mb-8 animate-pulse max-w-xl" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-[16/9] bg-cream" />
            <div className="p-4 space-y-2">
              <div className="h-5 bg-cream rounded w-3/4" />
              <div className="h-3 bg-cream rounded w-1/2" />
              <div className="flex gap-1 mt-2">
                {[40, 50, 45].map(w => (
                  <div key={w} className="h-5 bg-cream rounded-pill" style={{ width: w }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
