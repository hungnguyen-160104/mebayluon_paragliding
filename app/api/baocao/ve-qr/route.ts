// app/api/baocao/ve-qr/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { todayInVN } from "@/lib/baobay/date";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import { bayXong, boBayXong, daXemThuHoi, hoanDichVu, hoanMa, quetVe, thuHoiMa, veCuaToi } from "@/services/ve-qr.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MÃ VÉ QR — trang quét của phi công (xem services/ve-qr.service.ts).
 *
 * GET  ?spot=&date=YYYY-MM-DD[&tatca=1] → mã tôi giữ trong ngày + cảnh báo thu hồi + tổng hợp
 * POST {action:"quet", text, date}      → chiếm mã (hoặc báo mã đã của người khác / ngày khác)
 * POST {action:"bayxong"|"bobayxong"|"hoan"|"hoandv"|"daxem", bookingId, guestNo, dichVu?, lyDo?}
 * POST {action:"thuhoi", bookingId, guestNo, lyDo?}   — điều phối / quầy / quản trị
 */
const VAI_QUET = ["pilot", "dispatcher", "counter", "admin"] as const;

function loi(err: unknown, mac: string) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error(mac, err);
  return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...VAI_QUET, "accountant"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const q = new URL(req.url).searchParams;
  try {
    return NextResponse.json(await veCuaToi(auth, spot, q.get("date") || todayInVN(), q.get("tatca") === "1"));
  } catch (err) {
    return loi(err, "GET /api/baocao/ve-qr error:");
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: [...VAI_QUET] });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const bookingId = String(body?.bookingId ?? "");
  const guestNo = Number(body?.guestNo) || 0;
  const lyDo = String(body?.lyDo ?? "");
  try {
    if (action === "quet") return NextResponse.json(await quetVe(auth, spot, { text: String(body?.text ?? ""), date: String(body?.date ?? "") }));
    if (action === "bayxong") return NextResponse.json({ ma: await bayXong(auth, spot, bookingId, guestNo) });
    if (action === "bobayxong") return NextResponse.json({ ma: await boBayXong(auth, spot, bookingId, guestNo) });
    if (action === "hoan") return NextResponse.json({ ma: await hoanMa(auth, spot, bookingId, guestNo, lyDo) });
    if (action === "hoandv") return NextResponse.json({ ma: await hoanDichVu(auth, spot, bookingId, guestNo, String(body?.dichVu ?? "") as never, lyDo) });
    if (action === "daxem") {
      await daXemThuHoi(auth, spot, bookingId, guestNo);
      return NextResponse.json({ ok: true });
    }
    if (action === "thuhoi") {
      if (auth.role === "pilot" && !(auth.extraRoles ?? []).some((r) => r === "dispatcher" || r === "counter" || r === "admin")) {
        return NextResponse.json({ message: "Phi công không thu hồi mã của người khác — nhờ điều phối" }, { status: 403 });
      }
      return NextResponse.json({ ma: await thuHoiMa(auth, spot, bookingId, guestNo, lyDo) });
    }
    return NextResponse.json({ message: "Thiếu action" }, { status: 400 });
  } catch (err) {
    return loi(err, "POST /api/baocao/ve-qr error:");
  }
}
