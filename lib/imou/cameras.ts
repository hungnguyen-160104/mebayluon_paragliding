// lib/imou/cameras.ts
/**
 * DANH SÁCH CAMERA BÃI CẤT (chủ 30/09/2026) — dùng chung cho máy chủ lẫn trình
 * duyệt, nên ở đây TUYỆT ĐỐI không có bí mật: chỉ tên biến môi trường, khung giờ chụp.
 *
 * Camera Imou (AOV PT, 4G) ở bãi cất cánh cao Viên Nam chụp 08:00–18:00 giờ Việt
 * Nam (nhịp xem shouldSnapNow); trang /baobay hiện ảnh mới nhất + 60 phút gần
 * nhất. Thêm camera mới = thêm một mục vào CAMERAS, không phải sửa route.
 *
 * KHÔNG LƯU ẢNH (chủ 01/10/2026 — không để web đầy dung lượng/băng thông): web
 * chỉ giữ LINK ảnh do Imou cấp (sống 7 ngày) trong MongoDB; trình duyệt tải ảnh
 * thẳng từ máy chủ Imou, Vercel/Cloudinary không chứa và không chuyển byte ảnh nào.
 */

export type CamId = "vien-nam";

export type CamConfig = {
  id: CamId;
  /** Tên hiện trên trang */
  name: { vi: string; en: string };
  /** Biến môi trường chứa số serial (deviceId) của camera */
  snEnv: string;
  /** Biến môi trường chứa mã an toàn 6 số dán dưới đáy máy — chỉ dùng khi bindDevice */
  codeEnv: string;
  /** Kênh của camera — máy một ống kính luôn là "0" */
  channelId: string;
};

export const CAMERAS: Record<CamId, CamConfig> = {
  "vien-nam": {
    id: "vien-nam",
    name: { vi: "Camera bãi cao Viên Nam", en: "Vien Nam top launch camera" },
    snEnv: "IMOU_CAM_VIENNAM_SN",
    codeEnv: "IMOU_CAM_VIENNAM_CODE",
    channelId: "0",
  },
};

export function isCamId(x: unknown): x is CamId {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(CAMERAS, x);
}

/** Giờ chụp theo giờ Việt Nam: [08:00, 18:00] — phút 18:00 vẫn chụp. */
export const CAM_ACTIVE = { fromMin: 8 * 60, toMin: 18 * 60, label: "08:00–18:00" } as const;
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

/** Đang trong giờ chụp (08:00–18:00 giờ VN)? */
export function inCamActiveHours(t: Date | number = Date.now()): boolean {
  const m = vnMinuteOfDay(t);
  return m >= CAM_ACTIVE.fromMin && m <= CAM_ACTIVE.toMin;
}

/**
 * NHỊP CHỤP (chủ 01/10/2026, cho đỡ tốn lượt gọi): 10:00–15:00 giờ VN chụp MỖI
 * PHÚT (giờ bay chính); 08:00–10:00 và 15:00–18:00 chỉ chụp phút chia hết cho 3
 * (3 phút/lần). ≈ 300 + 100 = 400 ảnh/ngày thay vì ~600. Lịch gọi vẫn mỗi phút,
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
