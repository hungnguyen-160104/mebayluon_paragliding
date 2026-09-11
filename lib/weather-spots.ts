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

import type { LuatHuong } from "./baobay/thoi-tiet";
import type { SpotId } from "./baobay/spots";

export type DiemThoiTiet = {
  /** Slug của trang /spots/<slug>. */
  slug: string;
  /** Tên hiện trên thẻ thời tiết. */
  ten: string;
  tinh: string;
  lat: number;
  lon: number;
  /** Độ cao bãi CẤT CÁNH (m) — điểm không có sổ nội bộ thì khai ở đây. */
  alt?: number;
  /** Độ cao bãi HẠ (m) — chênh với `alt` là độ cao thả. */
  altHa?: number;
  /** Bãi cất thứ hai (m) — Viên Nam có hai chỗ cất, 650m và 850m (chủ 11/09). */
  altCat2?: number;
  /** Điểm bay nội bộ tương ứng — có thì dùng toạ độ và ngưỡng đã học của nó. */
  spotNoiBo?: SpotId;
  /** Luật hướng gió riêng của chỗ cất cánh này. */
  luatHuong?: LuatHuong;
  /**
   * Những chỗ cất cánh KHÁC phải hiện KÈM trên cùng trang.
   *
   * "Hà Nội" trên web là một trang nhưng thực ra hai bãi: Đồi Bù và Viên Nam,
   * cách nhau hàng chục cây số và quay về hai phía khác nhau — gió tốt cho bãi
   * này lại là gió xấu cho bãi kia. Một bảng thời tiết chung cho cả hai là sai
   * ở nửa số ngày, nên phải bày đủ hai bảng.
   */
  kem?: string[];
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
  /**
   * ĐỒI BÙ — chủ điểm bay: tốt với gió ĐÔNG, BẮC, TÂY; xấu với NAM và TÂY NAM.
   * Cung tốt vắt qua mốc bắc (247°→112°), cung xấu là góc tây nam–nam.
   */
  {
    slug: "doi-bu",
    ten: "Đồi Bù",
    tinh: "Hà Nội",
    lat: 20.8386,
    lon: 105.5561,
    spotNoiBo: "ha-noi",
    luatHuong: { tot: [247, 112], xau: [157, 246] },
    kem: ["vien-nam"],
  },
  /**
   * VIÊN NAM — NGƯỢC HẲN Đồi Bù: tốt với ĐÔNG, NAM, TÂY (cung 68°→292°), xấu
   * với BẮC, ĐÔNG BẮC, TÂY BẮC. Hai bãi cách nhau chừng 20km mà quay hai phía,
   * nên cùng một ngày gió bắc thì Đồi Bù bay được còn Viên Nam thì không.
   */
  {
    slug: "vien-nam",
    ten: "Núi Viên Nam",
    tinh: "Hoà Bình",
    lat: 20.9497,
    lon: 105.4206,
    /** Số chủ 11/09: HAI bãi cất — 850m (chính) và 650m; hạ 50m. */
    alt: 850,
    altCat2: 650,
    altHa: 50,
    luatHuong: { tot: [68, 292], xau: [293, 67] },
  },
  { slug: "muong-hoa-sapa", ten: "Mường Hoa – Sa Pa", tinh: "Lào Cai", lat: 22.3364, lon: 103.8438, spotNoiBo: "sapa" },
  /** Sơn Trà: cất 600m, hạ ngay mép biển 0m (số chủ 11/09). */
  { slug: "son-tra", ten: "Bán đảo Sơn Trà", tinh: "Đà Nẵng", lat: 16.1094, lon: 108.2789, alt: 600, altHa: 0 },
  /** Quản Bạ: cất 1.350m, hạ 800m (số chủ 11/09). */
  { slug: "ha-giang", ten: "Bắc Sum – Quản Bạ", tinh: "Hà Giang", lat: 22.9214, lon: 104.9731, alt: 1350, altHa: 800 },
  /** Phình Hồ: cất 900m, hạ 300m (số chủ 11/09). */
  { slug: "tram-tau", ten: "Phình Hồ – Trạm Tấu", tinh: "Lào Cai", lat: 21.5219, lon: 104.5322, alt: 900, altHa: 300 },
  { slug: "dalat", ten: "Đà Lạt", tinh: "Lâm Đồng", lat: 11.9404, lon: 108.4583 },
];

export function diemThoiTietTheoSlug(slug: string): DiemThoiTiet | null {
  const s = String(slug || "").trim().toLowerCase();
  return DIEM_THOI_TIET.find((d) => d.slug === s) ?? null;
}

/**
 * Các điểm hiện trên trang "Thời tiết bay".
 *
 * CÓ cả Viên Nam dù trang /spots gộp nó vào thẻ "Hà Nội": hai bãi quay hai phía
 * nên cùng một ngày gió bắc thì Đồi Bù bay được còn Viên Nam thì không — gộp
 * một bảng là nói sai cho một trong hai. Chỉ bỏ Đà Lạt vì điểm đó chưa mở lại.
 */
export const DIEM_TRANG_THOI_TIET = DIEM_THOI_TIET.filter((d) => d.slug !== "dalat");
