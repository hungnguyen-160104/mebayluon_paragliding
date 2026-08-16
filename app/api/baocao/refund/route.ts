// app/api/baocao/refund/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, listRefunds, payRefund } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LỆNH HOÀN TIỀN cho khách.
 *
 * GET   ?date=  — lệnh trong ngày + mọi lệnh còn chờ của ngày trước
 * PATCH { id, transferCode, amount?, note? } — KẾ TOÁN xác nhận đã chuyển
 *
 * Lệnh được LẬP TỰ ĐỘNG khi huỷ booking có hoàn tiền, nên ở đây không có POST:
 * hoàn tiền phải bám vào một việc có thật, không ai tự nghĩ ra một khoản hoàn.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") || todayInVN();
  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  return NextResponse.json({ refunds: await listRefunds(spot, date) });
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  try {
    const item = await payRefund(auth, spot, String(body?.id ?? ""), {
      amount: body?.amount !== undefined ? Number(body.amount) : undefined,
      transferCode: String(body?.transferCode ?? ""),
      note: body?.note !== undefined ? String(body.note) : undefined,
    });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("PATCH /api/baocao/refund error:", err);
    return NextResponse.json({ message: "Không xác nhận được lệnh hoàn" }, { status: 500 });
  }
}
