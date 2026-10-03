// lib/imou/defaults.server.ts
/**
 * CẤU HÌNH CAMERA PHÍA MÁY CHỦ — chỉ import từ route handler / mã máy chủ,
 * KHÔNG import từ component "use client" (lib/imou/cameras.ts mới là file dùng
 * chung với trình duyệt). Dự án chưa cài gói `server-only` nên chặn bằng tay ở dưới.
 *
 * Nguồn chính luôn là biến môi trường (Vercel). Riêng số serial có bản mặc định
 * ở đây để camera Khau Phạ và bãi hạ cánh Viên Nam chạy được ngay cả trước khi chủ khai env: serial chỉ
 * là mã định danh máy, một mình nó không mở được camera — phải có AppId/AppSecret
 * của tài khoản dev Imou (IMOU_APP_ID / IMOU_APP_SECRET, chỉ có trên Vercel).
 *
 * MÃ AN TOÀN (code dưới đáy máy) KHÔNG BAO GIỜ được ghi vào repo — chỉ đọc từ env
 * (CAMERAS[cam].codeEnv), và chỉ cần khi camera chưa gắn vào tài khoản dev.
 */
import { CAMERAS, type CamId } from "./cameras";

if (typeof window !== "undefined") {
  throw new Error("lib/imou/defaults.server.ts chỉ dùng ở máy chủ");
}

/** Serial mặc định khi chưa khai env. Viên Nam không có — luôn lấy từ env như trước. */
const DEFAULT_SN: Partial<Record<CamId, string>> = {
  // Imou Cruiser Dual 2C 4G "MCC Bãi cất" — chủ gửi 03/10/2026
  "khau-pha": "C7AE1BDPCGAA27F",
  // Imou AOV PT "Viên Nam BHC" (bãi hạ cánh) — chủ gửi 03/10/2026
  "vien-nam-bhc": "526EBBJPSF99088",
};

const env = (name: string | undefined) => (name ? (process.env[name] || "").trim() : "");

/** Số serial (deviceId): env trước, rồi mới tới bản mặc định. */
export function camSerial(cam: CamId): string {
  return env(CAMERAS[cam].snEnv) || DEFAULT_SN[cam] || "";
}

/** Kênh chụp: env ghi đè (máy hai ống kính) → kênh mặc định trong CAMERAS. */
export function camChannel(cam: CamId): string {
  return env(CAMERAS[cam].channelEnv) || CAMERAS[cam].channelId;
}

/** Mã an toàn để bindDevice — CHỈ từ env, rỗng nếu chưa khai. */
export function camBindCode(cam: CamId): string {
  return env(CAMERAS[cam].codeEnv);
}
