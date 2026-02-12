import { NextResponse } from "next/server";
import { getBookingsTimeSeries } from "@/services/statistics.service";
import { parseDateRange, parseGroupBy } from "@/lib/stats-params";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupBy = parseGroupBy(searchParams.get("groupBy"), "day");
    const range = parseDateRange(searchParams);
    const data = await getBookingsTimeSeries(groupBy, range);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[API] /stats/bookings", error);
    return NextResponse.json({ message: "Failed to load booking stats" }, { status: 500 });
  }
}
