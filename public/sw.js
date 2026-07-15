// Minimal service worker for PWA install support
// Does NOT cache _next/ chunks or HTML (prevents stale chunk errors during development)
const CACHE_NAME = 'trust-it-install-v1'

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // Skip API requests
  if (url.pathname.startsWith('/api/')) return

  // Skip ALL _next/ requests (let the browser handle caching — prevents stale chunks)
  if (url.pathname.startsWith('/_next/')) return

  // For everything else (HTML, manifest, icons), just fetch from network
  // We don't cache anything to avoid stale content during development
  event.respondWith(fetch(req))
})
