// app/api/homestay/book/route.ts
import { NextResponse } from "next/server";
import { after } from "next/server";

import { schedulePushLiveData } from "@/lib/bot/live-data";

import { BaobayError } from "@/services/baobay.service";
import { createWebHomestayBooking } from "@/services/homestay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KHÁCH ĐẶT PHÒNG trên mebayluon.com/homestay/dat-phong.
 *
 * Một đơn gom được NHIỀU hạng phòng (lines: [{roomTypeId, qty}]). Máy chủ tự
 * tính giá và tự kiểm phòng trống từng đêm cho từng dòng — trình duyệt chỉ gửi
 * lựa chọn. Đặt xong, mỗi dòng phòng thành một bản ghi chung mã trong sổ kế toán.
 */
export async function POST(req: Request) {
  // Booking đổi thì hẹn đẩy dữ liệu sống sang Doc tri thức của bot (chặn 2 phút/lần)
  after(schedulePushLiveData);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Thiếu nội dung đặt phòng" }, { status: 400 });

  try {
    const booking = await createWebHomestayBooking({
      lines: Array.isArray(body.lines)
        ? body.lines.map((l: { roomTypeId?: unknown; qty?: unknown }) => ({
            roomTypeId: String(l?.roomTypeId ?? ""),
            qty: Number(l?.qty ?? 0),
          }))
        : [],
      checkIn: String(body.checkIn ?? ""),
      checkOut: String(body.checkOut ?? ""),
      adults: Number(body.adults ?? 1),
      children: Number(body.children ?? 0),
      guestName: String(body.guestName ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      note: String(body.note ?? ""),
    });
    // Trả về vừa đủ cho màn hình cảm ơn — không dội lại cả bản ghi nội bộ
    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/homestay/book error:", err);
    return NextResponse.json({ message: "Không đặt được phòng — thử lại giúp mình" }, { status: 500 });
  }
}
