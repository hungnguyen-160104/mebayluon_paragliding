// lib/bao-bay-token.ts
/**
 * VÉ HUỶ BÁO BAY — chuỗi ký HMAC để mở đúng một báo bay mà không cần gõ lại
 * SĐT (link trong thư xác nhận, và sau khi phi công đã xác minh ở khung huỷ).
 *
 * Chỉ chạy ở máy chủ. Khoá ký: BAO_BAY_SECRET, không có thì CRON_SECRET rồi
 * JWT_SECRET (đã có sẵn trên Vercel). Không có khoá nào thì KHÔNG phát vé
 * (link huỷ trong thư bị bỏ, phi công vẫn huỷ bằng mã + SĐT như thường) —
 * tuyệt đối không ký bằng một chuỗi cố định viết trong mã.
 *
 * Vé không có hạn dùng: sau 9h00 ngày bay thì máy chủ đằng nào cũng không cho
 * huỷ ngày đó; vé chỉ mở được đúng báo bay đã ký.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  return process.env.BAO_BAY_SECRET || process.env.CRON_SECRET || process.env.JWT_SECRET || "";
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(`baobay-cancel:${payload}`).digest("base64url").slice(0, 32);
}

/** Vé cho một báo bay (theo mã báo bay); rỗng khi máy chủ chưa có khoá ký. */
export function makeCancelToken(noticeCode: string): string {
  const key = secret();
  if (!key || !noticeCode) return "";
  const p = Buffer.from(noticeCode, "utf8").toString("base64url");
  return `${p}.${sign(noticeCode, key)}`;
}

/** Trả mã báo bay nếu vé hợp lệ, không thì null (vé sửa một ký tự cũng hỏng). */
export function readCancelToken(token: unknown): string | null {
  const key = secret();
  const t = String(token ?? "");
  if (!key || !t || t.length > 200) return null;
  const [p, sig] = t.split(".");
  if (!p || !sig) return null;
  let code: string;
  try {
    code = Buffer.from(p, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const want = Buffer.from(sign(code, key));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return code;
}
