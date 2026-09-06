// Minimal hand-rolled service worker: caches the static app shell (HTML,
// JS, CSS, icons) so the UI can load offline/on a flaky connection, but
// never touches API calls — every Supabase request is cross-origin and is
// always let through to the network untouched, so bill/payment data is
// never served stale or written while offline. This deliberately keeps
// the app's "financial writes need a live connection" guarantee (see
// README) intact; only the shell is cacheable.
const CACHE_NAME = 'rrm-shell-v1'
const SCOPE_URL = new URL(self.registration.scope)

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([SCOPE_URL.pathname, `${SCOPE_URL.pathname}manifest.webmanifest`])
    ).catch(() => {
      // Precaching is a best-effort optimization — never block install on it.
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Only ever cache same-origin, same-scope GET requests (the app's own
  // HTML/JS/CSS/icons). Anything else — Supabase API calls, auth, storage,
  // cross-origin fonts, non-GET requests — goes straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) {
    return
  }

  if (req.mode === 'navigate') {
    // Network-first for the app shell HTML so updates show up immediately;
    // fall back to the cached shell only when actually offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(SCOPE_URL.pathname, copy))
          return res
        })
        .catch(() => caches.match(SCOPE_URL.pathname))
    )
    return
  }

  // Stale-while-revalidate for static assets (hashed JS/CSS/images) —
  // instant repeat loads, refreshed quietly in the background.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  )
})
