// app/api/baocao/reports/dispatcher/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";

import { dispatcherReportSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  getDispatcherReport,
  getReconcileForUser,
  isDayClosed,
  listDispatcherReportsOfAccount,
  upsertDispatcherReport,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 30 giây — lưu xong còn đẩy sang Apps Script, xem lib/baobay/sheet.ts. */
export const maxDuration = 30;

/**
 * GET  ?date=YYYY-MM-DD  -> báo cáo của chính mình ngày đó, kèm trạng thái khoá
 *                           và các lỗi đối chiếu mang tên mình
 * GET  (không tham số)    -> 30 báo cáo gần nhất của chính mình
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date");

  if (date) {
    if (!isDateKey(date)) {
      return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
    }

    const [report, locked, check] = await Promise.all([
      getDispatcherReport(auth.id, spot, date),
      isDayClosed(spot, date),
      getReconcileForUser(spot, date, auth.username),
    ]);

    return NextResponse.json({ spot, report, locked, check });
  }

  return NextResponse.json({ reports: await listDispatcherReportsOfAccount(auth.id, spot) });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = dispatcherReportSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    const { report, warnings } = await upsertDispatcherReport(auth, parsed.data);
    const check = await getReconcileForUser(spot, parsed.data.date, auth.username);
    return NextResponse.json({ report, warnings, check });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/reports/dispatcher error:", err);
    return NextResponse.json({ message: "Không lưu được báo cáo" }, { status: 500 });
  }
}
