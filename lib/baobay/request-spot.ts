// lib/baobay/request-spot.ts
import { NextResponse } from "next/server";

import { isSpotId, normalizeSpot, spotName, type SpotId } from "@/lib/baobay/spots";
import type { BaobayAuth } from "@/middlewares/requireBaobay";

/**
 * Lấy điểm bay từ đường dẫn (?spot=…) và kiểm người gọi có được chỉ định điểm
 * đó không.
 *
 * Mỗi điểm bay là một hệ thống riêng, nên MỌI route đọc/ghi số liệu đều phải đi
 * qua đây — thiếu một chỗ là mở đường cho người của điểm này xem số điểm kia.
 * Không truyền ?spot thì lấy điểm đầu tiên trong danh sách được chỉ định (người
 * chỉ có một điểm không phải bận tâm tham số này).
 */
export function resolveSpot(req: Request, auth: BaobayAuth): SpotId | NextResponse {
  const raw = new URL(req.url).searchParams.get("spot");
  const allowed = (auth.spots ?? []).map(normalizeSpot);

  if (!raw) {
    if (!allowed.length) {
      return NextResponse.json({ message: "Tài khoản chưa được chỉ định điểm bay nào" }, { status: 403 });
    }
    return allowed[0];
  }

  if (!isSpotId(raw)) {
    return NextResponse.json({ message: "Điểm bay không hợp lệ" }, { status: 400 });
  }

  /** Token quản trị website đi qua mọi điểm — chủ site vốn xem được tất cả. */
  if (!auth.viaAdmin && !allowed.includes(raw)) {
    return NextResponse.json(
      { message: `Tài khoản không được chỉ định điểm bay ${spotName(raw)}` },
      { status: 403 },
    );
  }

  return raw;
}
