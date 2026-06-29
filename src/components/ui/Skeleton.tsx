import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-lg bg-cream', className)} />
}

export function ShopCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-52 bg-cream" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="h-px bg-border/40 my-3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function MarketCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-cream" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5 mt-3" />
      </div>
    </div>
  )
}

export function ShopGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => <ShopCardSkeleton key={i} />)}
    </div>
  )
}

export function MarketGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => <MarketCardSkeleton key={i} />)}
    </div>
  )
}

export function FeaturedMarketSkeleton() {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-72 bg-cream" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3 mt-2" />
      </div>
    </div>
  )
}
