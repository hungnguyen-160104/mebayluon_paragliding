// app/api/baocao/resync/route.ts
import { NextResponse } from "next/server";

import { shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { firstZodMessage, summaryQuerySchema } from "@/lib/baobay/validation";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { resyncSheets } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Đẩy lại sang Google Sheets những bản ghi chưa sang được.
 *
 * Apps Script có lúc chậm quá ngưỡng chờ hoặc Google trả lỗi — bản ghi vẫn nằm
 * an toàn trong MongoDB nhưng bảng tính thiếu dòng. Nút này quét khoảng ngày và
 * đẩy lại từng bản, để cuối kỳ không dòng nào rơi rớt.
 *
 * Mỗi dòng tốn một lượt gọi Apps Script (vài giây), nên cho tối đa 5 phút.
 */
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const today = todayInVN();

  const parsed = summaryQuerySchema.safeParse({
    spot,
    from: body?.from || shiftDateKey(today, -29),
    to: body?.to || today,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  const result = await resyncSheets(spot, parsed.data.from, parsed.data.to);
  return NextResponse.json(result);
}
