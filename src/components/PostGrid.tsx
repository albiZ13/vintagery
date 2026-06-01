import Image from 'next/image'
import { Heart, Tag } from 'lucide-react'
import type { ShopPost } from '@/types'

interface Props {
  posts: ShopPost[]
  onSelect?: (post: ShopPost) => void
}

export default function PostGrid({ posts, onSelect }: Props) {
  if (!posts.length) {
    return (
      <div className="text-center py-16 text-muted border border-dashed border-border rounded-xl">
        <p className="font-serif text-[17px] text-espresso mb-1">Ancora nessun post</p>
        <p className="text-body-sm">Il negozio non ha ancora condiviso le sue entrate.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {posts.map(post => (
        <button
          key={post.id}
          onClick={() => onSelect?.(post)}
          className="relative aspect-square overflow-hidden bg-cream group"
        >
          <Image
            src={post.image_url}
            alt={post.caption ?? 'Post negozio'}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width:640px) 33vw, (max-width:1024px) 22vw, 18vw"
          />
          {/* Overlay al hover — stile Instagram */}
          <div className="absolute inset-0 bg-espresso/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-parchment text-body-sm font-semibold">
            <span className="flex items-center gap-1">
              <Heart size={14} className="fill-current" /> {post.likes_count}
            </span>
          </div>
          {/* Badge prezzo */}
          {post.price && (
            <span className="absolute bottom-1.5 right-1.5 bg-espresso/80 text-parchment text-[10px] px-1.5 py-0.5 rounded font-medium">
              €{post.price}
            </span>
          )}
          {post.sold && (
            <span className="absolute top-1.5 left-1.5 bg-rust/90 text-parchment text-[10px] px-1.5 py-0.5 rounded font-medium">
              Venduto
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
