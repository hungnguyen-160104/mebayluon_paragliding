// app/api/baobay/close/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";

import { dailyCloseSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  closeDay,
  getDailyClose,
  getReconcile,
  reopenDay,
  upsertDailyClose,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Số chốt ngày của kế toán, kèm kết quả đối chiếu.
 *
 * Chỉ vai trò kế toán (và token quản trị website) dùng được: đây là nơi khoá số
 * liệu của cả điểm bay, không phải chỗ cho phi công hay quầy vé.
 *
 * GET  ?date=  -> số chốt + số app cộng sẵn từ nhân viên + danh sách lỗi
 * POST         -> action: "save" (lưu nháp) | "close" (chốt) | "reopen" (mở lại)
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date");
  if (!date || !isDateKey(date)) {
    return NextResponse.json({ message: "Thiếu tham số date (YYYY-MM-DD)" }, { status: 400 });
  }

  const [close, reconcile] = await Promise.all([getDailyClose(spot, date), getReconcile(spot, date)]);
  return NextResponse.json({ spot, close, reconcile });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "save");

  try {
    if (action === "close") {
      const date = String(body?.date || "");
      if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });

      const result = await closeDay(auth, spot, date);
      return NextResponse.json(result);
    }

    if (action === "reopen") {
      const date = String(body?.date || "");
      if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });

      const close = await reopenDay(auth, spot, date, String(body?.reason || ""));
      return NextResponse.json({ close, reconcile: await getReconcile(spot, date) });
    }

    const parsed = dailyCloseSchema.safeParse({ ...body, spot });
    if (!parsed.success) {
      return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
    }

    const { report, warnings } = await upsertDailyClose(auth, parsed.data);
    // Lưu xong đối chiếu lại ngay: kế toán thấy liền còn vướng gì mới chốt được.
    const reconcile = await getReconcile(spot, parsed.data.date);
    return NextResponse.json({ close: report, warnings, reconcile });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baobay/close error:", err);
    return NextResponse.json({ message: "Không lưu được số chốt ngày" }, { status: 500 });
  }
}
