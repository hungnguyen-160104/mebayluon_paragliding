// app/api/baocao/cafe/route.ts
import { NextResponse } from "next/server";

import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  deleteCafeEntry,
  getCafeDay,
  getCafeMenu,
  setCafeProductActive,
  syncCafeEntries,
  upsertCafeProduct,
} from "@/services/cafe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QUẦY CAFE.
 *   GET  ?date=            bảng tổng ngày (hai quầy + từng quầy + phiếu gần nhất)
 *   POST {entries: [...]}  máy bán đẩy các phiếu đang xếp hàng lên (mất mạng
 *                          bán tiếp, có mạng đẩy bù — upsert theo clientId nên
 *                          gửi lại không đếm đôi)
 *   DELETE {clientId}      xoá phiếu ghi nhầm trong ngày
 *
 * Vai: cafe (nhân viên quầy) + accountant (xem tổng) + admin.
 */
const ROLES = ["cafe", "accountant", "admin"] as ("cafe" | "accountant" | "admin")[];

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  try {
    const date = new URL(req.url).searchParams.get("date") ?? undefined;
    /**
     * Trả MENU kèm bảng ngày trong CÙNG một lượt: máy bán cất cả hai vào máy để
     * lần sau mất mạng vẫn bày đủ nút. Hỏi thành hai lượt là có lúc cất được
     * cái này thiếu cái kia.
     */
    const [day, menu] = await Promise.all([getCafeDay(auth, date), getCafeMenu()]);
    return NextResponse.json({ ...day, menu });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("GET /api/baocao/cafe error:", err);
    return NextResponse.json({ message: "Không tải được bảng cafe" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json().catch(() => ({}));

    /** Thêm / sửa món ngay tại quầy — không phải deploy mới đổi được menu. */
    if (body?.action === "product") {
      return NextResponse.json({ menu: await upsertCafeProduct(auth, body.product ?? {}) });
    }
    /** Ẩn hoặc hiện lại một món. */
    if (body?.action === "product-active") {
      return NextResponse.json({
        menu: await setCafeProductActive(auth, String(body?.key ?? ""), body?.active !== false),
      });
    }

    const entries = Array.isArray(body?.entries) ? body.entries : [];
    return NextResponse.json(await syncCafeEntries(auth, entries));
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/cafe error:", err);
    return NextResponse.json({ message: "Không ghi được phiếu bán" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireBaobay(req, { roles: ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json().catch(() => ({}));
    await deleteCafeEntry(auth, String(body?.clientId ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("DELETE /api/baocao/cafe error:", err);
    return NextResponse.json({ message: "Không xoá được phiếu" }, { status: 500 });
  }
}
