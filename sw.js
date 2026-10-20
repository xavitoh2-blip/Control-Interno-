const CACHE_NAME = "control-operativo-v1.2.1";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(res => {
      const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put("./index.html",copy)); return res;
    }).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

/* Notificaciones web: esta función será utilizada cuando se configure un proveedor Web Push.
   Por sí sola no envía notificaciones ni registra dispositivos. */
self.addEventListener("push", event => {
  let payload = {};
  if (event.data) {
    try { payload = event.data.json() || {}; }
    catch (_) { payload = { body: event.data.text() }; }
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};
  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.slice(0, 100) : "Online Shop · Recordatorio";
  const body = typeof payload.body === "string"
    ? payload.body.slice(0, 240) : "Tienes tareas pendientes por revisar.";
  const tag = typeof payload.tag === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(payload.tag)
    ? payload.tag : "online-shop-recordatorio";
  event.waitUntil(self.registration.showNotification(title, {
    body, tag, icon: "./icon-192.png", badge: "./icon-192.png",
    data: { url: self.registration.scope }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then(clients => {
      const url = self.registration.scope;
      const existing = clients.find(client => client.url.startsWith(url));
      return existing ? existing.focus() : self.clients.openWindow(url);
    }));
});
