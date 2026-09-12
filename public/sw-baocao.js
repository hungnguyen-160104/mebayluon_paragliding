// public/sw-baocao.js
/**
 * SERVICE WORKER cho KHU BÁO BAY (/baocao) — nền offline giai đoạn 1 (chủ chốt
 * lộ trình 12/09/2026).
 *
 * Mục tiêu: MẤT MẠNG VẪN MỞ ĐƯỢC trang đã từng mở và ĐỌC ĐƯỢC số liệu lần tải
 * gần nhất. Không ghi hộ gì cả — việc ghi offline (hàng đợi) làm ở giai đoạn 2,
 * theo từng trang, vì sổ booking nhiều người cùng sửa, ghi mù là đè nhau.
 *
 * Ba loại yêu cầu được đụng tới, còn lại mặc kệ mạng chạy như thường:
 *  - /_next/static/*: tên đã băm, bất biến → cache trước, mạng sau.
 *  - Trang /baocao/*: mạng trước (nhận bản mới khi deploy); mất mạng thì trả
 *    bản đã cất của ĐÚNG trang đó (không có thì trả trang bất kỳ đã cất của
 *    /baocao để app vẫn lên, JS tự chuyển trang).
 *  - GET /api/baocao/* và /api/thoi-tiet*: mạng trước; mất mạng thì trả bản
 *    đã cất kèm header `X-Baobay-Offline: <lúc cất>` để trang treo dải báo
 *    "dữ liệu lúc HH:MM". Không bao giờ trả bản cất khi mạng còn sống — số cũ
 *    mà tưởng là mới còn tệ hơn báo lỗi.
 *
 * Cùng scope "/baocao/" nên không đụng worker của máy bán /cafe (scope "/").
 * Đổi PHIEN_BAN là lần kích hoạt sau xoá sạch bản cất cũ.
 */
const PHIEN_BAN = "baocao-offline-v1";
const KHO_TINH = `${PHIEN_BAN}-static`;
const KHO_TRANG = `${PHIEN_BAN}-pages`;
const KHO_API = `${PHIEN_BAN}-api`;
const KHO_TAT_CA = [KHO_TINH, KHO_TRANG, KHO_API];

/** API KHÔNG được cất: phiên đăng nhập / đăng xuất và các đường không phải số liệu. */
const API_KHONG_CAT = [/^\/api\/baocao\/login/, /^\/api\/baocao\/logout/, /^\/api\/baocao\/password/, /^\/api\/baocao\/export/, /^\/api\/baocao\/statement/];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(KHO_TRANG).then((c) => c.add("/baocao").catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("baocao-offline") && !KHO_TAT_CA.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Ghi thêm giờ cất vào header để trang biết bản sao cũ bao lâu. */
async function catKemGio(kho, req, res) {
  try {
    const c = await caches.open(kho);
    const headers = new Headers(res.headers);
    headers.set("X-Baobay-Cached-At", new Date().toISOString());
    const body = await res.clone().arrayBuffer();
    await c.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers }));
  } catch {
    /* hết chỗ hoặc bị chặn — bỏ qua, lần sau cất lại */
  }
}

/** Trả bản cất kèm cờ offline để trang treo dải báo. */
async function tuKho(kho, req) {
  const hit = await caches.match(req, { cacheName: kho });
  if (!hit) return null;
  const headers = new Headers(hit.headers);
  headers.set("X-Baobay-Offline", headers.get("X-Baobay-Cached-At") || "");
  const body = await hit.arrayBuffer();
  return new Response(body, { status: hit.status, statusText: hit.statusText, headers });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1. Tệp tĩnh đã băm tên: cache trước
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(KHO_TINH).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // 2. Trang /baocao/*: mạng trước, offline thì bản đã cất
  if (req.mode === "navigate" && (url.pathname === "/baocao" || url.pathname.startsWith("/baocao/"))) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) void catKemGio(KHO_TRANG, new Request(url.pathname), res);
          return res;
        })
        .catch(async () => {
          const dung = await tuKho(KHO_TRANG, new Request(url.pathname));
          if (dung) return dung;
          /** Không có đúng trang: trả trang /baocao bất kỳ đã cất — vỏ app lên, JS tự dẫn đường. */
          const c = await caches.open(KHO_TRANG);
          const keys = await c.keys();
          const bat = keys.find((k) => new URL(k.url).pathname.startsWith("/baocao"));
          return (bat && (await tuKho(KHO_TRANG, bat))) || Response.error();
        }),
    );
    return;
  }

  // 3. GET API số liệu: mạng trước, offline thì bản đã cất kèm cờ
  const laApi = url.pathname.startsWith("/api/baocao/") || url.pathname.startsWith("/api/thoi-tiet");
  if (laApi && !API_KHONG_CAT.some((r) => r.test(url.pathname))) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) void catKemGio(KHO_API, req, res);
          return res;
        })
        .catch(async () => (await tuKho(KHO_API, req)) || Response.error()),
    );
  }
});
