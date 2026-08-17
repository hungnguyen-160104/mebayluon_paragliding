// app/api/baocao/booking/inbound-sapa/route.ts
import { NextResponse } from "next/server";

import { BaobayError, ingestSapaWebBooking } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * CỬA NHẬN BOOKING TỰ ĐỘNG TỪ WEB SA PA (paraglidingsapa.com).
 *
 * Bên gọi là MÁY, không phải người, nên không dùng phiên đăng nhập: xác thực
 * bằng mã bí mật dùng chung khai ở biến môi trường SAPA_INBOUND_SECRET. Chưa
 * khai biến thì cửa ĐÓNG — thà không nhận còn hơn để ngỏ cho người lạ ghi
 * booking vào sổ (đúng như cửa nhận thư OTA).
 *
 * Nhận đúng 9 thông tin của bảng Sa Pa (chưa quản tiền):
 *
 *   POST { ref, flightDate, pickupTime, pickupPoint, name, phone, guests, source, note }
 *   header: x-sapa-secret
 *
 * `ref` là MÃ BOOKING bên web Sa Pa. Gửi lại cùng một `ref` thì app SỬA bản đã
 * có chứ không tạo bản thứ hai — web bên đó gửi lại khi khách đổi giờ, đổi số
 * người, và cũng để lần gửi bị lỗi mạng thử lại được mà không sinh booking trùng.
 */
export async function POST(req: Request) {
  const secret = process.env.SAPA_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Chưa khai SAPA_INBOUND_SECRET trên máy chủ" }, { status: 503 });
  }
  if (req.headers.get("x-sapa-secret") !== secret) {
    return NextResponse.json({ message: "Sai mã bảo vệ" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Nội dung gửi lên không đọc được" }, { status: 400 });

  try {
    const res = await ingestSapaWebBooking({
      ref: String(body.ref ?? ""),
      flightDate: String(body.flightDate ?? ""),
      pickupTime: String(body.pickupTime ?? body.expectedTime ?? ""),
      pickupPoint: String(body.pickupPoint ?? body.pickup ?? ""),
      name: String(body.name ?? body.contactName ?? ""),
      phone: String(body.phone ?? ""),
      guests: Number(body.guests ?? body.guestCount ?? 0),
      source: String(body.source ?? ""),
      note: String(body.note ?? ""),
    });
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/booking/inbound-sapa error:", err);
    return NextResponse.json({ message: "Không ghi được booking Sa Pa" }, { status: 500 });
  }
}
