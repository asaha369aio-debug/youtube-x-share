// アプリ本体をキャッシュして、インストール後すぐ起動できるようにする。
// オンライン時は常に最新版を取りに行き、失敗したときだけキャッシュを使う。
const CACHE = 'yt-x-share-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // YouTube への通信など、他サイト宛てはそのまま通す
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate';
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        // 共有で付く ?text=... などに関係なく、ページ本体は 1 つだけ保存する
        await cache.put(isPage ? './' : request, response.clone());
      }
      return response;
    } catch {
      const cached = isPage ? await caches.match('./') : await caches.match(request);
      return cached || Response.error();
    }
  })());
});
