import { NextResponse } from "next/server";
import { getOverviewStats } from "@/services/statistics.service";
import { parseDateRange } from "@/lib/stats-params";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseDateRange(searchParams);
    const data = await getOverviewStats(range);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[API] /stats/overview", error);
    return NextResponse.json({ message: "Failed to load overview stats" }, { status: 500 });
  }
}
