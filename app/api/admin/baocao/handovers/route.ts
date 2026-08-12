// app/api/admin/baocao/handovers/route.ts
import { NextResponse } from "next/server";

import { isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { SPOTS } from "@/lib/baobay/spots";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { confirmHandover, countPendingHandoversBySpot, listHandovers } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tiền nhân sự giao cho quản lý/giám đốc — mọi vai trò, không riêng điều phối.
 *
 * GET  ?from=&to=  -> mọi khoản trong khoảng ngày (mặc định 30 ngày), cả chờ lẫn đã xác nhận
 * POST {id}        -> giám đốc XÁC NHẬN đã cầm khoản đó, kèm {reject:"lý do"} để từ chối
 *
 * Chỉ vai trò Quản trị (hoặc token quản trị website). Xác nhận được cả khi ngày
 * đã chốt — đây là chữ ký nhận tiền, không phải sửa số liệu.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const today = todayInVN();
  const from = params.get("from") || shiftDateKey(today, -29);
  const to = params.get("to") || today;

  if (!isDateKey(from) || !isDateKey(to)) {
    return NextResponse.json({ message: "Khoảng ngày không hợp lệ" }, { status: 400 });
  }

  /**
   * Kèm số khoản chờ xác nhận của MỌI điểm bay admin quản — trang quản trị dùng
   * để chấm số đỏ lên nút từng điểm. Không giới hạn ngày: khoản treo từ tuần
   * trước vẫn phải nhắc.
   */
  const scope = auth.viaAdmin ? SPOTS.map((s) => s.id) : auth.spots;

  const [handovers, pendingBySpot] = await Promise.all([
    listHandovers(spot, from, to),
    countPendingHandoversBySpot(scope),
  ]);

  return NextResponse.json({ handovers, pendingBySpot });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const reject = String(body?.reject ?? "").trim();

  if (!id) return NextResponse.json({ message: "Thiếu mã khoản tiền" }, { status: 400 });

  const result = await confirmHandover(
    id,
    { username: auth.username, role: auth.role, viaAdmin: auth.viaAdmin },
    reject || undefined,
  );
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, handover: result.handover });
}
