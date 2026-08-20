import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking.model";
import { shouldShowQueueNo } from "@/lib/booking/queue-display";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SỐ THỨ TỰ BAY của một đơn — trang cảm ơn hỏi cửa này để báo với khách
 * "số thứ tự của bạn là 3".
 *
 * Số do sổ điều hành (/baocao) cấp khi đơn được đồng bộ sang sổ, thường vài
 * giây sau khi khách bấm gửi. Vì vậy lần hỏi đầu rất hay chưa có số — khi đó
 * trả `queueNo: null` (KHÔNG phải lỗi) để trang khách hỏi lại sau vài giây.
 *
 * Chỉ trả đúng con số và ngày bay: id đơn tuy khó đoán (24 ký tự hex) nhưng
 * vẫn nằm trong tay khách, nên không kèm tên, số điện thoại hay tiền nong.
 */
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Thiếu mã đơn" }, { status: 400 });
    }

    await connectDB();
    const doc = await Booking.findById(id).select("queueNo queueDate status location dateISO").lean<any>();
    if (!doc) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy đơn" }, { status: 404 });
    }

    // Số chỉ HIỆN với Khau Phạ trong mùa đông khách (xem lib/booking/queue-display).
    // hidden=true để trang cảm ơn thôi hỏi lại ngay thay vì đợi hết 30 giây.
    const hidden = !shouldShowQueueNo(String(doc.location ?? ""), String(doc.queueDate || doc.dateISO || ""));

    return NextResponse.json(
      {
        ok: true,
        queueNo:
          !hidden && typeof doc.queueNo === "number" && doc.queueNo > 0 ? doc.queueNo : null,
        queueDate: doc.queueDate || null,
        hidden,
        cancelled: doc.status === "cancelled",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[booking/queue]", err);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
