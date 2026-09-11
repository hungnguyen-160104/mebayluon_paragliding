// app/api/baocao/reports/nhan-su/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, hoSoNhanSuNgay } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HỒ SƠ MỘT NHÂN SỰ TRONG MỘT NGÀY — mọi việc người đó đã bấm trong sổ booking:
 * lệnh thu, khách huỷ, khách dời, dịch vụ thêm/bớt, tiền nộp/ứng.
 *
 *   GET ?spot=&date=YYYY-MM-DD&username=
 *
 * CHỈ KẾ TOÁN VÀ QUẢN TRỊ: đây là số của NGƯỜI KHÁC. Người trực muốn xem phần
 * của chính mình thì đã có trang "tiền của tôi" — mở endpoint này cho họ là mở
 * luôn lối xem tiền của đồng nghiệp.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const q = new URL(req.url).searchParams;
  const date = q.get("date") ?? "";
  const username = (q.get("username") ?? "").trim();
  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  if (!username) return NextResponse.json({ message: "Thiếu tên đăng nhập" }, { status: 400 });

  try {
    return NextResponse.json(await hoSoNhanSuNgay(spot, date, username));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/reports/nhan-su error:", err);
    return NextResponse.json({ message: "Không lấy được hồ sơ nhân sự" }, { status: 500 });
  }
}
