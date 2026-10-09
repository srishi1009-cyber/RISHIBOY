const CACHE_NAME = "rishi-music-v8";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ================================
// INSTALL: Cache app shell files
// ================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_FILES.map((file) => {
          return fetch(file, { cache: "no-store" })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Could not cache: " + file);
              }
              return cache.put(file, response);
            })
            .catch((err) => {
              console.warn("Skipped caching file:", file, err);
            });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// ================================
// ACTIVATE: Clear old cache versions
// ================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith("rishi-music-") && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ================================
// FETCH: Network first, cache fallback
// ================================
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== "GET" || request.url.startsWith("blob:")) {
    return;
  }

  const url = new URL(request.url);

  // Ensure request is within the current origin
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to app shell for navigation requests
          return caches.match("./index.html");
        });
      })
  );
});