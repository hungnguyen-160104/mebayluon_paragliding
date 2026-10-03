// lib/imou/cameras.ts
/**
 * DANH SÁCH CAMERA BÃI CẤT (chủ 30/09/2026) — dùng chung cho máy chủ lẫn trình
 * duyệt, nên ở đây TUYỆT ĐỐI không có bí mật: chỉ tên biến môi trường, khung giờ chụp.
 *
 * Camera Imou ở bãi cất cánh cao Viên Nam (AOV PT, 4G), bãi hạ cánh Viên Nam
 * (AOV PT) và bãi cất Khau Phạ (Cruiser Dual 2C 4G) — hai máy sau thêm 03/10/2026 — chụp 05:30–19:30 giờ Việt
 * Nam (nhịp xem shouldSnapNow); trang /baobay hiện ảnh mới nhất + 60 phút gần
 * nhất. Thêm camera mới = thêm một mục vào CAMERAS, không phải sửa route.
 *
 * KHÔNG LƯU ẢNH (chủ 01/10/2026 — không để web đầy dung lượng/băng thông): web
 * chỉ giữ LINK ảnh do Imou cấp (sống 7 ngày) trong MongoDB; trình duyệt tải ảnh
 * thẳng từ máy chủ Imou, Vercel/Cloudinary không chứa và không chuyển byte ảnh nào.
 */

export type CamId = "vien-nam" | "vien-nam-bhc" | "khau-pha";

/** Sáu ngôn ngữ của site — tên camera hiện trên trang /webcam theo ngôn ngữ URL */
export type CamLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type CamConfig = {
  id: CamId;
  /** Tên hiện trên trang */
  name: Record<CamLang, string>;
  /** Dòng nguồn cuối khung nhúng iframe (/embed/camera/<cam>) */
  credit: { vi: string; en: string };
  /** Biến môi trường chứa số serial (deviceId) của camera */
  snEnv: string;
  /** Biến môi trường chứa mã an toàn dán dưới đáy máy — chỉ dùng khi bindDevice */
  codeEnv: string;
  /** Kênh mặc định của camera — máy một ống kính luôn là "0" */
  channelId: string;
  /** Biến môi trường (tuỳ chọn) ghi đè kênh — máy hai ống kính chọn "0" hay "1" mà không phải sửa mã */
  channelEnv?: string;
};

export const CAMERAS: Record<CamId, CamConfig> = {
  "vien-nam": {
    id: "vien-nam",
    // Đổi tên hiển thị 03/10/2026 (trước: "Camera bãi cao Viên Nam"); id giữ nguyên
    // để dữ liệu camera_snaps và mã nhúng của đối tác vẫn chạy
    name: {
      vi: "Camera bãi cất Viên Nam 850",
      en: "Vien Nam 850 m launch camera",
      fr: "Caméra du décollage de Viên Nam (850 m)",
      ru: "Камера старта Viên Nam (850 м)",
      zh: "Viên Nam 850 米起飞场摄像头",
      hi: "Viên Nam 850 मी टेक-ऑफ़ कैमरा",
    },
    credit: { vi: "Camera bãi cất cánh Viên Nam — Mebayluon.com", en: "Vien Nam launch camera — Mebayluon.com" },
    snEnv: "IMOU_CAM_VIENNAM_SN",
    codeEnv: "IMOU_CAM_VIENNAM_CODE",
    channelId: "0",
  },
  /**
   * Bãi HẠ CÁNH Viên Nam (chủ 03/10/2026): Imou AOV PT một ống kính (cùng đời
   * máy bãi cất) → kênh "0". Tên trong app "Viên Nam BHC". Serial mặc định ở
   * lib/imou/defaults.server.ts; mã an toàn chỉ ở env IMOU_CAM_VIENNAM_BHC_CODE.
   */
  "vien-nam-bhc": {
    id: "vien-nam-bhc",
    name: {
      vi: "Camera bãi hạ cánh Viên Nam",
      en: "Vien Nam landing field camera",
      fr: "Caméra de l'atterrissage de Viên Nam",
      ru: "Камера посадочной площадки Viên Nam",
      zh: "Viên Nam 降落场摄像头",
      hi: "Viên Nam लैंडिंग फ़ील्ड कैमरा",
    },
    credit: { vi: "Camera bãi hạ cánh Viên Nam — Mebayluon.com", en: "Vien Nam landing field camera — Mebayluon.com" },
    snEnv: "IMOU_CAM_VIENNAM_BHC_SN",
    codeEnv: "IMOU_CAM_VIENNAM_BHC_CODE",
    channelId: "0",
  },
  /**
   * Bãi cất cánh Khau Phạ (chủ 03/10/2026): Imou Cruiser Dual 2C 4G, tên trong
   * app "MCC Bãi cất". Máy HAI ống kính → mặc định kênh "0", đổi bằng
   * IMOU_CAM_KHAUPHA_CHANNEL nếu ống kính nhìn bãi là kênh khác. Số serial
   * mặc định nằm ở lib/imou/defaults.server.ts (chỉ máy chủ đọc).
   */
  "khau-pha": {
    id: "khau-pha",
    name: {
      vi: "Camera bãi cất Khau Phạ",
      en: "Khau Pha launch camera",
      fr: "Caméra du décollage de Khau Phạ",
      ru: "Камера старта Khau Phạ",
      zh: "Khau Phạ 起飞场摄像头",
      hi: "Khau Phạ टेक-ऑफ़ कैमरा",
    },
    credit: { vi: "Camera bãi cất cánh Khau Phạ — Mebayluon.com", en: "Khau Pha launch camera — Mebayluon.com" },
    snEnv: "IMOU_CAM_KHAUPHA_SN",
    codeEnv: "IMOU_CAM_KHAUPHA_CODE",
    channelId: "0",
    channelEnv: "IMOU_CAM_KHAUPHA_CHANNEL",
  },
};

