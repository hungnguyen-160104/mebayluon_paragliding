// app/api/baocao/booking/sync-web/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { syncWebBookings } from "@/services/baobay-web-sync.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Quét vài chục booking web + ghi Mongo: cho rộng thời gian như các route lưu báo cáo. */
export const maxDuration = 30;

/**
 * POST ?spot= — kéo booking khách tự đặt trên mebayluon.com/booking vào sổ nội bộ.
 *
 * Chạy được nhiều lần: khoá theo id booking web nên không nhân đôi bản ghi.
 * Body tuỳ chọn { fromDate: "YYYY-MM-DD" } để kéo lại cả những ngày đã qua.
 */
export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const fromDate = typeof body?.fromDate === "string" && isDateKey(body.fromDate) ? body.fromDate : undefined;

  try {
    const result = await syncWebBookings(spot, fromDate ? { fromDate } : undefined);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/baocao/booking/sync-web error:", err);
    return NextResponse.json({ message: "Không đồng bộ được booking từ website" }, { status: 500 });
  }
}
