// app/api/baocao/agency/route.ts
import { NextResponse } from "next/server";

import { todayInVN } from "@/lib/baobay/date";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { listAgencyMonth } from "@/services/baobay-agency.service";
import { BaobayError } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bảng tổng hợp khách theo ĐẠI LÝ — chỉ kế toán (và quản trị).
 *
 *   GET ?month=YYYY-MM   booking cả tháng có đại lý/nguồn, kèm tình trạng
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const month = new URL(req.url).searchParams.get("month") || todayInVN().slice(0, 7);

  try {
    return NextResponse.json(await listAgencyMonth(auth, month));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/agency error:", err);
    return NextResponse.json({ message: "Không tải được bảng đại lý" }, { status: 500 });
  }
}
