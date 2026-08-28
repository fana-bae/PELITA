// Pelita — Service Worker v2
// KEAMANAN: Halaman sensitif TIDAK di-cache (network-only)
// Hanya asset statik yang boleh di-cache

const CACHE_NAME = 'pelita-static-v2'

// Hanya cache asset statik yang tidak mengandung data sensitif
const CACHEABLE_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.svg', '.ico', '.webp']

// Halaman/path yang TIDAK BOLEH di-cache (data sensitif)
const NEVER_CACHE_PATHS = [
  '/dashboard',
  '/habits',
  '/tasks',
  '/money',
  '/leaderboard',
  '/settings',
  '/api/',
  '/login',
  '/register',
]

function isStaticAsset(url) {
  return CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext))
}

function isSensitivePath(url) {
  return NEVER_CACHE_PATHS.some(path => url.pathname.startsWith(path))
}

// ── Install: cache hanya asset statik minimal ─────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/icons/icon-192.png',
        '/icons/badge-72.png',
        '/manifest.json',
      ]).catch(() => {
        // Icon mungkin belum ada, tidak apa-apa
      })
    )
  )
  self.skipWaiting()
})

// ── Activate: hapus cache lama ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch Strategy ────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Hanya tangani GET request
  if (event.request.method !== 'GET') return

  // Hanya tangani dari origin sendiri
  if (!event.request.url.startsWith(self.location.origin)) return

  const url = new URL(event.request.url)

  // ── SENSITIVE PAGES: selalu ambil dari network (jangan cache) ──
  if (isSensitivePath(url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Jika offline dan halaman sensitif tidak tersedia — tampilkan halaman offline
        return new Response(
          `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
          <title>Pelita — Offline</title>
          <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf8}
          .box{text-align:center;padding:40px}.icon{font-size:3rem}h1{color:#059669}p{color:#6b7280}</style>
          </head><body><div class="box"><div class="icon">🕯️</div>
          <h1>Kamu sedang offline</h1>
          <p>Sambungkan internet untuk mengakses Pelita.</p></div></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        )
      })
    )
    return
  }

  // ── STATIC ASSETS: cache-first, fallback network ──────────────
  if (isStaticAsset(url) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached

        return fetch(event.request).then((response) => {
          // Hanya cache response yang valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // ── DEFAULT: network-only untuk semua yang lain ───────────────
  // (termasuk halaman HTML yang tidak tersebut di atas)
  event.respondWith(fetch(event.request))
})

// ── Push Notification ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    return // Data push tidak valid, abaikan
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'pelita-notif',
    renotify: true,
    data: { url: data.url || '/dashboard' },
    actions: [
      { action: 'open', title: 'Buka Pelita' },
      { action: 'dismiss', title: 'Nanti' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pelita', options)
  )
})

// ── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  // Validasi URL — hanya boleh ke path internal
  const rawUrl = event.notification.data?.url || '/dashboard'
  const safeUrl = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : '/dashboard'
  const targetUrl = self.location.origin + safeUrl

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(safeUrl) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(targetUrl)
    })
  )
})
