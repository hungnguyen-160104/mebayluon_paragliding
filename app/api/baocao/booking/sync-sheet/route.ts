// app/api/baocao/booking/sync-sheet/route.ts
import { NextResponse } from "next/server";

import { isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { sapaSheetWriteEnabled } from "@/lib/baobay/sapa-sheet";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, syncSapaSheet } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Mỗi tab tháng là một lượt gọi Apps Script, mỗi lượt tới 25 giây (Google đánh
 * thức chậm), rồi còn ghi Mongo. Cho rộng hẳn — nút này người bấm và người đó
 * ngồi đợi kết quả, thà chờ lâu còn hơn nửa chừng bị cắt.
 */
export const maxDuration = 120;

/**
 * NÚT "LẤY / ĐẨY" DỮ LIỆU VỚI SỔ TAY GOOGLE SHEETS CỦA SA PA.
 *
 *   GET  ?spot=sapa                → cho biết chiều đẩy đang mở hay đang khoá
 *   POST ?spot=sapa  { direction: "pull" | "push", from?, to? }
 *
 * Mặc định quét từ 7 ngày trước tới 30 ngày tới: đủ ôm mấy hôm vừa bay (kế
 * toán còn sửa tiền) và toàn bộ booking sắp tới, mà không đánh thức cả năm
 * lịch sử.
 *
 * "Lấy từ bảng" ai trực cũng bấm được. "Đẩy lên bảng" GHI ĐÈ lên sổ của nhân
 * viên Sa Pa nên chỉ kế toán/quản trị, và còn phải mở khoá `SAPA_SHEET_WRITE`
 * — chưa mở thì cửa vẫn trả lời tử tế chứ không ghi gì.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  return NextResponse.json({ spot, canWrite: sapaSheetWriteEnabled() });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  if (spot !== "sapa") {
    return NextResponse.json({ message: "Chỉ điểm Sa Pa có sổ tay bảng tính này" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const direction = body?.direction === "push" ? "push" : "pull";

  /**
   * Đẩy lên bảng là GHI ĐÈ vào sổ của nhân viên Sa Pa nên siết vai trò, và
   * phải xét cả vai KIÊM NHIỆM (`extraRoles`) lẫn token quản trị website
   * (`viaAdmin`) — đúng cách requireBaobay tự xét ở trên.
   */
  const wearing = [auth.role, ...(auth.extraRoles ?? [])];
  if (direction === "push" && !auth.viaAdmin && !wearing.some((r) => r === "accountant" || r === "admin")) {
    return NextResponse.json({ message: "Chỉ kế toán hoặc quản trị được đẩy dữ liệu lên bảng tính" }, { status: 403 });
  }

  const today = todayInVN();
  const from = typeof body?.from === "string" && isDateKey(body.from) ? body.from : shiftDateKey(today, -7);
  const to = typeof body?.to === "string" && isDateKey(body.to) ? body.to : shiftDateKey(today, 30);

  try {
    const result = await syncSapaSheet({ direction, from, to, by: auth.name || auth.username });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/booking/sync-sheet error:", err);
    return NextResponse.json({ message: "Không trao đổi được dữ liệu với bảng tính" }, { status: 500 });
  }
}
