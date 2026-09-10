// app/api/baocao/merch/thong-ke/route.ts
import { NextResponse } from "next/server";

import { todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, thongKeHangBanThem } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * THỐNG KÊ HÀNG BÁN THÊM trong khoảng ngày — ngày, tháng, hay dải tuỳ ý.
 *
 *   GET ?spot=&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * MỌI VAI ĐỨNG BÁN đều xem được, không chỉ kế toán: người trực phải tự đối
 * được số hàng mình bán với tiền mình giữ TRƯỚC khi ngồi chốt với chủ. Bắt hỏi
 * kế toán mới biết mình bán bao nhiêu thì không ai chốt nổi.
 */
const ROLES = ["dispatcher", "counter", "pilot", "cameraman", "accountant", "admin"] as const;

/** Chặn dải quá dài: quét ba bộ sưu tập báo cáo, một năm là đủ cho mọi lần chốt. */
const TOI_DA_NGAY = 400;

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const q = new URL(req.url).searchParams;
  const hopLe = (x: string | null) => (x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
  const to = hopLe(q.get("to")) ?? todayInVN();
  const from = hopLe(q.get("from")) ?? to;
  if (from > to) {
    return NextResponse.json({ message: "Ngày bắt đầu phải trước ngày kết thúc" }, { status: 400 });
  }
  const soNgay = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  if (soNgay > TOI_DA_NGAY) {
    return NextResponse.json({ message: `Khoảng ngày quá dài (tối đa ${TOI_DA_NGAY} ngày)` }, { status: 400 });
  }

  try {
    return NextResponse.json(await thongKeHangBanThem(spot, from, to));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/merch/thong-ke error:", err);
    return NextResponse.json({ message: "Không lấy được thống kê hàng bán thêm" }, { status: 500 });
  }
}
