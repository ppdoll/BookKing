// BookKing 서비스워커 — 설치형 PWA 지원 + 안전한 캐시 전략
// 페이지(HTML)는 항상 네트워크 우선(오프라인일 때만 폴백)이라 오래된 화면이 남지 않는다.
// 해시가 붙은 정적 자산만 캐시하고, API/인증은 절대 가로채지 않는다.
const CACHE = "bookking-v1";
const PRECACHE = ["/offline.html", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 오리진 GET만 처리. API/인증은 항상 네트워크로.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 해시 정적 자산·아이콘: cache-first (불변이라 안전)
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // 페이지 이동: network-first, 오프라인일 때만 폴백 화면
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});
