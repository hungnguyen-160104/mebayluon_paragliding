// lib/checkin-map/index.ts
/**
 * BẢN ĐỒ CHECK-IN Tú Lệ – Khau Phạ – La Pán Tẩn – Mù Cang Chải (bản 11 — bản đồ 3D, chủ duyệt 10/10/2026).
 *
 * - Bản đồ: components/spots/checkin-map/ (engine.ts chạy trong shadow root; MapLibre GL tải lười từ CDN).
 * - Dữ liệu bản đồ: public/checkin-map/data-<vi|en>.json; chữ cho danh sách điểm: ./stops.ts.
 *   Cả hai SINH TỰ ĐỘNG bằng scripts/ban-do-duong-di/ck_site.py — đừng sửa tay.
 * - Ngôn ngữ: vi dùng chữ Việt; en/fr/ru/zh/hi dùng chữ tiếng Anh (tên địa danh giữ tiếng Việt).
 */
import type { CkStopId } from "./types";

export { CK_STOP_IDS } from "./types";
export type { CkLang, CkStopId } from "./types";
export { CK_STOPS, type CkStopRow } from "./stops";
import { CK_ANCHORS } from "./embed";
export { CK_ANCHORS };

/** Trang có bản đồ này. */
export const CHECKIN_MAP_SPOT_SLUG = "khau-pha";

/** Ngôn ngữ chữ của khối: chỉ có bản Việt và bản Anh. */
export const ckTextLang = (lang: string): "vi" | "en" => (lang === "vi" ? "vi" : "en");

/**
 * BÀI VIẾT RIÊNG của từng điểm (chủ 07/10/2026: "bấm vào địa danh phải ra bài
 * viết về địa danh đó"). Giá trị là SLUG bài trong MongoDB → /blog/<slug>.
 *
 * ĐỦ 18 ĐIỂM: 3 bài có sẵn + 15 bài địa danh (scripts/web/diem-check-in-noi-dung.ts,
 * đăng một lượt bằng scripts/web/dang-bai-diem-check-in.ts --tat-ca).
 *
 * KHÔNG dùng thẳng bảng này để vẽ link. Trang /spots/khau-pha hỏi DB xem slug
 * nào ĐÃ ĐĂNG (lib/checkin-map-published.ts — một truy vấn theo chỉ mục slug)
 * rồi truyền kết quả vào <CheckinMapSection articles={…}>:
 * - Điểm có bài đã đăng: thẻ trên bản đồ có nút "Đọc bài đầy đủ →", danh sách điểm có link bài.
 * - Điểm chưa có bài đã đăng: thẻ và danh sách không có link (không 404).
 * Nên khai trước slug bài chưa đăng ở đây là AN TOÀN: đăng bài xong link tự hiện,
 * gỡ bài thì link tự mất — không phải sửa code.
 */
export const CK_ARTICLES: Record<CkStopId, string> = {
  "le-champ": "le-champ-tu-le-resort-suoi-khoang-nong",
  "suoi-khoang": "le-champ-tu-le-resort-suoi-khoang-nong", // gộp bài 10/10/2026 — neo tới mục tắm khoáng (CK_ANCHORS)
  "lung-cung": "dinh-lung-cung-mu-cang-chai",
  "lim-thai": "ban-lim-thai-mu-cang-chai",
  clubhouse: "diem-cat-canh-ha-canh-du-luon-khau-pha", // bài có sẵn
  "lim-mong": "ban-lim-mong-mu-cang-chai",
  "huy-thanh": "trai-ca-hoi-ca-tam-huy-thanh-deo-khau-pha",
  "khau-pha": "du-luon-deo-khau-pha", // bài có sẵn
  "nga-ba-kim": "nga-ba-kim-mu-cang-chai",
  "rung-truc-pung-luong": "rung-truc-pung-luong-mu-cang-chai",
  "mam-xoi": "doi-mam-xoi-la-pan-tan-mu-cang-chai",
  garrya: "garrya-mu-cang-chai",
  "mam-xoi-be": "doi-mam-xoi-be-mu-cang-chai",
  "song-lung-khung-long": "song-lung-khung-long-mu-cang-chai",
  "rung-truc-mcc": "rung-truc-hang-sung-mu-cang-chai",
  "mu-cang-chai": "cam-nang-du-lich-mu-cang-chai-lao-cai", // bài có sẵn
  "mong-ngua": "doi-mong-ngua-mu-cang-chai",
  "kim-noi": "kim-noi-mu-cang-chai",
};

/**
 * DỰ PHÒNG khi không hỏi được DB (lỗi kết nối): chỉ 3 bài đã có trên web từ
 * trước 07/10/2026 — thà thiếu link còn hơn trỏ vào bài chưa đăng.
 */
export const CK_ARTICLES_FALLBACK: Partial<Record<CkStopId, string>> = {
  clubhouse: CK_ARTICLES.clubhouse,
  "khau-pha": CK_ARTICLES["khau-pha"],
  "mu-cang-chai": CK_ARTICLES["mu-cang-chai"],
};


/** Link bài: slug → đường dẫn (chưa gắn tiền tố ngôn ngữ). */
export const ckArticleHref = (slug: string, stopId?: string) =>
  `/blog/${slug}${stopId && CK_ANCHORS[stopId] ? `#${CK_ANCHORS[stopId]}` : ""}`;
