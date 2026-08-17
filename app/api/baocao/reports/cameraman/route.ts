// app/api/baocao/reports/cameraman/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { wearsRole } from "@/lib/baobay/roles";

import { cameramanReportSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  listCameramanReportsOfDate,
  listSpotStaffByRole,
  upsertCameramanReportByAccountant,
  getCameramanReport,
  getReconcileForUser,
  getDailyClose,
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
  const auth = requireBaobay(req, { roles: ["cameraman", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const date = params.get("date");

  // Kế toán: danh sách báo cáo cả ngày để sửa trực tiếp trên trang Chốt ngày
  /**
   * Rẽ nhánh theo YÊU CẦU (`all=1`) chứ không theo vai chính của người gọi:
   * người KIÊM NHIỆM vừa là kế toán vừa là nhân sự nhập liệu, hỏi cả ngày thì
   * trả cả ngày, hỏi báo cáo của mình thì trả báo cáo của mình.
   */
  if (params.get("all") === "1") {
    if (!wearsRole(auth, "accountant")) {
      return NextResponse.json({ message: "Chỉ kế toán xem được cả ngày" }, { status: 403 });
    }
    if (!date) {
      return NextResponse.json({ message: "Xem cả ngày phải kèm ?date=YYYY-MM-DD" }, { status: 400 });
    }
    const [reports, staff] = await Promise.all([
      listCameramanReportsOfDate(spot, date),
      listSpotStaffByRole(spot, "cameraman"),
    ]);
    return NextResponse.json({ reports, staff });
  }

  if (date) {
    if (!isDateKey(date)) {
      return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
    }

    const [report, close, check] = await Promise.all([
      getCameramanReport(auth.id, spot, date),
      getDailyClose(spot, date),
      getReconcileForUser(spot, date, auth.username),
    ]);

    return NextResponse.json({
      spot,
      report,
      locked: close?.status === "closed",
      closedBy: close?.closedBy ?? "",
      check,
    });
  }

  return NextResponse.json({ reports: await listCameramanReportsOfAccount(auth.id, spot) });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["cameraman", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = cameramanReportSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    // Có targetUsername = sửa hộ người khác (chỉ kế toán); không có = báo cáo của chính mình
    const targetUsername = String(body?.targetUsername ?? "").trim();
    if (targetUsername) {
      if (!wearsRole(auth, "accountant")) {
        return NextResponse.json({ message: "Chỉ kế toán mới sửa hộ được" }, { status: 403 });
      }
      const { report, warnings } = await upsertCameramanReportByAccountant(auth, targetUsername, parsed.data);
      return NextResponse.json({ report, warnings });
    }

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
