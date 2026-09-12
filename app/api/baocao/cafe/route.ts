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
/**
 * AI ĐỨNG QUẦY THÌ VÀO ĐƯỢC, không chỉ vai "cafe" (chủ báo 10/09).
 *
 * Ms Duyên là quầy vé nhưng bán cafe ngay trên bãi cất. Trước đây trang chốt
 * ca của quầy chỉ mở cho vai "cafe", nên tiền cafe của chị không có chỗ chốt:
 * không nộp được, không vào danh sách báo cáo cuối ngày, và số chị đang giữ
 * không ai nhìn thấy. Điều phối / quầy vé nay vào được — mỗi người vẫn chỉ
 * thấy và chốt phần của chính mình.
 */
const ROLES = ["cafe", "dispatcher", "counter", "accountant", "admin"] as (
  | "cafe"
  | "dispatcher"
  | "counter"
  | "accountant"
  | "admin"
)[];

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
    await deleteCafeEntry(auth, String(body?.clientId ?? ""), String(body?.reason ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("DELETE /api/baocao/cafe error:", err);
    return NextResponse.json({ message: "Không xoá được phiếu" }, { status: 500 });
  }
}
