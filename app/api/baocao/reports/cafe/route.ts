// app/api/baocao/reports/cafe/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { wearsRole } from "@/lib/baobay/roles";
import { cafeReportSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, getDailyClose, listMyMoneyOrdersOfDate } from "@/services/baobay.service";
import {
  getCafeDay,
  getCafeReport,
  listCafeReportsOfDate,
  listPendingStockRequests,
  markStockRequestDone,
  upsertCafeReport,
} from "@/services/cafe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BÁO CÁO NGÀY CỦA QUẦY CAFE — cùng lối với báo cáo phi công / điều phối.
 *
 *   GET  ?date=          báo cáo của chính mình + số máy bán gợi ý + ngày đã chốt chưa
 *   GET  ?date=&all=1    mọi báo cáo quầy của ngày (kế toán)
 *   GET  ?stock=1        yêu cầu nhập hàng CÒN CHỜ, 45 ngày gần nhất
 *   POST {…}             lưu nháp / chốt báo cáo
 *   POST {action:"stock-done", reportId, rowId, done}   đánh dấu đã nhập hàng
 */
const ROLES = ["cafe", "accountant", "admin"] as ("cafe" | "accountant" | "admin")[];

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const date = params.get("date");

  try {
    if (params.get("stock") === "1") {
      return NextResponse.json({ pending: await listPendingStockRequests(spot) });
    }

    if (!date || !isDateKey(date)) {
      return NextResponse.json({ message: "Thiếu ngày hợp lệ (?date=YYYY-MM-DD)" }, { status: 400 });
    }

    if (params.get("all") === "1") {
      if (!wearsRole(auth, "accountant")) {
        return NextResponse.json({ message: "Chỉ kế toán xem được cả ngày" }, { status: 403 });
      }
      return NextResponse.json({ reports: await listCafeReportsOfDate(spot, date) });
    }

    /**
     * Kèm luôn số MÁY BÁN của ngày để trang tự điền hai ô tiền — bắt người trực
     * mở tab khác đọc số rồi gõ lại là chỗ sinh sai số.
     */
    const [report, day, close, handovers] = await Promise.all([
      getCafeReport(auth.id, spot, date),
      getCafeDay(auth, date),
      getDailyClose(spot, date),
      /** Lệnh nộp tiền / ứng tiền của CHÍNH NGƯỜI NÀY trong ngày. */
      listMyMoneyOrdersOfDate(auth, spot, date),
    ]);

    return NextResponse.json({
      spot,
      report,
      sales: day.counters,
      /** Cả bảng ngày: tổng theo người bán + mọi đơn của ngày để dựng bảng tổng hợp. */
      day,
      handovers,
      locked: close?.status === "closed",
      closedBy: close?.closedBy ?? "",
    });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/reports/cafe error:", err);
    return NextResponse.json({ message: "Không tải được báo cáo quầy cafe" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));

  try {
    if (body?.action === "stock-done") {
      await markStockRequestDone(
        auth,
        String(body?.reportId ?? ""),
        String(body?.rowId ?? ""),
        body?.done !== false,
      );
      return NextResponse.json({ pending: await listPendingStockRequests(spot) });
    }

    const parsed = cafeReportSchema.safeParse({ ...body, spot });
    if (!parsed.success) {
      return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
    }
    const { report, warnings } = await upsertCafeReport(auth, parsed.data);
    return NextResponse.json({ report, warnings });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/reports/cafe error:", err);
    return NextResponse.json({ message: "Không lưu được báo cáo quầy cafe" }, { status: 500 });
  }
}
