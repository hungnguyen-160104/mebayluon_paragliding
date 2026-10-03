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
  /**
   * Điểm CHƯA có trang /spots/<slug> (chỉ dự báo, chưa bán tour) — thẻ thời
   * tiết giấu nút "Xem điểm bay" để khỏi dẫn khách vào trang 404.
   */
  khongCoTrang?: true;
  /**
   * Thẻ thời tiết hiện khối "CUỐI TUẦN NÀY" (T7 + CN) ngay đầu thẻ — cho điểm
   * mà phi công chủ yếu đi xa tới bay vào cuối tuần (Đạ Tẻh: phi công Sài Gòn).
   * Bật cho điểm khác thì chỉ cần thêm cờ này.
   */
  cuoiTuan?: true;
};

export const DIEM_THOI_TIET: DiemThoiTiet[] = [
  {
    slug: "khau-pha",
    ten: "Đèo Khau Phạ",
    tinh: "Mù Cang Chải",
    /** Bãi cất 21°45'17.6"N 104°15'56.5"E (chủ 17/09); điểm có sổ nội bộ nên số ở ⚙ (nếu có) thắng. */
    lat: 21.754889,
    lon: 104.265694,
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
    /** Bãi cất 20°48'30.6"N 105°34'07.6"E (chủ 17/09). */
    lat: 20.8085,
    lon: 105.568778,
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
    /** Bãi cất 20°57'15.5"N 105°24'46.3"E (chủ 17/09). */
    lat: 20.954306,
    lon: 105.412861,
    /** Số chủ 11/09: HAI bãi cất — 850m (chính) và 650m; hạ 50m. */
    alt: 850,
    altCat2: 650,
    altHa: 50,
    luatHuong: { tot: [68, 292], xau: [293, 67] },
  },
  { slug: "muong-hoa-sapa", ten: "Mường Hoa – Sa Pa", tinh: "Lào Cai", lat: 22.3364, lon: 103.8438, spotNoiBo: "sapa" },
  /** Sơn Trà: cất 600m, hạ ngay mép biển 0m (số chủ 11/09). */
  /** Bãi cất 16°07'04.4"N 108°16'24.9"E (chủ 17/09). */
  { slug: "son-tra", ten: "Bán đảo Sơn Trà", tinh: "Đà Nẵng", lat: 16.117889, lon: 108.273583, alt: 600, altHa: 0 },
  /**
   * QUẢN BẠ — điểm bay Mebayluon vận hành (chủ 25/09; bỏ hẳn
   * dốc Bắc Sum). Toạ độ chủ gửi 25/09:
   *  · Bãi cất PG: 23.0604025, 105.0189508 — cao 950 m.
   *  · Bãi hạ 23.0612686, 105.0388558 — cao 450 m, CŨNG là bãi cất của PPG
   *    (dù máy cất từ thung lũng rồi leo cao).
   * Gió Tây, Tây Bắc, Tây Nam là GIÓ SAU: dự báo mạnh hơn 3 m/s là không bay —
   * khai bằng trần tốc độ theo hướng (dưới 3 m/s vẫn cất được).
   */
  {
    slug: "ha-giang",
    ten: "Quản Bạ",
    tinh: "Hà Giang",
    lat: 23.0604025,
    lon: 105.0189508,
    alt: 950,
    altHa: 450,
    luatHuong: { capToc: [{ tam: [225, 270, 315], max: 3, ten: "Tây/Tây Bắc/Tây Nam (gió sau)" }] },
  },
  /** Phình Hồ: bãi cất 21°31'18.8"N 104°31'55.9"E cao 1.050 m, bãi hạ 400 m (số chủ 17/09; trước 900/300). */
  { slug: "tram-tau", ten: "Phình Hồ – Trạm Tấu", tinh: "Lào Cai", lat: 21.521889, lon: 104.532194, alt: 1050, altHa: 400 },
  { slug: "dalat", ten: "Đà Lạt", tinh: "Lâm Đồng", lat: 11.9404, lon: 108.4583 },
  /**
   * NÚI ĐẠI HUỆ — bãi cất cạnh CHÙA ĐẠI TUỆ (Nam Đàn, Nghệ An); chủ sửa tên
   * 16/09: núi là Đại Huệ, chùa là Đại Tuệ, slug giữ theo chùa. Số chủ 16/09: bãi cất 18°45'22.5"N
   * 105°32'08.4"E cao 350m; bãi hạ 18°44'26.9"N 105°31'26.8"E cao 50m.
   * Gió TỐT: Nam, Đông Nam, Tây Nam (cung 112°→247°). Gió Bắc, Đông Bắc, Tây
   * Bắc "cũng bay được" → để "thường", không cấm. Đông và Tây chủ chưa nói,
   * cũng để "thường" — chưa khai `xau` cho tới khi chủ chốt.
   */
  {
    slug: "dai-tue",
    ten: "Núi Đại Huệ (Chùa Đại Tuệ)",
    tinh: "Nghệ An",
    lat: 18.75625,
    lon: 105.53567,
    alt: 350,
    altHa: 50,
    luatHuong: { tot: [112, 247] },
    khongCoTrang: true,
  },
  /**
   * ĐẠ TẺH (Lâm Đồng) — Google Maps ghi "Điểm bay dù lượn Dateh". Thêm 03/10/2026
   * cho phi công miền Nam / Sài Gòn. MEBAYLUON KHÔNG VẬN HÀNH điểm này: chỉ là
   * dự báo cho cộng đồng phi công — không trang /spots, không đặt bay, không giá.
   *
   * Số chủ: bãi cất 11.6017445, 107.5521629, cao 620 m.
   * Gió TỐT: từ ĐÔNG ĐÔNG NAM qua NAM tới TÂY TÂY NAM; ĐẸP NHẤT gió NAM hoặc ĐÔNG NAM.
   *  · `tot` [101, 259]: lấy MÉP ngoài của ô ĐĐN (112,5° − 11,25°) tới mép ngoài
   *    ô TTN (247,5° + 11,25°) — cùng cách khai cung với Viên Nam [68, 292].
   *  · `xau` [304, 56]: phía BẮC (TB → BTB → B → BĐB → ĐB) là GIÓ SAU — sau lưng bãi.
   *  · Đông, Tây (và ĐĐB, TTB) nằm ngoài cung tốt nhưng chưa phải gió sau: không
   *    khai `xau`, máy coi là GIÓ NGANG — không nới ngưỡng gió, chuyên gia trừ điểm hướng.
   *
   * altHa 160 m là SỐ ƯỚC TÍNH (chủ chưa cho): đáy thung lũng phía nam / đông nam
   * bãi cất, tra Open-Meteo elevation 03/10/2026 — cách 3–4 km về phía N/ĐN/NĐN/NTN
   * ra 150–195 m (150, 151, 158, 160, 195). Lấy 160 cho khỏi khai chênh cao quá tay;
   * chủ có số thật thì sửa ở đây.
   *
   * Ngưỡng gió dùng mặc định chung (lý tưởng 3–4 m/s; GIÓ XIẾT = gió chính > 6 m/s
   * ở tầng bãi cất, không phải giật).
   */
  {
    slug: "da-teh",
    ten: "Đạ Tẻh",
    tinh: "Lâm Đồng",
    lat: 11.6017445,
    lon: 107.5521629,
    alt: 620,
    altHa: 160,
    luatHuong: { tot: [101, 259], xau: [304, 56] },
    khongCoTrang: true,
    cuoiTuan: true,
  },
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
