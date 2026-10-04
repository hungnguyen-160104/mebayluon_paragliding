// app/api/baocao/booking/pay-account/route.ts
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { logBooking } from "@/models/BaobayBookingLog.model";
import { isDateKey } from "@/lib/baobay/date";
import { BaobayError, assertSpotAllowed } from "@/services/baobay.service";
import { pickProvisional } from "@/services/pay-account-pick";
import { ensurePayAccount, payAccountByCode, setPayAccountManual } from "@/services/pay-account.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TÀI KHOẢN NHẬN TIỀN BAY của một booking (chủ 04/10/2026) — xem lib/baobay/pay-account.ts.
 *
 * POST  {id}                       -> chốt tài khoản nếu chưa chốt (lần đầu đưa mã QR) → { payAccount, booking }
 * POST  {draft: {flightDate, totalAmount, deposit, depositMethod, agencyPaidAmount, source, otaRef}, token?}
 *                                  -> form booking CHƯA LƯU bấm QR: máy chọn luôn → { payAccount, token }
 *                                     (lưu booking kèm `payPickToken` = token để giữ đúng lựa chọn)
 * PATCH {id, account, reason}      -> đổi tay TK công ty ↔ TK cá nhân (ghi lịch sử booking)
 */
function fail(err: unknown, fallback: string) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error("pay-account error:", err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

export async function POST(req: Request) {
  // Phi công / camera man cũng đưa QR thu tiền khách được giao — cho mở cửa này
  const auth = requireBaobay(req, {
    roles: ["dispatcher", "counter", "accountant", "admin", "pilot", "cameraman"],
    allowAdmin: true,
  });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  try {
    if (body?.draft && typeof body.draft === "object") {
      const d = body.draft as Record<string, unknown>;
      const flightDate = String(d.flightDate ?? "");
      if (!isDateKey(flightDate)) return NextResponse.json({ message: "Ngày bay không hợp lệ" }, { status: 400 });
      const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
      const p = await pickProvisional({
        spot: assertSpotAllowed(auth, spot),
        flightDate,
        source: String(d.source ?? ""),
        otaRef: String(d.otaRef ?? ""),
        totalAmount: num(d.totalAmount),
        deposit: num(d.deposit),
        depositMethod: d.depositMethod === "cash" || d.depositMethod === "transfer" ? d.depositMethod : "",
        agencyPaidAmount: num(d.agencyPaidAmount),
        token: String(body?.token ?? ""),
        byUsername: auth.username,
      });
      return NextResponse.json({ payAccount: p.account, token: p.token });
    }
    // {code}: hộp lệnh thu tự do — mã booking / SĐT khớp booking nào thì theo TK booking đó
    if (typeof body?.code === "string" && !body?.id) return NextResponse.json(await payAccountByCode(auth, spot, body.code));
    return NextResponse.json(await ensurePayAccount(auth, spot, String(body?.id ?? "")));
  } catch (err) {
    return fail(err, "Không chọn được tài khoản nhận tiền");
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;
  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const account = body?.account === "company" ? "company" : body?.account === "personal" ? "personal" : null;
  if (!account) return NextResponse.json({ message: "Thiếu tài khoản" }, { status: 400 });
  logBooking({
    bookingId: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined,
    spot,
    op: "api",
    action: "pay-account",
    byUsername: auth.username,
    byName: auth.name,
    update: `payAccount → ${account}${body?.reason ? ` — ${String(body.reason).slice(0, 200)}` : ""}`,
  });
  try {
    return NextResponse.json({ booking: await setPayAccountManual(auth, spot, id, account, String(body?.reason ?? "")) });
  } catch (err) {
    return fail(err, "Không đổi được tài khoản nhận tiền");
  }
}
