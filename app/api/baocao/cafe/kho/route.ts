// app/api/baocao/cafe/kho/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  addCafeStockEntry,
  deleteCafeStockEntry,
  getCafeStockCatalogue,
  getCafeStockReport,
  upsertCafeStockItem,
} from "@/services/cafe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KHO QUẦY CAFE — nhập vào, dùng ra, còn lại.
 *
 *   GET  ?from=&to=                bảng kiểm kê kỳ + danh mục kho + các lần nhập
 *   POST {action:"nhap", …}        ghi một lần nhập hàng
 *   POST {action:"mat-hang", …}    thêm / sửa mặt hàng kho (nguyên liệu mới…)
 *   DELETE {id}                    xoá một dòng nhập ghi nhầm
 *
 * Không nhận tham số điểm bay: quầy cafe chỉ có ở Khau Phạ (xem CAFE_SPOT).
 */
const ROLES = ["cafe", "accountant", "admin"] as ("cafe" | "accountant" | "admin")[];

/** Mặc định là THÁNG ĐANG XEM — câu hỏi của chủ vốn theo tháng ("tháng 9 nhập 30 thùng"). */
function monthRange(): { from: string; to: string } {
  const today = todayInVN();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** Khoảng ngày lấy từ yêu cầu, thiếu hoặc sai thì rơi về tháng đang xem. */
function rangeOf(from: unknown, to: unknown): { from: string; to: string } {
  const def = monthRange();
  return {
    from: isDateKey(String(from ?? "")) ? String(from) : def.from,
    to: isDateKey(String(to ?? "")) ? String(to) : def.to,
  };
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  try {
    const params = new URL(req.url).searchParams;
    const { from, to } = rangeOf(params.get("from"), params.get("to"));
    const [report, catalogue] = await Promise.all([getCafeStockReport(from, to), getCafeStockCatalogue()]);
    return NextResponse.json({ ...report, catalogue });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/cafe/kho error:", err);
    return NextResponse.json({ message: "Không tải được bảng kho" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json().catch(() => ({}));

    if (body?.action === "mat-hang") {
      return NextResponse.json({ catalogue: await upsertCafeStockItem(auth, body.item ?? {}) });
    }

    await addCafeStockEntry(auth, {
      date: String(body?.date ?? ""),
      stockKey: String(body?.stockKey ?? ""),
      packs: Number(body?.packs) || 0,
      looseUnits: Number(body?.looseUnits) || 0,
      cost: Number(body?.cost) || 0,
      note: String(body?.note ?? ""),
    });
    const { from, to } = rangeOf(body?.from, body?.to);
    return NextResponse.json(await getCafeStockReport(from, to));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/cafe/kho error:", err);
    return NextResponse.json({ message: "Không ghi được lần nhập hàng" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json().catch(() => ({}));
    await deleteCafeStockEntry(String(body?.id ?? ""));
    const { from, to } = rangeOf(body?.from, body?.to);
    return NextResponse.json(await getCafeStockReport(from, to));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("DELETE /api/baocao/cafe/kho error:", err);
    return NextResponse.json({ message: "Không xoá được dòng nhập" }, { status: 500 });
  }
}
