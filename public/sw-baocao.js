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
/**
 * v2 (04/10): đổi luật cất tệp tĩnh (chỉ tệp mang mã băm mới cache trước) —
 * lên số để lần kích hoạt đầu XOÁ SẠCH kho v1, phòng kho cũ còn mã không băm.
 */
const PHIEN_BAN = "baocao-offline-v2";
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
    /**
     * NAVIGATION PRELOAD (đo tốc độ 04/10): bật lên thì trình duyệt gửi yêu cầu
     * trang NGAY lúc bấm mở/F5, song song với việc đánh thức worker này. Không
     * bật thì yêu cầu trang phải đợi worker khởi động xong (điện thoại yếu mất
     * 100–500 ms) mới đi — worker làm CHẬM lần mở trang thay vì giúp.
     */
    (self.registration.navigationPreload ? self.registration.navigationPreload.enable().catch(() => {}) : Promise.resolve())
      .then(() => caches.keys())
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("baocao-offline") && !KHO_TAT_CA.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => tiaKhoTinh())
      .then(() => self.clients.claim()),
  );
});

/**
 * Tệp tĩnh mang tên băm: MỖI LẦN DEPLOY là một loạt tên mới, bản cũ không bao
 * giờ được hỏi lại nhưng vẫn nằm trong kho. Deploy nhiều lần mỗi ngày thì kho
 * phình mãi tới lúc trình duyệt hết hạn mức và XOÁ SẠCH dữ liệu của cả trang
 * (kể cả phiên nhớ, lựa chọn đã lưu). Giữ 400 tệp mới nhất là thừa cho một bản.
 */
const TINH_TOI_DA = 400;
let demCatTinh = 0;
async function tiaKhoTinh() {
  try {
    const c = await caches.open(KHO_TINH);
    const keys = await c.keys();
    const thua = keys.length - TINH_TOI_DA;
    // keys() trả theo thứ tự cất vào: cũ trước, mới sau
    for (let i = 0; i < thua; i++) await c.delete(keys[i]);
  } catch {
    /* không tỉa được thì để lần kích hoạt sau */
  }
}

/** Tên tệp có mã băm nội dung (8+ ký tự hex trước phần đuôi) hoặc nằm trong media/ của bản build. */
function laTenBam(pathname) {
  return /[./-][0-9a-f]{8,}\.[a-z0-9]+$/i.test(pathname) || pathname.startsWith("/_next/static/media/");
}

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

  /**
   * 1. Tệp tĩnh MANG MÃ BĂM trong tên (page-0a1b2c3d4e5f6789.js, css/9f8e….css,
   *    media/…): nội dung không bao giờ đổi dưới cùng một tên → cache trước.
   *
   * Tệp tĩnh KHÔNG mang mã băm (bản dev: chunks/app/…/page.js, hot-update;
   * _buildManifest theo buildId) thì MẠNG TRƯỚC, mất mạng mới dùng bản cất.
   * Trước 04/10 mọi /_next/static/ đều cache trước: máy nào từng mở bản dev
   * dưới worker này là ăn mã cũ mãi — agent thử TK công ty dính đúng cảnh đó.
   */
  if (url.pathname.startsWith("/_next/static/") && !laTenBam(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) e.waitUntil(caches.open(KHO_TINH).then((c) => c.put(req, res.clone())).catch(() => {}));
          return res;
        })
        .catch(async () => (await caches.match(req, { cacheName: KHO_TINH })) || Response.error()),
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(KHO_TINH).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          // Cất tệp mới (thường là sau một lần deploy) thì thỉnh thoảng tỉa kho
          e.waitUntil(c.put(req, res.clone()).then(() => (++demCatTinh % 40 === 0 ? tiaKhoTinh() : undefined)).catch(() => {}));
        }
        return res;
      }),
    );
    return;
  }

  // 2. Trang /baocao/*: mạng trước, offline thì bản đã cất
  if (req.mode === "navigate" && (url.pathname === "/baocao" || url.pathname.startsWith("/baocao/"))) {
    e.respondWith(
      Promise.resolve(e.preloadResponse)
        .catch(() => undefined)
        .then((preload) => preload || fetch(req))
        .then((res) => {
          if (res.ok) e.waitUntil(catKemGio(KHO_TRANG, new Request(url.pathname), res));
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
