// In-memory rate limiter. Works correctly for single-instance Node.js deployments.
// For Vercel/multi-instance: replace with @upstash/ratelimit + Redis.

interface Entry { count: number; reset: number }

const store = new Map<string, Entry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.reset) store.delete(key)
  })
}, 5 * 60 * 1000)

/**
 * Returns true if the request is allowed, false if rate limit exceeded.
 * @param key    Unique identifier (e.g. IP + route)
 * @param max    Max requests per window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return true
  }

  if (entry.count >= max) return false

  entry.count++
  return true
}

/** Extract client IP from a Next.js Request, falling back to 'unknown'. */
export function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
