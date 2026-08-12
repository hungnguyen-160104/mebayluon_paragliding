// app/api/baocao/logout/route.ts
import { NextResponse } from "next/server";

import { baobayCookieOptions } from "@/lib/baobay/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // maxAge 0 = xoá cookie ngay; phải giữ nguyên path để trình duyệt xoá đúng cookie.
  res.cookies.set({ ...baobayCookieOptions(0), value: "" });
  return res;
}
