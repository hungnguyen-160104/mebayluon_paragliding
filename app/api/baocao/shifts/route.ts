// app/api/baocao/shifts/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, getMyShifts } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Lịch bay của CHÍNH mình.
 *
 * Email báo lịch là kênh chính, nhưng phi công hay mất thư hoặc đổi máy — mở
 * trang báo cáo là thấy ngay lịch tháng này, khỏi phải hỏi lại quản lý.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req);
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const month = new URL(req.url).searchParams.get("month") || "";
  if (!MONTH.test(month)) {
    return NextResponse.json({ message: "Tháng không hợp lệ" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getMyShifts(auth, spot, month));
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("GET /api/baocao/shifts error:", err);
    return NextResponse.json({ message: "Không tải được lịch bay" }, { status: 500 });
  }
}
