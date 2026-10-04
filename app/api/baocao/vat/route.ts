// app/api/baocao/vat/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import { countVatPending, dayRevenueShare, listVatDay, setVatIssued } from "@/services/pay-account.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * XUẤT VAT CUỐI NGÀY — TK CÔNG TY (chủ 04/10/2026).
 *
 * GET   ?spot=&date=          -> { rows }   booking có tiền về TK công ty trong ngày
 * GET   ?spot=&count=1&date=  -> { count, amount, share }   số booking chưa xuất VAT + phần doanh thu TK cty của ngày bay `date`
 * PATCH {id, on, invoiceNo}   -> tích / bỏ tích "đã xuất VAT"
 */
const ROLES = { roles: ["accountant", "tax", "admin"] as ("accountant" | "tax" | "admin")[], allowAdmin: true };

function fail(err: unknown, fallback: string) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error("vat error:", err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const q = new URL(req.url).searchParams;
  try {
    const date = q.get("date") || todayInVN();
    if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
    // share: "TK công ty x đ / y đ = z%" của NGÀY BAY `date` — chủ xem máy cân 30% doanh thu tới đâu
    const share = await dayRevenueShare(auth, spot, date);
    if (q.get("count") === "1") return NextResponse.json({ ...(await countVatPending(auth, spot)), share });
    return NextResponse.json({ rows: await listVatDay(auth, spot, date), share });
  } catch (err) {
    return fail(err, "Không tải được danh sách xuất VAT");
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;
  const body = await req.json().catch(() => ({}));
  try {
    const row = await setVatIssued(auth, spot, String(body?.id ?? ""), body?.on !== false, String(body?.invoiceNo ?? ""));
    return NextResponse.json({ row });
  } catch (err) {
    return fail(err, "Không lưu được dấu đã xuất VAT");
  }
}
