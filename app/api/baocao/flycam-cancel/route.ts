// app/api/baocao/flycam-cancel/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  createFlycamCancel,
  listFlycamCancels,
  listSpotStaffAll,
  lookupTicketCode,
  payFlycamRefund,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HUỶ FLYCAM vì lỗi vận hành + lệnh hoàn tiền cho khách.
 *
 * GET  ?date=&code=  — danh sách lệnh trong ngày (+ lệnh còn chờ), danh bạ phi
 *                      công, và kết quả TRA MÃ VÉ nếu gửi kèm `code`.
 * POST               — camera man lập lệnh huỷ + hoàn tiền.
 * PATCH { id, transferCode } — kế toán xác nhận đã chuyển tiền cho khách.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayInVN();
  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  const code = url.searchParams.get("code") || "";

  const [items, staff, lookup] = await Promise.all([
    listFlycamCancels(spot, date),
    listSpotStaffAll(spot),
    code ? lookupTicketCode(spot, code) : Promise.resolve(null),
  ]);
  return NextResponse.json({
    items,
    // Chỉ phi công mới "bay kèm" được — lọc sẵn cho ô chọn khỏi dài dòng
    pilots: staff.filter((p) => p.role === "pilot"),
    lookup,
  });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["cameraman", "pilot", "dispatcher", "counter", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  try {
    const item = await createFlycamCancel(auth, spot, {
      date: String(body?.date ?? todayInVN()),
      ticketCode: String(body?.ticketCode ?? ""),
      pilotUsername: String(body?.pilotUsername ?? ""),
      reason: String(body?.reason ?? ""),
      refundMode: body?.refundMode === "self" ? "self" : "company",
      amount: Number(body?.amount) || 0,
      bankAccount: String(body?.bankAccount ?? ""),
      bookingId: String(body?.bookingId ?? ""),
      // Dịch vụ bị huỷ (flycam/360/cờ đỏ/hoàng hôn/kéo cờ) — thiếu thì là flycam
      service: String(body?.service ?? "flycam"),
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/flycam-cancel error:", err);
    return NextResponse.json({ message: "Không lưu được lệnh huỷ flycam" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  try {
    const item = await payFlycamRefund(auth, spot, String(body?.id ?? ""), String(body?.transferCode ?? ""));
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("PATCH /api/baocao/flycam-cancel error:", err);
    return NextResponse.json({ message: "Không xác nhận được lệnh hoàn" }, { status: 500 });
  }
}