export const CAM_IDS = Object.keys(CAMERAS) as CamId[];

/**
 * Camera theo ĐIỂM BAY (03/10/2026): trang /webcam/<điểm> và /baobay hiện mọi
 * camera của điểm đó, bãi cất trước, bãi hạ cánh sau. Khoá là slug trang webcam.
 */
export type WebcamSite = "khau-pha" | "vien-nam";
export const WEBCAM_SITES: Record<WebcamSite, readonly CamId[]> = {
  "khau-pha": ["khau-pha"],
  "vien-nam": ["vien-nam", "vien-nam-bhc"],
};
export function isWebcamSite(x: unknown): x is WebcamSite {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(WEBCAM_SITES, x);
}

export function isCamId(x: unknown): x is CamId {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(CAMERAS, x);
}

/** Giờ chụp theo giờ Việt Nam: [05:30, 19:30] — phút 19:30 vẫn chụp (chủ 01/10: trước là 08:00–18:00). */
export const CAM_ACTIVE = { fromMin: 5 * 60 + 30, toMin: 19 * 60 + 30, label: "05:30–19:30" } as const;
/** Trang hiện ảnh của bấy nhiêu phút gần nhất */
export const CAM_WINDOW_MINUTES = 60;
/** MongoDB giữ link ảnh bấy nhiêu phút rồi xoá (dư 30 phút cho khung 60 phút) */
export const CAM_KEEP_MINUTES = 90;
/** Ảnh mới nhất cũ hơn chừng này (trong giờ chụp) thì coi như camera mất kết nối —
 *  ngoài 10–15h chụp 3 phút/ảnh nên 10 phút vẫn dư ba nhịp. */
export const CAM_STALE_MINUTES = 10;

const VN_OFFSET_MS = 7 * 3600_000;

/** Số phút tính từ 00:00 giờ Việt Nam của thời điểm `t` (VN không đổi giờ mùa hè). */
export function vnMinuteOfDay(t: Date | number = Date.now()): number {
  const ms = (typeof t === "number" ? t : t.getTime()) + VN_OFFSET_MS;
  const d = new Date(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Đang trong giờ chụp (05:30–19:30 giờ VN)? */
export function inCamActiveHours(t: Date | number = Date.now()): boolean {
  const m = vnMinuteOfDay(t);
  return m >= CAM_ACTIVE.fromMin && m <= CAM_ACTIVE.toMin;
}

/**
 * NHỊP CHỤP (chủ 01/10/2026, cho đỡ tốn lượt gọi): 10:00–15:00 giờ VN chụp MỖI
 * PHÚT (giờ bay chính); 05:30–10:00 và 15:00–19:30 chỉ chụp phút chia hết cho 3
 * (3 phút/lần). ≈ 481 ảnh/ngày. Lịch gọi vẫn mỗi phút,
 * route tự bỏ qua các phút không cần chụp.
 */
export const CAM_PEAK = { fromMin: 10 * 60, toMin: 15 * 60 } as const;
export const CAM_OFFPEAK_EVERY_MIN = 3;

export function shouldSnapNow(t: Date | number = Date.now()): boolean {
  if (!inCamActiveHours(t)) return false;
  const m = vnMinuteOfDay(t);
  if (m >= CAM_PEAK.fromMin && m < CAM_PEAK.toMin) return true;
  return m % CAM_OFFPEAK_EVERY_MIN === 0;
}

/** "08:41" theo giờ Việt Nam */
export function vnHHMM(t: Date | number | string): string {
  const d = new Date(new Date(t).getTime() + VN_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Nhãn theo giờ VN dùng làm khoá bản ghi: "20260930-0841" */
export function vnStamp(t: Date | number = Date.now()): string {
  const d = new Date((typeof t === "number" ? t : t.getTime()) + VN_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

/** Dữ liệu API /api/camera/[cam] trả về */
/** `url` là link ảnh của Imou (sống 7 ngày) — không có bản sao nào trên web */
export type CamShot = { url: string; takenAt: string };
export type CamFeed = {
  configured: boolean;
  activeHours: { from: string; to: string; tz: "Asia/Ho_Chi_Minh"; active: boolean };
  now: string;
  latest: CamShot | null;
  /** Ảnh 60 phút gần nhất, MỚI → CŨ */
  items: CamShot[];
};
