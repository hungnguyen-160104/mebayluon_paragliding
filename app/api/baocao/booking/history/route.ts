// app/api/baocao/booking/history/route.ts
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { buildBookingHistory, type RawLog } from "@/lib/baobay/booking-history";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayBookingLog } from "@/models/BaobayBookingLog.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TRUY VẾT một booking — GET ?spot=&id= → { events }
 *
 * Ghép bản ghi booking (các cặp ai/lúc nào) với nhật ký bất biến
 * BaobayBookingLog thành một dòng thời gian (xem lib/baobay/booking-history.ts).
 * Chỉ đọc. Cùng vai trò với người được xem sổ booking; phi công không có nút này.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Thiếu id booking" }, { status: 400 });

  try {
    await connectDB();
    const booking = await BaobayBooking.findOne({ _id: id, spot }).lean();
    if (!booking) return NextResponse.json({ message: "Không thấy booking" }, { status: 404 });
    const logs = (await BaobayBookingLog.find({ bookingId: new mongoose.Types.ObjectId(id) })
      .sort({ at: 1 })
      .limit(500)
      .lean()) as unknown as RawLog[];
    return NextResponse.json({
      events: buildBookingHistory(booking as unknown as Record<string, unknown>, logs),
      /** Nhật ký bất biến chỉ có từ 02/09/2026 — booking cũ hơn chỉ kể được phần bản ghi giữ. */
      logCount: logs.length,
    });
  } catch (err) {
    console.error("GET /api/baocao/booking/history error:", err);
    return NextResponse.json({ message: "Không đọc được lịch sử booking" }, { status: 500 });
  }
}
