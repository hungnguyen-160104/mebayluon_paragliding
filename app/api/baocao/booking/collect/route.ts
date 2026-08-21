// app/api/baocao/booking/collect/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  editBookingCollect,
  listBookingCollects,
  moveBookingCollect,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SỬA KHOẢN ĐÃ THU của một booking — nhập nhầm số, nhầm TM/CK, nhầm mã giao dịch.
 *
 * Chỉ ĐIỀU PHỐI / QUẦY VÉ / KẾ TOÁN: phi công thu tiền được nhưng không sửa lại
 * khoản đã ghi — sửa tiền của chính mình đang giữ thì sổ mất chỗ dựa.
 *
 * GET   ?booking=   — liệt kê các khoản đã thu của booking
 * PATCH { id, amount?, method?, transferCode?, remove? }
 * PATCH { id, moveTo }  — CHUYỂN khoản sang booking khác (chỉ kế toán): ghi
 *                         nhầm tiền của khách này sang khách kia thì sửa bằng
 *                         một thao tác, giữ nguyên mã GD và người thu.
 */
const ROLES = ["dispatcher", "counter", "accountant", "admin"] as const;

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const bookingId = new URL(req.url).searchParams.get("booking") || "";
  return NextResponse.json({ collects: await listBookingCollects(spot, bookingId) });
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id khoản thu" }, { status: 400 });

  try {
    // Ghi nhầm sang booking khác: CHUYỂN cả khoản sang đúng chủ (chỉ kế toán)
    const moveTo = String(body?.moveTo ?? "").trim();
    if (moveTo) {
      return NextResponse.json(await moveBookingCollect(auth, spot, id, moveTo));
    }
    const res = await editBookingCollect(auth, spot, id, {
      amount: body?.amount !== undefined ? Number(body.amount) : undefined,
      method: body?.method === "transfer" ? "transfer" : body?.method === "cash" ? "cash" : undefined,
      transferCode: body?.transferCode !== undefined ? String(body.transferCode) : undefined,
      remove: Boolean(body?.remove),
    });
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("PATCH /api/baocao/booking/collect error:", err);
    return NextResponse.json({ message: "Không sửa được khoản thu" }, { status: 500 });
  }
}
