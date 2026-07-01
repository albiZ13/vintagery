// Vintagery Service Worker — v2
// Strategy: Cache-first for static assets, Network-first for API/pages

const CACHE_NAME   = 'vintagery-v2'
const STATIC_CACHE = 'vintagery-static-v2'

const PRECACHE = [
  '/',
  '/home',
  '/mercatini',
  '/negozi',
  '/manifest.json',
]

// Install: pre-cache shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch: network-first for navigation/API, cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== location.origin) return

  // Skip API and auth routes — always network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Static assets (JS, CSS, images, fonts) — cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2?|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached ?? fetch(request).then(res => {
          const clone = res.clone()
          caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          return res
        })
      )
    )
    return
  }

  // Navigation — network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then(c => c ?? caches.match('/home')))
    )
    return
  }
})

// Push: show notification
self.addEventListener('push', event => {
  let data = { title: 'Vintagery', body: '', url: '/mercatini', icon: '/icon-192.png', badge: '/icon-192.png' }
  try { if (event.data) data = { ...data, ...event.data.json() } } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body  || undefined,
      icon:  data.icon,
      badge: data.badge,
      data:  { url: data.url },
    })
  )
})

// Notification click: open URL
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/mercatini'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const match = cs.find(c => c.url.includes(self.location.origin))
      if (match) return match.focus().then(c => c.navigate(url))
      return clients.openWindow(url)
    })
  )
})
