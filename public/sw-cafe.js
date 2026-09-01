// public/sw-cafe.js
/**
 * Service worker cho TRANG BÁN HÀNG QUẦY CAFE (/baocao/cafe).
 *
 * Mục tiêu duy nhất: MẤT MẠNG VẪN MỞ ĐƯỢC trang bán để bấm bán + in phiếu;
 * phiếu xếp hàng trong máy, có mạng lại thì trang tự đẩy lên. Vì vậy chỉ đụng
 * đúng hai loại yêu cầu, còn lại mặc kệ cho mạng chạy như thường:
 *
 *  - Tệp tĩnh /_next/static/*: bất biến theo tên (đã băm) → cache trước, hỏi
 *    mạng sau. Đây là phần làm trang "sống" được offline.
 *  - Trang /baocao/cafe: mạng trước (để nhận bản mới khi deploy), mất mạng thì
 *    trả bản đã cất.
 *
 * KHÔNG cache API (/api/*): số liệu cũ mà tưởng là mới còn tệ hơn báo lỗi.
 */
const CACHE = "cafe-pos-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/baocao/cafe").catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith("cafe-pos")).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Tệt tĩnh đã băm tên: cache trước
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Trang bán hàng: mạng trước, offline thì bản đã cất
  if (url.pathname === "/baocao/cafe") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put("/baocao/cafe", res.clone()));
          return res;
        })
        .catch(() => caches.match("/baocao/cafe").then((hit) => hit || Response.error())),
    );
  }
});
