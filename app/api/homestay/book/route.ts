// app/api/homestay/book/route.ts
import { NextResponse } from "next/server";
import { after } from "next/server";

import { schedulePushLiveData } from "@/lib/bot/live-data";
import { CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/baobay/homestay";
import { locationInfo, type HomestayLang } from "@/lib/homestay-data";
import { buildHomestayConfirmMail } from "@/lib/homestay-confirm-mail";
import { sendSmtpMail } from "@/lib/mailer";

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

    /**
     * THƯ XÁC NHẬN cho khách. Gửi SAU khi đã trả lời (`after`): SMTP mất vài
     * giây, để khách ngồi nhìn nút quay là họ bấm lại lần nữa và thành hai đơn.
     *
     * Gửi hỏng thì CHỈ ghi log, KHÔNG làm hỏng đơn: phòng đã giữ, mã đơn đã
     * hiện trên màn hình. Đổ đơn vì một cái hộp thư sai là đổi việc nhỏ lấy
     * việc lớn.
     */
    if (booking.email) {
      const lang = (["vi", "en", "fr", "ru", "zh", "hi"].includes(String(body.lang))
        ? String(body.lang)
        : "vi") as HomestayLang;
      after(async () => {
        try {
          const mail = buildHomestayConfirmMail({
            lang,
            ref: booking.ref,
            guestName: booking.guestName,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: booking.nights,
            adults: booking.adults,
            children: booking.children,
            lines: booking.lines,
            amount: booking.amount,
            checkInTime: CHECK_IN_TIME,
            checkOutTime: CHECK_OUT_TIME,
            address: locationInfo.address,
            phone: locationInfo.phone,
          });
          await sendSmtpMail({ to: booking.email, subject: mail.subject, html: mail.html, text: mail.text });
        } catch (e) {
          console.error("Gửi thư xác nhận đặt phòng hỏng:", e);
        }
      });
    }
    // Trả về vừa đủ cho màn hình cảm ơn — phần dựng thư giữ lại trên máy chủ
    return NextResponse.json(
      {
        ref: booking.ref,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        amount: booking.amount,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/homestay/book error:", err);
    return NextResponse.json({ message: "Không đặt được phòng — thử lại giúp mình" }, { status: 500 });
  }
}
