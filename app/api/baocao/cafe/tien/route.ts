// app/api/baocao/cafe/tien/route.ts
import { NextResponse } from "next/server";

import { CAFE_SPOT } from "@/lib/baobay/cafe";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, getCafeMoneySummary } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TỔNG TIỀN QUẦY CAFE theo người (chủ 04/10): tổng đã chi, còn giữ đến hiện
 * tại, và từng tháng (thu TM · chi · đã nộp · còn giữ cuối tháng).
 * Quản trị / kế toán xem mọi người; ai khác chỉ thấy của mình.
 *
 * GET -> { people: CafeMoneyPerson[] }
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, {
    roles: ["cafe", "dispatcher", "counter", "accountant", "admin"],
    allowAdmin: true,
  });
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ people: await getCafeMoneySummary(auth, CAFE_SPOT) });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/cafe/tien error:", err);
    return NextResponse.json({ message: "Không tải được tiền quầy cafe" }, { status: 500 });
  }
}
