self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith("/api/face/")) {
    return
  }

  event.respondWith(fetch(event.request))
})
