// app/baocao/components/offline.ts
"use client";

/**
 * NỀN OFFLINE của khu /baocao (giai đoạn 1, chủ chốt lộ trình 12/09/2026):
 * đăng ký service worker, phát tín hiệu "dữ liệu này là bản cất lúc HH:MM",
 * và nhớ phiên đăng nhập gần nhất để mở được trang khi mất mạng.
 *
 * Ghi offline (hàng đợi) CHƯA có ở đây — làm theo từng trang ở giai đoạn 2.
 */

/** Tên sự kiện trang bắn ra khi một phản hồi API là bản cất (mất mạng). */
export const SU_KIEN_DU_LIEU_CU = "baobay:du-lieu-cu";
/** Sự kiện khi một lượt gọi mạng thành công trở lại (để hạ dải báo). */
export const SU_KIEN_CO_MANG = "baobay:co-mang";

const KHOA_PHIEN = "baobay.phien.v1";

/**
 * Đăng ký worker CHỈ ở bản production. Bản dev thì gỡ hết: worker cất tệp
 * tĩnh theo tên băm, dev đổi mã liên tục mà tên không đổi kiểu production nên
 * đã có lần dev "ăn mã cũ" cả buổi không hiểu vì sao (xem ghi chú ở /cafe).
 */
export function dangKyOffline(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register("/sw-baocao.js", { scope: "/baocao/" }).catch(() => {});
    return;
  }
  void navigator.serviceWorker
    .getRegistrations()
    .then((rs) => Promise.all(rs.filter((r) => r.scope.includes("/baocao")).map((r) => r.unregister())))
    .then(() => (typeof caches !== "undefined" ? caches.keys() : []))
    .then((keys) => Promise.all([...keys].filter((k) => k.startsWith("baocao-offline")).map((k) => caches.delete(k))))
    .catch(() => {
      /* trình duyệt chặn — không sao */
    });
}

/** Trang nhớ người đang đăng nhập để lần mở sau mất mạng vẫn dựng được khung. */
export function nhoPhien(user: unknown): void {
  try {
    localStorage.setItem(KHOA_PHIEN, JSON.stringify({ luc: new Date().toISOString(), user }));
  } catch {
    /* bộ nhớ bị chặn */
  }
}

export function phienDaNho<T>(): { luc: string; user: T } | null {
  try {
    const raw = localStorage.getItem(KHOA_PHIEN);
    if (!raw) return null;
    const v = JSON.parse(raw) as { luc: string; user: T };
    return v && v.user ? v : null;
  } catch {
    return null;
  }
}

export function quenPhien(): void {
  try {
    localStorage.removeItem(KHOA_PHIEN);
  } catch {
    /* bỏ qua */
  }
}

export function baoDuLieuCu(luc: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SU_KIEN_DU_LIEU_CU, { detail: { luc } }));
}

export function baoCoMang(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SU_KIEN_CO_MANG));
}
