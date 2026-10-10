// lib/checkin-map/types.ts
// Kiểu dữ liệu của BẢN ĐỒ CHECK-IN Tú Lệ – Khau Phạ – La Pán Tẩn – Mù Cang Chải
// (trang /spots/khau-pha, mục #check-in-map — bản đồ 3D v11, chủ duyệt 10/10/2026).

export type CkLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/**
 * Thứ tự = thứ tự dọc đường từ Tú Lệ sang Mù Cang Chải (theo km đường thật).
 * Riêng "lung-cung" xếp theo LỐI RẼ ở Tú Lệ (Km 1,4), không theo km tới đầu
 * đường mòn (16,7) — đó là chuyến leo núi 2 ngày, rẽ đi từ Tú Lệ.
 */
export const CK_STOP_IDS = [
  "le-champ",
  "suoi-khoang",
  "lung-cung",
  "lim-thai",
  "clubhouse",
  "lim-mong",
  "huy-thanh",
  "khau-pha",
  "nga-ba-kim",
  "rung-truc-pung-luong",
  "mam-xoi",
  "garrya",
  "mam-xoi-be",
  "song-lung-khung-long",
  "rung-truc-mcc",
  "mu-cang-chai",
  "mong-ngua",
  "kim-noi",
] as const;

export type CkStopId = (typeof CK_STOP_IDS)[number];
