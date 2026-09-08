// NEXO — Service Worker mínimo (PWA)
// Faz cache do shell estático para permitir abrir o app novamente offline.
// Chamadas de API (/api/*) nunca são cacheadas.

const CACHE_NAME = "nexo-shell-v1";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    return; // nunca cachear chamadas de API
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
