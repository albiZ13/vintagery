export default function HomeLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      {/* Hero */}
      <div className="mb-12">
        <div className="h-10 bg-cream rounded w-2/3 mb-3" />
        <div className="h-5 bg-cream rounded w-1/2" />
      </div>

      {/* Section */}
      <div className="h-6 bg-cream rounded w-48 mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-cream" />
            <div className="p-4 space-y-2">
              <div className="h-5 bg-cream rounded w-3/4" />
              <div className="h-3 bg-cream rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 */}
      <div className="h-6 bg-cream rounded w-40 mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-cream" />
            <div className="p-4 space-y-2">
              <div className="h-5 bg-cream rounded w-3/4" />
              <div className="h-3 bg-cream rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
