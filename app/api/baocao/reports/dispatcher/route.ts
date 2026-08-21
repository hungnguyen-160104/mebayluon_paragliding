// app/api/baocao/reports/dispatcher/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { expandTicketRanges } from "@/lib/baobay/ticket-code";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { wearsRole } from "@/lib/baobay/roles";

import { dispatcherReportSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  findDuplicateTicketCodes,
  BaobayError,
  listDispatcherReportsOfDate,
  listSpotStaffByRole,
  upsertDispatcherReportByAccountant,
  getDispatcherReport,
  getReconcileForUser,
  getDailyClose,
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
/**
 * DÒ MÃ VÉ TRÙNG — quầy vừa gõ dải mã là biết ngay có đụng seri của ngày khác
 * không, khỏi đợi lưu xong mới lòi ra.
 *
 * PUT { date, ranges: [{from,to}] } -> { duplicates: [{code, usedOn, where}] }
 */
export async function PUT(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const date = String(body?.date ?? "");
  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });

  const ranges = Array.isArray(body?.ranges) ? body.ranges : [];
  const { codes } = expandTicketRanges(
    ranges.map((r: any) => ({ from: String(r?.from ?? ""), to: String(r?.to ?? "") })),
  );
  if (!codes.length) return NextResponse.json({ duplicates: [] });

  try {
    return NextResponse.json({ duplicates: await findDuplicateTicketCodes(spot, date, codes) });
  } catch (err) {
    console.error("PUT /api/baocao/reports/dispatcher (dò mã trùng) error:", err);
    return NextResponse.json({ message: "Không dò được mã trùng" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant"] });
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
      listDispatcherReportsOfDate(spot, date),
      listSpotStaffByRole(spot, ["dispatcher", "counter"] as const),
    ]);
    return NextResponse.json({ reports, staff });
  }

  if (date) {
    if (!isDateKey(date)) {
      return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
    }

    const [report, close, check] = await Promise.all([
      getDispatcherReport(auth.id, spot, date),
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

  return NextResponse.json({ reports: await listDispatcherReportsOfAccount(auth.id, spot) });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = dispatcherReportSchema.safeParse({ ...body, spot });
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
      const { report, warnings } = await upsertDispatcherReportByAccountant(auth, targetUsername, parsed.data);
      return NextResponse.json({ report, warnings });
    }

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
