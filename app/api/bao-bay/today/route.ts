// app/api/bao-bay/today/route.ts
/**
 * Ai đã báo bay HÔM NAY (giờ Việt Nam) ở một điểm — cho dòng "Hôm nay đã có N
 * phi công báo bay" trên /baobay.
 *
 * CHỈ trả số người + tên viết gọn ("N.G. Ngọc"), không SĐT, CCCD, mã hội
 * viên, tiền hay ngày khác: ai mở trang cũng đọc được nên chỉ đưa đúng thứ
 * anh em trong giới cần để biết hôm nay bãi có ai.
 */
import { NextResponse } from "next/server";

import { baoBayRateLimit } from "@/lib/bao-bay-rate";
import { BaoBayError, listTodayPilots } from "@/services/bao-bay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = baoBayRateLimit(req, "today", 120, 10 * 60_000);
  if (limited) return limited;

  const spot = new URL(req.url).searchParams.get("spot");
  try {
    const { count, names } = await listTodayPilots(spot, new Date());
    return NextResponse.json({ ok: true, count, names }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof BaoBayError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.status });
    }
    console.error("[BaoBay] today list failed:", e);
    return NextResponse.json({ ok: false, code: "server" }, { status: 500 });
  }
}
