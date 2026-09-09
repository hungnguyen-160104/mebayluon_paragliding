// app/api/baocao/booking/blank/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, createBlankBookingRow } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * THÊM MỘT HÀNG TRỐNG vào sổ booking của một ngày — nút "+ Thêm hàng" ở cuối
 * lưới kiểu bảng tính.
 *
 *   POST ?spot=…  { flightDate: "YYYY-MM-DD" }
 *
 * Cửa RIÊNG chứ không dùng cửa tạo booking đầy đủ: cửa kia bắt buộc nguồn
 * khách, số khách, tiền — đúng cho form nhập, nhưng ở lưới thì người ta gõ dần
 * từng ô, và bắt điền đủ trước khi có dòng thì mất hẳn cảm giác bảng tính.
 */
export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => null);
  if (!body?.flightDate) return NextResponse.json({ message: "Thiếu ngày bay" }, { status: 400 });

  try {
    return NextResponse.json(
      await createBlankBookingRow(auth, spot, {
        flightDate: String(body.flightDate),
        /** Dòng nhập nhanh (nếu có) — máy chủ tự bóc, xem createBlankBookingRow. */
        quick: typeof body.quick === "string" ? body.quick : undefined,
      }),
    );
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/booking/blank error:", err);
    return NextResponse.json({ message: "Không thêm được hàng" }, { status: 500 });
  }
}
