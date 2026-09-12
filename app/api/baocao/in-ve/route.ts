// app/api/baocao/in-ve/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import { ketThucLenh, lenhGanDay, nhanLenh, nhipTram, taoLenhIn, tramNghi, trangThaiLenh, trangThaiTram } from "@/services/in-ve.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HÀNG ĐỢI IN VÉ + TRẠM IN (xem models/BaobayPrintJob.model.ts).
 *
 * GET   ?spot=&tram=1        → trạm của điểm có đang trực không
 * GET   ?spot=&job=<id>      → trạng thái một lệnh (người bấm in theo dõi)
 * GET   ?spot=&nhan=1&tram-ten= → TRẠM nhận lệnh kế tiếp kèm booking (null nếu hết)
 * GET   ?spot=&nhatky=1      → 20 lệnh gần nhất (bảng trên trang trạm)
 * POST  {bookingId, reason}  → đưa lệnh vào hàng đợi
 * PATCH {action:"nhip", deviceName, kenh} | {action:"nghi"} | {action:"xong"|"loi", id, error}
 */
const ROLES = ["dispatcher", "counter", "accountant", "admin"] as const;

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const q = new URL(req.url).searchParams;
  try {
    if (q.get("tram")) return NextResponse.json({ tram: await trangThaiTram(spot) });
    if (q.get("job")) return NextResponse.json({ job: await trangThaiLenh(spot, q.get("job") || "") });
    if (q.get("nhan")) return NextResponse.json({ lenh: await nhanLenh(auth, spot, q.get("tram-ten") || auth.name) });
    if (q.get("nhatky")) return NextResponse.json({ items: await lenhGanDay(spot) });
    return NextResponse.json({ message: "Thiếu tham số" }, { status: 400 });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/in-ve error:", err);
    return NextResponse.json({ message: "Không đọc được hàng đợi in" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await taoLenhIn(auth, spot, String(body?.bookingId ?? ""), String(body?.reason ?? "")), { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/in-ve error:", err);
    return NextResponse.json({ message: "Không gửi được lệnh in" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  try {
    if (action === "nhip") return NextResponse.json({ tram: await nhipTram(auth, spot, String(body?.deviceName ?? ""), String(body?.kenh ?? "")) });
    if (action === "nghi") {
      await tramNghi(spot);
      return NextResponse.json({ ok: true });
    }
    if (action === "xong" || action === "loi") {
      return NextResponse.json({ job: await ketThucLenh(spot, String(body?.id ?? ""), action === "xong", String(body?.error ?? "")) });
    }
    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("PATCH /api/baocao/in-ve error:", err);
    return NextResponse.json({ message: "Không cập nhật được hàng đợi in" }, { status: 500 });
  }
}
