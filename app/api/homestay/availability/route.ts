// app/api/homestay/availability/route.ts
import { NextResponse } from "next/server";

import { getHomestayAvailability } from "@/services/homestay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PHÒNG TRỐNG cho trang đặt phòng công khai /homestay/dat-phong.
 *
 * GET ?from=YYYY-MM-DD&to=YYYY-MM-DD -> { dates, rooms: [{id, units, free[]}] }
 *
 * Chỉ trả SỐ LƯỢNG trống theo đêm — không lộ tên khách hay nguồn đặt nào.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const res = await getHomestayAvailability(url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "");
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/homestay/availability error:", err);
    return NextResponse.json({ message: "Không tải được lịch phòng" }, { status: 500 });
  }
}
