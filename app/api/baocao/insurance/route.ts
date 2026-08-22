// app/api/baocao/insurance/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  getBookingInsurance,
  saveBookingInsurance,
  syncInsuranceToSheet,
} from "@/services/baobay-insurance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Apps Script ghi bảng bảo hiểm mất 3–14 giây; đừng để nền tảng cắt sớm hơn. */
export const maxDuration = 30;

/**
 * HỒ SƠ BẢO HIỂM của một booking.
 *
 * GET   ?id=       — danh sách người bay (đã điền sẵn từ web/OTA) + trạng thái
 * POST  { id, guests, approve } — lưu; `approve` là "đủ và đúng", đẩy sang bảng
 * PUT   { id }     — đẩy lại sang bảng bảo hiểm (khi lần trước hỏng)
 *
 * KHÔNG giới hạn vai: ai thấy booking thì người đó nhập được. Khách đứng ở bãi
 * gặp phi công trước khi gặp quầy — bắt đúng một vai mới được nhập thì dữ liệu
 * không bao giờ đủ trước giờ bay.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ message: "Thiếu mã booking" }, { status: 400 });

  try {
    return NextResponse.json({ view: await getBookingInsurance(auth, spot, id) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = String((body as { id?: string }).id || "");
  if (!id) return NextResponse.json({ message: "Thiếu mã booking" }, { status: 400 });

  try {
    const view = await saveBookingInsurance(
      auth,
      spot,
      id,
      Array.isArray((body as { guests?: unknown }).guests) ? ((body as any).guests as []) : [],
      { approve: Boolean((body as { approve?: boolean }).approve) },
    );
    return NextResponse.json({ view });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = String((body as { id?: string }).id || "");
  if (!id) return NextResponse.json({ message: "Thiếu mã booking" }, { status: 400 });

  const res = await syncInsuranceToSheet(spot, id);
  if (!res.ok) return NextResponse.json({ message: res.error || "Đẩy sang bảng không thành công" }, { status: 502 });
  return NextResponse.json({ ok: true, view: await getBookingInsurance(auth, spot, id) });
}

function fail(err: unknown) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error("[insurance]", err);
  return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
}
