/* عامل الخدمة: تخزين الصفحات الأساسية والملفات الثابتة للعمل دون اتصال */
const VERSION = "m10-v2";
const PAGES = ["/", "/offline", "/curriculum", "/lessons", "/labs", "/tools", "/games", "/exams", "/bank", "/review", "/notes", "/progress", "/whiteboard", "/tutor",
  "/lessons/1-1", "/lessons/1-2", "/lessons/1-3", "/lessons/1-4", "/lessons/1-5", "/lessons/2-1", "/lessons/2-2", "/lessons/2-3", "/lessons/3-1",
  "/lessons/4-1", "/lessons/4-2", "/lessons/5-1", "/lessons/5-2", "/lessons/5-3", "/lessons/6-1", "/lessons/7-1", "/lessons/7-2", "/lessons/7-3", "/lessons/8-1"];
const STATIC_RE = /\/_next\/static\/[^"'\s)]+/g;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const assets = new Set(["/manifest.webmanifest", "/icons/icon-192.png", "/brand/school-logo.webp"]);
    await Promise.all(PAGES.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) return;
        const html = await res.clone().text();
        (html.match(STATIC_RE) || []).forEach((a) => assets.add(a.replace(/\\u0026/g, "&")));
        await cache.put(url, res);
      } catch (e) { /* تجاهل الصفحات التي تفشل */ }
    }));
    await Promise.all([...assets].map((a) => cache.add(a).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // خطوط Google: من التخزين أولاً
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // واجهات الخادم: المعلم الذكي والإدارة لا تُخزَّن أبداً
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/content") return;
  if (url.pathname.startsWith("/admin")) return;

  // الملفات الثابتة: من التخزين أولاً
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  // الصفحات ومحتوى المعلم: الشبكة أولاً ثم التخزين
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fetch(req);
      if (res.ok && (req.mode === "navigate" || url.pathname === "/api/content" || url.pathname.startsWith("/_next/data"))) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
      if (hit) return hit;
      if (req.mode === "navigate") return (await cache.match("/offline")) || new Response("غير متصل", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      return new Response("", { status: 504 });
    }
  })());
});
