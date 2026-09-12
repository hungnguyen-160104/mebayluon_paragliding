// app/api/baocao/reports/nhan-su/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { wearsRole } from "@/lib/baobay/roles";
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
 * KẾ TOÁN VÀ QUẢN TRỊ xem được của mọi người. Người khác CHỈ xem được hồ sơ
 * của CHÍNH MÌNH (chủ 12/09: trang điều phối phải thấy "tổng thu / tổng chi"
 * theo sổ chứ không phải 0 ₫) — hỏi tên người khác là 403, không lộ tiền của
 * đồng nghiệp.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const q = new URL(req.url).searchParams;
  const date = q.get("date") ?? "";
  const username = (q.get("username") ?? "").trim();
  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  if (!username) return NextResponse.json({ message: "Thiếu tên đăng nhập" }, { status: 400 });
  const quanLy = auth.viaAdmin || wearsRole(auth, "accountant") || wearsRole(auth, "admin");
  if (!quanLy && username.toLowerCase() !== auth.username.toLowerCase()) {
    return NextResponse.json({ message: "Chỉ xem được hồ sơ của chính mình" }, { status: 403 });
  }

  try {
    return NextResponse.json(await hoSoNhanSuNgay(spot, date, username));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/reports/nhan-su error:", err);
    return NextResponse.json({ message: "Không lấy được hồ sơ nhân sự" }, { status: 500 });
  }
}
