// app/api/baocao/money-order/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, createFinanceOrder, listOrdersCreatedBy } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["luong", "ung", "phi", "khac"]);

/**
 * Lệnh chuyển tiền do KẾ TOÁN / QUẢN TRỊ chủ động lập: chuyển lương, ứng, trả
 * phí, khoản khác. Nhân sự vào app bấm "Đã nhận tiền" là xong — loại ỨNG tự
 * cộng vào cột tiền ứng và trừ vào lương của người nhận.
 *
 * GET  -> các lệnh chính mình đã lập gần đây (theo dõi ai đã bấm nhận)
 * POST {targetUsername, category, amount, method, content, date?}
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  return NextResponse.json({ orders: await listOrdersCreatedBy(auth, spot) });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const category = String(body?.category ?? "");
  const date = String(body?.date ?? "") || todayInVN();

  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ message: "Loại lệnh không hợp lệ" }, { status: 400 });
  }
  if (!isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }

  try {
    const order = await createFinanceOrder(auth, spot, {
      targetUsername: String(body?.targetUsername ?? ""),
      category: category as never,
      date,
      amount: Number(body?.amount) || 0,
      method: body?.method === "transfer" ? "transfer" : "cash",
      content: String(body?.content ?? ""),
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/money-order error:", err);
    return NextResponse.json({ message: "Không lập được lệnh" }, { status: 500 });
  }
}
