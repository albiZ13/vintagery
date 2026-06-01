import { formatDate } from '@/lib/utils'
import StarRating from './StarRating'
import type { Review } from '@/types'

interface Props { review: Review }

export default function ReviewCard({ review }: Props) {
  const author = review.profiles?.full_name ?? review.profiles?.username ?? 'Utente anonimo'
  const initial = author.charAt(0).toUpperCase()

  return (
    <div className="py-5 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-sienna/15 flex items-center justify-center text-sienna font-semibold text-sm flex-shrink-0">
          {review.profiles?.avatar_url
            ? <img src={review.profiles.avatar_url} className="w-9 h-9 rounded-full object-cover" alt={author} />
            : initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-sm font-semibold text-espresso">{author}</span>
            <StarRating rating={review.rating} size={12} />
            <span className="text-caption text-muted ml-auto">{formatDate(review.created_at)}</span>
          </div>
          {review.title && (
            <p className="text-body-sm font-medium text-espresso mt-1">{review.title}</p>
          )}
          {review.body && (
            <p className="text-body-sm text-coffee mt-1 leading-relaxed">{review.body}</p>
          )}
        </div>
      </div>
    </div>
  )
}
