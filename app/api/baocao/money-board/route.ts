// app/api/baocao/money-board/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getMoneyBoardOfDay } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?spot=&date= — ai đang cầm bao nhiêu tiền mặt trong ngày, khách nào đã
 * chuyển khoản về TK công ty.
 *
 * Mọi vai trò xem được: nhân sự cần thấy phần của mình trong thẻ Tiền nong, kế
 * toán cần thấy toàn cảnh để soát. Số liệu là của một ĐIỂM BAY một NGÀY nên
 * không lộ gì ngoài phạm vi người đó vốn đã làm việc.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") || todayInVN();
  if (!isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }

  return NextResponse.json(await getMoneyBoardOfDay(spot, date));
}
