// app/api/baocao/my-money/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getMyMoneyDays } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Thu chi CỦA CHÍNH MÌNH gom theo ngày — khối "Thu chi của tôi" trong thẻ
 * Tiền bạc. Tối đa 45 ngày gần nhất; ai cũng chỉ xem được của mình.
 *
 * GET ?days=45 -> { days: [{ date, rows: [{content, amount, kind, method?, note?}] }] }
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req);
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const days = Number(new URL(req.url).searchParams.get("days")) || 45;
  return NextResponse.json({ days: await getMyMoneyDays(auth, spot, days) });
}
