import { NextResponse } from "next/server";
import { getTopLocations } from "@/services/statistics.service";
import { parseDateRange } from "@/lib/stats-params";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseDateRange(searchParams);
    const limitParam = Number(searchParams.get("limit") || "5");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 10) : 5;
    const data = await getTopLocations(range, limit);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[API] /stats/top-locations", error);
    return NextResponse.json({ message: "Failed to load top locations" }, { status: 500 });
  }
}
