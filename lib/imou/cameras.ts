// lib/imou/cameras.ts
/**
 * DANH SÁCH CAMERA BÃI CẤT (chủ 30/09/2026) — dùng chung cho máy chủ lẫn trình
 * duyệt, nên ở đây TUYỆT ĐỐI không có bí mật: chỉ tên biến môi trường, thư mục
 * Cloudinary, khung giờ chụp.
 *
 * Camera Imou (AOV PT, 4G) ở bãi cất cánh cao Viên Nam chụp 1 ảnh/phút từ
 * 08:00 tới 18:00 giờ Việt Nam; trang /baobay hiện ảnh mới nhất + 60 phút gần
 * nhất. Thêm camera mới = thêm một mục vào CAMERAS, không phải sửa route.
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
  /** Thư mục Cloudinary giữ ảnh; ảnh cũ hơn KEEP_MINUTES bị xoá */
  folder: string;
};

export const CAMERAS: Record<CamId, CamConfig> = {
  "vien-nam": {
    id: "vien-nam",
    name: { vi: "Camera bãi cao Viên Nam", en: "Vien Nam top launch camera" },
    snEnv: "IMOU_CAM_VIENNAM_SN",
    codeEnv: "IMOU_CAM_VIENNAM_CODE",
    channelId: "0",
    folder: "baobay-cam/vien-nam",
  },
};

export function isCamId(x: unknown): x is CamId {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(CAMERAS, x);
}

/** Giờ chụp theo giờ Việt Nam: [08:00, 18:00] — phút 18:00 vẫn chụp. */
export const CAM_ACTIVE = { fromMin: 8 * 60, toMin: 18 * 60, label: "08:00–18:00" } as const;
/** Trang hiện ảnh của bấy nhiêu phút gần nhất */
export const CAM_WINDOW_MINUTES = 60;
/** Cloudinary giữ ảnh bấy nhiêu phút rồi xoá (dư 30 phút cho khung 60 phút) */
export const CAM_KEEP_MINUTES = 90;
/** Ảnh mới nhất cũ hơn chừng này (trong giờ chụp) thì coi như camera mất kết nối */
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

/** "08:41" theo giờ Việt Nam */
export function vnHHMM(t: Date | number | string): string {
  const d = new Date(new Date(t).getTime() + VN_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Nhãn theo giờ VN dùng làm public_id: "20260930-0841" */
export function vnStamp(t: Date | number = Date.now()): string {
  const d = new Date((typeof t === "number" ? t : t.getTime()) + VN_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

/** Dữ liệu API /api/camera/[cam] trả về */
export type CamShot = { url: string; thumb: string; takenAt: string };
export type CamFeed = {
  configured: boolean;
  activeHours: { from: string; to: string; tz: "Asia/Ho_Chi_Minh"; active: boolean };
  now: string;
  latest: CamShot | null;
  /** Ảnh 60 phút gần nhất, MỚI → CŨ */
  items: CamShot[];
};
