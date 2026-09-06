// app/api/baocao/merch/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, listMerchItems, upsertMerchItem } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DANH MỤC HÀNG BÁN THÊM tại quầy vé — áo, khăn, cốm, móc khoá…
 *
 *   GET                      danh sách hàng đang bán của điểm
 *   POST {name, price, unit} tạo mới hoặc sửa (trùng `key` là sửa)
 *   POST {key, active:false} ẩn một mặt hàng
 *
 * NGƯỜI TRỰC TỰ TẠO ĐƯỢC, không phải chờ quản trị: hàng lưu niệm đổi theo mùa
 * và theo lô nhập, bắt chờ thì hôm có hàng mới là không khai được. Sổ vẫn an
 * toàn vì báo cáo chép lại đơn giá tại thời điểm khai — sửa giá về sau không
 * làm sai doanh thu ngày cũ.
 */
/**
 * MỌI VAI ĐỨNG BÁN đều dùng được, kể cả tạo mặt hàng mới (luật chủ 06/09).
 * Kế toán và quản trị có mặt trong danh sách để XEM và sửa danh mục khi cần,
 * nhưng họ không có báo cáo ngày nên không khai số bán.
 */
const ROLES = ["dispatcher", "counter", "pilot", "cameraman", "cafe", "accountant", "admin"] as (
  | "dispatcher"
  | "counter"
  | "pilot"
  | "cameraman"
  | "cafe"
  | "accountant"
  | "admin"
)[];

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  try {
    return NextResponse.json({ items: await listMerchItems(spot) });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/merch error:", err);
    return NextResponse.json({ message: "Không tải được danh mục hàng" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  try {
    const body = await req.json().catch(() => ({}));
    const items = await upsertMerchItem(auth, spot, {
      key: String(body?.key ?? ""),
      name: String(body?.name ?? ""),
      price: Number(body?.price) || 0,
      unit: String(body?.unit ?? ""),
      active: body?.active !== false,
    });
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/merch error:", err);
    return NextResponse.json({ message: "Không lưu được mặt hàng" }, { status: 500 });
  }
}
