// app/api/admin/baocao/shifts/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getShiftBoard, saveShiftBoard, sendShiftEmails } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 60 giây — gửi email cho cả chục phi công, mỗi thư mất một hai giây. */
export const maxDuration = 60;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Lịch bay theo tháng — bảng dàn ngang: hàng là phi công, cột là ngày.
 *
 * GET  ?month=YYYY-MM        -> bảng lịch + danh sách phi công đang làm ở điểm đó
 * PUT  {month, rows, needed} -> lưu cả bảng (tăng số bản, để email ghi "cập nhật lần N")
 * POST {month, usernames?}   -> gửi email lịch cho phi công (bỏ trống = gửi tất cả)
 *
 * Cả quản trị cấp 1 lẫn cấp 2 đều xếp được lịch: đây là việc điều hành hằng
 * ngày, không phải cấu hình hệ thống.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin", "accountant"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const month = new URL(req.url).searchParams.get("month") || "";
  if (!MONTH.test(month)) {
    return NextResponse.json({ message: "Tháng không hợp lệ (cần dạng 2026-08)" }, { status: 400 });
  }

  return NextResponse.json(await getShiftBoard(spot, month));
}

export async function PUT(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const month = String(body?.month ?? "");
  if (!MONTH.test(month)) {
    return NextResponse.json({ message: "Tháng không hợp lệ" }, { status: 400 });
  }

  const rows = Array.isArray(body?.rows)
    ? body.rows.map((r: any) => ({
        username: String(r?.username ?? ""),
        days: Array.isArray(r?.days) ? r.days.map(Number).filter(Number.isFinite) : [],
      }))
    : [];

  const board = await saveShiftBoard(
    spot,
    month,
    { rows, neededPerDay: body?.neededPerDay !== undefined ? Number(body.neededPerDay) : undefined },
    auth.username,
  );

  return NextResponse.json(board);
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const month = String(body?.month ?? "");
  if (!MONTH.test(month)) {
    return NextResponse.json({ message: "Tháng không hợp lệ" }, { status: 400 });
  }

  const only = Array.isArray(body?.usernames) ? body.usernames.map(String) : undefined;

  try {
    const report = await sendShiftEmails(spot, month, only);
    return NextResponse.json(report);
  } catch (err) {
    console.error("POST /api/admin/baocao/shifts error:", err);
    return NextResponse.json(
      { message: "Không gửi được email — kiểm EMAIL_USER / EMAIL_PASS trên máy chủ" },
      { status: 500 },
    );
  }
}
