// app/api/booking/sua/route.ts
/**
 * KHÁCH TỰ SỬA BOOKING (30/09/2026) — xem services/booking-khach-sua.service.ts.
 *
 * POST  { ma, sdt }                → tra cứu, trả booking + thẻ sửa
 * PATCH { the, thayDoi }           → áp thay đổi
 * PUT   { the, lyDo }              → gửi yêu cầu huỷ
 */
import { NextResponse } from "next/server";

import {
  khachSuaBooking,
  khachYeuCauHuy,
  LoiKhachSua,
  traCuuBooking,
} from "@/services/booking-khach-sua.service";

export const runtime = "nodejs";

const ipCua = (req: Request) =>
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "khong-ro";

async function chay<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json({ ok: true, ...(await fn()) });
  } catch (e) {
    if (e instanceof LoiKhachSua) return NextResponse.json({ ok: false, message: e.message }, { status: e.status });
    console.error("/api/booking/sua error:", e);
    return NextResponse.json({ ok: false, message: "Có lỗi, vui lòng thử lại hoặc gọi hotline 0964 073 555" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return chay(() => traCuuBooking({ ma: body?.ma, sdt: body?.sdt, ip: ipCua(req) }));
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  return chay(() => khachSuaBooking({ the: body?.the, thayDoi: body?.thayDoi ?? {} }));
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  return chay(() => khachYeuCauHuy({ the: body?.the, lyDo: body?.lyDo }));
}
