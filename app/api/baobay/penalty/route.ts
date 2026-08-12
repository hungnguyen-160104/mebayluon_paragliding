// app/api/baobay/penalty/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, getLatePenaltyStatus, waiveLatePenalty } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 30 giây — huỷ phạt xong còn đẩy lại dòng phi công sang Apps Script. */
export const maxDuration = 30;

/**
 * Phạt nộp muộn của một ngày.
 *
 * GET  ?date=                        -> danh sách đã ghi phạt + danh sách TẠM TÍNH
 * POST {date, username, waive, reason} -> kế toán huỷ / khôi phục lệnh phạt
 *
 * Chỉ kế toán (và quản trị). Huỷ phạt được cả khi ngày đã chốt: đây là quyết
 * định về lương, không phải sửa số liệu của ngày.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") || "";
  if (!isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }

  return NextResponse.json(await getLatePenaltyStatus(spot, date));
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const date = String(body?.date ?? "");
  const username = String(body?.username ?? "");
  const waive = body?.waive !== false;
  const reason = String(body?.reason ?? "");

  if (!isDateKey(date) || !username) {
    return NextResponse.json({ message: "Thiếu ngày hoặc tài khoản phi công" }, { status: 400 });
  }
  if (waive && !reason.trim()) {
    return NextResponse.json({ message: "Ghi lý do huỷ phạt để sau còn biết vì sao" }, { status: 400 });
  }

  try {
    const result = await waiveLatePenalty(auth, spot, date, username, waive, reason);
    if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

    return NextResponse.json({ ok: true, report: result.report });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baobay/penalty error:", err);
    return NextResponse.json({ message: "Không đổi được lệnh phạt" }, { status: 500 });
  }
}
