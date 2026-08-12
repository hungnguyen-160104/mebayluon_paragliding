// app/api/baocao/my-summary/route.ts
import { NextResponse } from "next/server";

import { shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { firstZodMessage, summaryQuerySchema } from "@/lib/baobay/validation";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getMyPeriodSummary } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tổng theo chu kỳ của CHÍNH người đang đăng nhập: ?from=&to= (mặc định 30 ngày).
 *
 * Cho phi công / điều phối / camera man — mỗi người chỉ thấy số của mình.
 * Kế toán không cần endpoint này: bảng tổng hợp (/api/baocao/summary) đã có đủ
 * và nhiều hơn.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["pilot", "dispatcher", "cameraman"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const today = todayInVN();

  const parsed = summaryQuerySchema.safeParse({
    spot,
    from: params.get("from") || shiftDateKey(today, -29),
    to: params.get("to") || today,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  return NextResponse.json(await getMyPeriodSummary(auth, spot, parsed.data.from, parsed.data.to));
}
