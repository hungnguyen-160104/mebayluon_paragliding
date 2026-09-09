// lib/weather-spots.ts

/**
 * TOẠ ĐỘ THỜI TIẾT của các điểm bay TRÊN WEBSITE KHÁCH.
 *
 * Khác với `lib/baobay/thoi-tiet.ts` (ba điểm đang vận hành, toạ độ sửa được
 * trong trang cài đặt nội bộ): đây là danh sách theo SLUG của trang /spots, có
 * cả những điểm công ty bay theo mùa hoặc theo đoàn nên không có sổ nội bộ.
 *
 * ĐIỂM NÀO CÓ SỔ NỘI BỘ thì `spotNoiBo` trỏ sang đó, và khi ấy máy lấy toạ độ
 * lẫn NGƯỠNG GIÓ ĐÃ HỌC của điểm ấy thay vì số mặc định — kinh nghiệm chủ điểm
 * bay chấm hằng ngày chảy thẳng ra trang khách, không phải khai hai lần.
 *
 * Toạ độ tra theo bản đồ, lấy ở chỗ CẤT CÁNH chứ không lấy tâm huyện: ở núi,
 * lệch mươi cây số là gió khác hẳn.
 */

import type { SpotId } from "./baobay/spots";

export type DiemThoiTiet = {
  /** Slug của trang /spots/<slug>. */
  slug: string;
  /** Tên hiện trên thẻ thời tiết. */
  ten: string;
  tinh: string;
  lat: number;
  lon: number;
  /** Điểm bay nội bộ tương ứng — có thì dùng toạ độ và ngưỡng đã học của nó. */
  spotNoiBo?: SpotId;
};

export const DIEM_THOI_TIET: DiemThoiTiet[] = [
  {
    slug: "khau-pha",
    ten: "Đèo Khau Phạ",
    tinh: "Mù Cang Chải",
    lat: 21.7546,
    lon: 104.1279,
    spotNoiBo: "khau-pha",
  },
  { slug: "doi-bu", ten: "Đồi Bù", tinh: "Hà Nội", lat: 20.8386, lon: 105.5561, spotNoiBo: "ha-noi" },
  { slug: "vien-nam", ten: "Núi Viên Nam", tinh: "Hoà Bình", lat: 20.9497, lon: 105.4206 },
  { slug: "muong-hoa-sapa", ten: "Mường Hoa – Sa Pa", tinh: "Lào Cai", lat: 22.3364, lon: 103.8438, spotNoiBo: "sapa" },
  { slug: "son-tra", ten: "Bán đảo Sơn Trà", tinh: "Đà Nẵng", lat: 16.1094, lon: 108.2789 },
  { slug: "ha-giang", ten: "Bắc Sum – Quản Bạ", tinh: "Hà Giang", lat: 22.9214, lon: 104.9731 },
  { slug: "tram-tau", ten: "Phình Hồ – Trạm Tấu", tinh: "Lào Cai", lat: 21.5219, lon: 104.5322 },
  { slug: "dalat", ten: "Đà Lạt", tinh: "Lâm Đồng", lat: 11.9404, lon: 108.4583 },
];

export function diemThoiTietTheoSlug(slug: string): DiemThoiTiet | null {
  const s = String(slug || "").trim().toLowerCase();
  return DIEM_THOI_TIET.find((d) => d.slug === s) ?? null;
}

/**
 * Các điểm hiện trên trang "Thời tiết bay" — cùng thứ tự với trang /spots.
 * Đà Lạt và Viên Nam không nằm trong danh sách chính nên chỉ hiện ở trang riêng
 * của chúng, khỏi bày một điểm chưa mở lại ra giữa trang thời tiết.
 */
export const DIEM_TRANG_THOI_TIET = DIEM_THOI_TIET.filter(
  (d) => !["dalat", "vien-nam"].includes(d.slug),
);
