// app/api/baocao/money-board/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { bangTienCuaRieng, getMoneyBoardOfDay } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?spot=&date= — ai đang cầm bao nhiêu tiền mặt trong ngày, khách nào đã
 * chuyển khoản về TK công ty.
 *
 * AI THẤY GÌ (luật chủ 11/09):
 *  · KẾ TOÁN / QUẢN TRỊ: cả bảng — họ phải soát toàn cảnh mới chốt được ngày.
 *  · MỌI VAI KHÁC (quầy vé, điều phối, phi công, camera man): CHỈ phần của
 *    chính mình. Tiền đồng nghiệp thu được không phải việc của họ, mà bày ra
 *    thì thành chỗ so bì.
 *
 * Cắt Ở ĐÂY chứ không ẩn bằng giao diện: ẩn bằng giao diện thì số vẫn nằm
 * trong gói dữ liệu gửi về máy họ, mở công cụ trình duyệt ra là đọc được.
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

  const board = await getMoneyBoardOfDay(spot, date);
  const toanCanh = auth.role === "accountant" || auth.role === "admin" || auth.viaAdmin === true ||
    (auth.extraRoles ?? []).some((r) => r === "accountant" || r === "admin");
  return NextResponse.json(toanCanh ? board : bangTienCuaRieng(board, auth.username));
}
