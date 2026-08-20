// app/api/baocao/booking/service-changes/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { wearsRole } from "@/lib/baobay/roles";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, listServiceChanges, undoServiceChange } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SỔ THÊM / HUỶ DỊCH VỤ của một ngày bay.
 *
 * GET    ?date=  → danh sách để soát lại và bấm sửa
 * DELETE ?id=    → hoàn tác một thao tác (nút "Sửa" = hoàn tác rồi nhập lại)
 *
 * Cùng quyền với chính việc thêm/huỷ dịch vụ: điều phối, quầy vé, kế toán.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "cameraman"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });

  /**
   * CAMERA MAN thuần (không kiêm điều phối/quầy/kế toán) chỉ được xem các lần
   * thêm/bớt do CHÍNH MÌNH làm — sổ dịch vụ của người khác không phải việc
   * của họ, lộ ra là lộ luôn giá và tiền nong từng khách.
   */
  const managerial =
    auth.viaAdmin ||
    ["dispatcher", "counter", "accountant", "admin"].some((r) => wearsRole(auth, r as never));
  return NextResponse.json({
    items: await listServiceChanges(spot, date, managerial ? undefined : auth.username),
  });
}

export async function DELETE(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "cameraman"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ message: "Chưa chọn thao tác nào" }, { status: 400 });

  try {
    return NextResponse.json(await undoServiceChange(auth, spot, id));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("DELETE /api/baocao/booking/service-changes error:", err);
    return NextResponse.json({ message: "Không hoàn tác được" }, { status: 500 });
  }
}
