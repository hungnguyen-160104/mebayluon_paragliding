// app/api/baocao/booking/add-services/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, addBookingServices, removeBookingServices } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KHÁCH ĐĂNG KÝ THÊM dịch vụ tại bãi — cộng vào booking sẵn có, tính lại tiền,
 * thu luôn nếu khách trả ngay.
 *
 * Chỉ ĐIỀU PHỐI / QUẦY VÉ / KẾ TOÁN: người đứng quầy mới chốt giá và thu tiền.
 */
export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Chưa chọn booking" }, { status: 400 });

  try {
    const res = await addBookingServices(auth, spot, id, {
      add: {
        flycam: Number(body?.add?.flycam) || 0,
        video360: Number(body?.add?.video360) || 0,
        redFlag: Number(body?.add?.redFlag) || 0,
        sunset: Number(body?.add?.sunset) || 0,
        flagFlight: Number(body?.add?.flagFlight) || 0,
      },
      discount: Number(body?.discount) || 0,
      note: String(body?.note ?? ""),
      pay: body?.pay
        ? {
            cash: Number(body.pay.cash) || 0,
            transfers: Array.isArray(body.pay.transfers)
              ? body.pay.transfers.map((t: any) => ({
                  amount: Math.max(0, Math.round(Number(t?.amount) || 0)),
                  code: String(t?.code ?? ""),
                }))
              : [],
          }
        : undefined,
    });
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/booking/add-services error:", err);
    return NextResponse.json({ message: "Không ghi được đăng ký thêm" }, { status: 500 });
  }
}

/**
 * HUỶ dịch vụ tuỳ chọn đã đăng ký — bớt số lượng, tính lại tiền, rồi trừ vào
 * phần còn phải thu hoặc hoàn lại cho khách.
 */
export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "accountant", "admin"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Chưa chọn booking" }, { status: 400 });

  try {
    const res = await removeBookingServices(auth, spot, id, {
      remove: {
        flycam: Number(body?.remove?.flycam) || 0,
        video360: Number(body?.remove?.video360) || 0,
        redFlag: Number(body?.remove?.redFlag) || 0,
        sunset: Number(body?.remove?.sunset) || 0,
        flagFlight: Number(body?.remove?.flagFlight) || 0,
      },
      mode: body?.mode === "refund" ? "refund" : "credit",
      refundMethod: body?.refundMethod === "cash" ? "cash" : "transfer",
      bankAccount: String(body?.bankAccount ?? ""),
      reason: String(body?.reason ?? ""),
    });
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("PATCH /api/baocao/booking/add-services error:", err);
    return NextResponse.json({ message: "Không huỷ được dịch vụ" }, { status: 500 });
  }
}
