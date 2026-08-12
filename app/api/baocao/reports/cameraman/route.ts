// app/api/baocao/reports/cameraman/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";

import { cameramanReportSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  getCameramanReport,
  getReconcileForUser,
  isDayClosed,
  listCameramanReportsOfAccount,
  upsertCameramanReport,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 30 giây — lưu xong còn đẩy sang Apps Script, xem lib/baobay/sheet.ts. */
export const maxDuration = 30;

/**
 * Camera man chỉ có một con số chính (số chuyến quay flycam) nhưng vẫn cần biết
 * ngày có bị treo vì lệch với điều phối hay không — nên GET cũng trả về phần
 * đối chiếu mang tên mình.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["cameraman"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date");

  if (date) {
    if (!isDateKey(date)) {
      return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
    }

    const [report, locked, check] = await Promise.all([
      getCameramanReport(auth.id, spot, date),
      isDayClosed(spot, date),
      getReconcileForUser(spot, date, auth.username),
    ]);

    return NextResponse.json({ spot, report, locked, check });
  }

  return NextResponse.json({ reports: await listCameramanReportsOfAccount(auth.id, spot) });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["cameraman"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = cameramanReportSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    const { report, warnings } = await upsertCameramanReport(auth, parsed.data);
    const check = await getReconcileForUser(spot, parsed.data.date, auth.username);
    return NextResponse.json({ report, warnings, check });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/reports/cameraman error:", err);
    return NextResponse.json({ message: "Không lưu được báo cáo" }, { status: 500 });
  }
}
