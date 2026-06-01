'use client'

import { useState } from 'react'
import FollowButton from './FollowButton'
import PostGrid from './PostGrid'
import PostModal from './PostModal'
import type { ShopPost } from '@/types'

interface Props {
  shopId: string
  posts?: ShopPost[]
  mode?: 'follow' | 'grid'
}

export default function ShopProfileClient({ shopId, posts = [], mode = 'follow' }: Props) {
  const [selectedPost, setSelectedPost] = useState<ShopPost | null>(null)

  if (mode === 'grid') {
    return (
      <>
        <PostGrid posts={posts} onSelect={setSelectedPost} />
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      </>
    )
  }

  return <FollowButton shopId={shopId} />
}
