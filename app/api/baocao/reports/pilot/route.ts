// app/api/baocao/reports/pilot/route.ts
import { NextResponse } from "next/server";

import { isDateKey, isPastSubmitDeadline, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { PILOT_VIEW_LIMIT_DAYS } from "@/lib/baobay/validation";

import { firstZodMessage, pilotReportSchema } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  getDailyClose,
  getPilotReport,
  getReconcileForUser,
  getSubmitDeadline,
  listPilotReportsOfAccount,
  listPilotReportsOfDate,
  listSpotStaffByRole,
  upsertPilotReport,
  upsertPilotReportByAccountant,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 30 giây: lưu báo cáo còn phải đẩy sang Apps Script, mà bảng tính có lúc ngốn
 * hơn 20 giây (xem lib/baobay/sheet.ts). Mặc định của Vercel ngắn hơn thế nên
 * hàm bị cắt giữa lúc chờ, trả lỗi cho người nhập dù MongoDB đã ghi xong.
 */
export const maxDuration = 30;

/**
 * GET (phi công)
 *   ?date=YYYY-MM-DD -> báo cáo của chính mình ngày đó + trạng thái khoá + lỗi
 *                       đối chiếu mang tên mình + giờ chốt hiện hành
 *   (không tham số)   -> 30 báo cáo gần nhất của chính mình
 *
 * GET (kế toán)
 *   ?date=...&all=1   -> báo cáo của MỌI phi công trong ngày, để sửa trực tiếp
 *
 * POST: phi công lưu/chốt báo cáo của mình; KẾ TOÁN sửa hộ bằng cách gửi kèm
 * `targetUsername` — đi cùng một đường lưu (cùng kiểm tra, cùng khoá ngày).
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["pilot", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const date = params.get("date");

  if (date && !isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }

  /** Phi công chỉ tự tra 45 ngày gần nhất — phần cũ hơn do kế toán/quản trị giữ. */
  if (auth.role === "pilot" && date && date < shiftDateKey(todayInVN(), -PILOT_VIEW_LIMIT_DAYS)) {
    return NextResponse.json(
      { message: `Dữ liệu quá ${PILOT_VIEW_LIMIT_DAYS} ngày đã khoá tra cứu — cần xem thì nhờ kế toán.` },
      { status: 403 },
    );
  }

  // Kế toán: danh sách báo cáo cả ngày để sửa trực tiếp
  if (auth.role === "accountant") {
    if (!date || params.get("all") !== "1") {
      return NextResponse.json({ message: "Kế toán dùng ?date=YYYY-MM-DD&all=1" }, { status: 400 });
    }
    const [reports, close, staff] = await Promise.all([
      listPilotReportsOfDate(spot, date),
      getDailyClose(spot, date),
      // Toàn bộ phi công của điểm — kế toán thêm người CHƯA báo cáo rồi nhập hộ
      listSpotStaffByRole(spot, "pilot"),
    ]);
    return NextResponse.json({ spot, reports, staff, locked: close?.status === "closed" });
  }

  if (date) {
    const [report, close, check, deadline] = await Promise.all([
      getPilotReport(auth.id, spot, date),
      getDailyClose(spot, date),
      getReconcileForUser(spot, date, auth.username),
      getSubmitDeadline(spot),
    ]);

    return NextResponse.json({
      spot,
      report,
      locked: close?.status === "closed",
      closedAt: close?.closedAt ?? null,
      closedBy: close?.closedBy ?? "",
      check,
      /** Giờ chốt hiện hành + đã quá mốc chưa — tính ở máy chủ, khỏi tin đồng hồ điện thoại. */
      submitDeadline: deadline,
      pastDeadline: isPastSubmitDeadline(date, deadline),
    });
  }

  return NextResponse.json({ reports: await listPilotReportsOfAccount(auth.id, spot) });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["pilot", "accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = pilotReportSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    if (auth.role === "accountant") {
      const targetUsername = String(body?.targetUsername ?? "").trim();
      if (!targetUsername) {
        return NextResponse.json({ message: "Kế toán sửa hộ phải gửi kèm targetUsername" }, { status: 400 });
      }
      const { report, warnings } = await upsertPilotReportByAccountant(auth, targetUsername, parsed.data);
      return NextResponse.json({ report, warnings });
    }

    const { report, warnings } = await upsertPilotReport(auth, parsed.data);
    // Đối chiếu lại ngay sau khi lưu để phi công thấy mã của mình có vấn đề gì.
    const check = await getReconcileForUser(spot, parsed.data.date, auth.username);
    return NextResponse.json({ report, warnings, check });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/reports/pilot error:", err);
    return NextResponse.json({ message: "Không lưu được báo cáo" }, { status: 500 });
  }
}
