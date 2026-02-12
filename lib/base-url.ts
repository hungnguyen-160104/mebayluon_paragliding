// lib/base-url.ts
import { headers } from "next/headers";

export async function getBaseUrl() {
  // Ưu tiên biến môi trường nếu bạn có set sẵn
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (env) return env;

  // Vercel cung cấp VERCEL_URL tự động
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Lấy host/proto từ request headers
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  // Dev fallback
  if (host) return `${proto}://${host}`;
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}
