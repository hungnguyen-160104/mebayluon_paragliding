// app/api/baocao/so-sapa/route.ts
import { NextResponse } from "next/server";

import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, createSapaBookRow, listSapaBook, updateSapaBookCell } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * LƯỚI SỔ SA PA — bảng nhập liệu trong app, bố cục y sổ tay Google Sheets.
 *
 *   GET   ?month=2026-09          → cả tháng, xếp theo ngày rồi số thứ tự khách
 *   PATCH { id, field, value }    → sửa MỘT ô, trả về cả dòng đã tính lại
 *   POST  { flightDate }          → thêm một dòng trống cho ngày đó
 *
 * Mỗi ô một lượt gọi chứ không gom cả dòng: người ta gõ tới đâu lưu tới đó,
 * mất mạng giữa chừng thì chỉ hỏng đúng ô đang gõ — đúng cảm giác bảng tính.
 *
 * Vai trò: điều phối và quầy vé là người gõ sổ hằng ngày; kế toán và quản trị
 * vào sửa lại. Phi công / camera man KHÔNG vào — họ không nhập sổ.
 */
const ROLES = ["dispatcher", "counter", "accountant", "admin"] as const;

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const month = new URL(req.url).searchParams.get("month") ?? "";
  try {
    return NextResponse.json(await listSapaBook(auth, month));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/so-sapa error:", err);
    return NextResponse.json({ message: "Không tải được sổ Sa Pa" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.field) return NextResponse.json({ message: "Thiếu ô cần sửa" }, { status: 400 });

  try {
    return NextResponse.json(
      await updateSapaBookCell(auth, { id: String(body.id), field: String(body.field), value: body.value }),
    );
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("PATCH /api/baocao/so-sapa error:", err);
    return NextResponse.json({ message: "Không lưu được ô này" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (!body?.flightDate) return NextResponse.json({ message: "Thiếu ngày bay" }, { status: 400 });

  try {
    return NextResponse.json(await createSapaBookRow(auth, { flightDate: String(body.flightDate) }));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/so-sapa error:", err);
    return NextResponse.json({ message: "Không thêm được dòng" }, { status: 500 });
  }
}
