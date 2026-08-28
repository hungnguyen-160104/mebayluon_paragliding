// app/api/baocao/thue/route.ts
import { NextResponse } from "next/server";

import { shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  buildTaxXlsx,
  listTaxCandidates,
  removeTaxRecord,
  saveTaxRecord,
} from "@/services/baobay-tax.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Kỳ dài + đóng gói Excel có thể ngốn vài giây. */
export const maxDuration = 30;

/**
 * KẾ TOÁN THUẾ — cửa API DUY NHẤT chạm tới hồ sơ xuất hoá đơn VAT.
 *
 * CHỈ vai "tax" và "admin" (quản trị vốn là quyền cao nhất — chủ hệ thống).
 * CỐ Ý không mở cho "accountant": bảng này mang CCCD / hộ chiếu / mã số thuế
 * của khách, và việc chọn khách nào xuất hoá đơn là việc riêng của kế toán
 * thuế — lý do tách vai ghi ở lib/baobay/roles.ts.
 *
 *   GET    ?from&to           danh sách booking + hồ sơ đã nhặt
 *   GET    ?from&to&export=1  tải file Excel (booking đã nhặt trong khoảng)
 *   POST   {bookingId, ...}   nhặt / sửa hồ sơ thuế
 *   DELETE {bookingId}        bỏ nhặt
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["tax", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const params = new URL(req.url).searchParams;
  const today = todayInVN();
  const from = params.get("from") || shiftDateKey(today, -29);
  const to = params.get("to") || today;

  try {
    if (params.get("export") === "1") {
      const { file, name } = await buildTaxXlsx(auth, from, to);
      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(await listTaxCandidates(auth, from, to));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/thue error:", err);
    return NextResponse.json({ message: "Không tải được danh sách thuế" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["tax", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const bookingId = String(body?.bookingId ?? "");
  if (!bookingId) return NextResponse.json({ message: "Thiếu bookingId" }, { status: 400 });

  try {
    const record = await saveTaxRecord(auth, bookingId, body ?? {});
    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/thue error:", err);
    return NextResponse.json({ message: "Không lưu được hồ sơ thuế" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireBaobay(req, { roles: ["tax", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const bookingId = String(body?.bookingId ?? "");
  if (!bookingId) return NextResponse.json({ message: "Thiếu bookingId" }, { status: 400 });

  try {
    await removeTaxRecord(auth, bookingId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("DELETE /api/baocao/thue error:", err);
    return NextResponse.json({ message: "Không bỏ được hồ sơ thuế" }, { status: 500 });
  }
}
