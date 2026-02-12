// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

let configured = false;

/**
 * Khởi tạo Cloudinary từ ENV.
 * - Nếu có CLOUDINARY_URL => SDK tự đọc, mình chỉ set { secure: true }.
 * - Nếu không có => đọc 3 biến rời CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.
 * Hàm có cơ chế cache để không cấu hình lặp lại.
 */
export function initCloudinary() {
  if (configured) return cloudinary;

  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    // SDK sẽ tự đọc CLOUDINARY_URL; mình bật HTTPS cho chắc
    cloudinary.config({ secure: true });
  } else {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || "";
    const api_key = process.env.CLOUDINARY_API_KEY || "";
    const api_secret = process.env.CLOUDINARY_API_SECRET || "";
    if (!cloud_name || !api_key || !api_secret) {
      console.warn("⚠️  Cloudinary env not set; /uploads endpoints will be disabled.");
      return null;
    }
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  }

  configured = true;
  return cloudinary;
}

/** (Tuỳ chọn) Ping kiểm tra credentials; trả về true/false, không throw */
export async function verifyCloudinary(): Promise<boolean> {
  try {
    const ping = await (cloudinary as any).api?.ping?.();
    return ping?.status === "ok";
  } catch {
    return false;
  }
}

export { cloudinary };
