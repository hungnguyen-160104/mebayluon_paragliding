// lib/bao-bay-rate.ts
/**
 * Giới hạn số lần gọi các cửa công khai của /baobay theo địa chỉ IP.
 *
 * Quan trọng nhất là cửa tra mã hội viên: không chặn thì ai cũng dò được hết
 * mã HNAA (mã thường ngắn, đánh số liền) để lấy suất bay miễn phí.
 *
 * Bộ đếm nằm trong bộ nhớ từng tiến trình (middlewares/security-middleware) —
 * trên Vercel mỗi lambda đếm riêng nên chỉ là lớp chặn thô, đủ làm chậm dò hàng
 * loạt, không phải hàng rào tuyệt đối.
 */
import { NextResponse } from "next/server";

import { checkRateLimit } from "@/middlewares/security-middleware";

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ---------------- đếm riêng số lần NHẬP SAI mã hội viên ---------------- */

/**
 * Chỉ tính lần SAI, không tính lần đúng: hội viên thật gõ đúng mã rồi trang
 * báo giá lại chục lần (mỗi lần đổi ngày) cũng không bị khoá; kẻ dò mã thì gần
 * như lần nào cũng sai nên chạm trần rất nhanh. Phải KIỂM trước khi tra (không
 * tăng đếm) rồi mới ghi khi sai — checkRateLimit gộp hai việc làm một nên không
 * dùng được ở đây.
 */
const MEMBER_FAIL_MAX = 8;
const MEMBER_FAIL_WINDOW_MS = 15 * 60_000;
const memberFails = new Map<string, { count: number; resetAt: number }>();

export function memberLookupBlocked(req: Request): NextResponse | null {
  const hit = memberFails.get(clientIp(req));
  if (!hit || Date.now() > hit.resetAt || hit.count < MEMBER_FAIL_MAX) return null;
  return NextResponse.json(
    {
      ok: false,
      code: "rate",
      message: "Nhập sai mã hội viên quá nhiều lần, vui lòng thử lại sau 15 phút",
    },
    { status: 429 },
  );
}

export function recordMemberFailure(req: Request): void {
  const ip = clientIp(req);
  const now = Date.now();
  const hit = memberFails.get(ip);
  if (!hit || now > hit.resetAt) {
    memberFails.set(ip, { count: 1, resetAt: now + MEMBER_FAIL_WINDOW_MS });
    return;
  }
  hit.count++;
}

/** Trả về phản hồi 429 khi vượt ngưỡng, null nếu còn được gọi. */
export function baoBayRateLimit(
  req: Request,
  bucket: string,
  max: number,
  windowMs: number,
): NextResponse | null {
  if (checkRateLimit(`baobay:${bucket}:${clientIp(req)}`, max, windowMs)) return null;
  return NextResponse.json(
    { ok: false, code: "rate", message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" },
    { status: 429 },
  );
}
