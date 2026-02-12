// /lib/server-base.ts
import { headers } from "next/headers";

/**
 * Trả về absolute base URL an toàn cho SSR:
 * - Ưu tiên NEXT_PUBLIC_API_BASE_URL (nếu có)
 * - Không có -> lấy từ request headers (x-forwarded-host/proto hoặc host)
 * - Dev fallback: http://localhost:8080
 */
export async function getServerBaseUrl() {
  const pub = (process.env.NEXT_PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (pub) return pub;

  // LƯU Ý: môi trường của bạn cần await headers()
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}
