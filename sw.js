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
      // GitHub Pages は 10 分間ブラウザに保存させる設定（max-age=600）なので、普通に取ると
      // 更新直後でも古い版が返ることがある。毎回サーバーに更新の有無を確かめる（変わっていなければ 304 で軽い）。
      // ページを開く要求（navigate）には設定を足せないので URL から取り直し、転送はブラウザに任せる
      const response = isPage
        ? await fetch(request.url, { cache: 'no-cache', redirect: 'manual' })
        : await fetch(request, { cache: 'no-cache' });
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
