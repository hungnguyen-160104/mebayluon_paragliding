// app/api/baocao/vat/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { wearsRole } from "@/lib/baobay/roles";
import { isSpotId } from "@/lib/baobay/spots";
import { requireBaobay, type BaobayAuth } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import { countVatPending, dayRevenueShare, listPayLedger, listVatDay, setVatIssued } from "@/services/pay-account.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * XUẤT VAT — TK CÔNG TY (chủ 04/10/2026).
 *
 * GET   ?spot=&date=          -> { rows, share }   booking có tiền về TK công ty trong ngày + phần doanh thu TK cty của ngày bay
 * GET   ?spot=&count=1&date=  -> { count, amount, share }   số booking chưa xuất VAT (trang kế toán)
 * GET   ?ledger=1&from=&to=&account=all|company|personal&vat=all|pending|issued
 *                              -> { rows, totals }   BẢNG LỌC tiền ngân hàng (kế toán thuế) — mọi điểm được xem
 * PATCH {id, on, invoiceNo, spot?} -> tích / bỏ tích "đã xuất VAT" (cùng chỗ lưu cho thẻ VAT và bảng lọc)
 */
const ROLES = { roles: ["accountant", "tax", "admin"] as ("accountant" | "tax" | "admin")[], allowAdmin: true };

function fail(err: unknown, fallback: string) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error("vat error:", err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

/** Kế toán thuế / quản trị nhìn cả công ty (như /baocao/thue) — không bắt chỉ định điểm. */
function seesAllSpots(auth: BaobayAuth): boolean {
  return Boolean(auth.viaAdmin) || auth.role === "admin" || wearsRole(auth, "tax");
}

function spotOf(req: Request, auth: BaobayAuth, bodySpot?: unknown): string | NextResponse {
  const raw = String(bodySpot ?? new URL(req.url).searchParams.get("spot") ?? "");
  if (seesAllSpots(auth) && isSpotId(raw)) return raw;
  return resolveSpot(req, auth);
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const q = new URL(req.url).searchParams;
  try {
    if (q.get("ledger") === "1") {
      const account = q.get("account") === "company" ? "company" : q.get("account") === "personal" ? "personal" : "all";
      const vat = q.get("vat") === "pending" ? "pending" : q.get("vat") === "issued" ? "issued" : "all";
      return NextResponse.json(
        await listPayLedger(auth, { from: q.get("from") || todayInVN(), to: q.get("to") || todayInVN(), account, vat }),
      );
    }
    const spot = spotOf(req, auth);
    if (spot instanceof NextResponse) return spot;
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
  const body = await req.json().catch(() => ({}));
  const spot = spotOf(req, auth, body?.spot);
  if (spot instanceof NextResponse) return spot;
  try {
    const row = await setVatIssued(auth, spot, String(body?.id ?? ""), body?.on !== false, String(body?.invoiceNo ?? ""));
    return NextResponse.json({ row });
  } catch (err) {
    return fail(err, "Không lưu được dấu đã xuất VAT");
  }
}
