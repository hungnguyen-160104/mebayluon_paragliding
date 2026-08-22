// app/api/baocao/insurance/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  getBookingInsurance,
  recallInsurance,
  saveBookingInsurance,
  sendInsurance,
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
 * POST  { id, guests, approve } — lưu; `approve` = "đủ và đúng", CHƯA gửi đi
 * PATCH { id, action: "send" | "recall", reason } — gửi / thu hồi bảo hiểm tay
 * PUT   { id }     — đẩy lại sang bảng bảo hiểm (khi lần trước hỏng)
 *
 * Bảo hiểm rời đi ĐÚNG LÚC XUẤT VÉ (hoặc bấm "bay không vé"), việc đó máy tự
 * làm trong nghiệp vụ booking. Hai cửa ở đây dành cho trường hợp ngoại lệ:
 * quầy muốn gửi sớm vì chắc chắn bay, hoặc phải rút lại vì bấm nhầm.
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

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = String((body as { id?: string }).id || "");
  const action = String((body as { action?: string }).action || "");
  if (!id) return NextResponse.json({ message: "Thiếu mã booking" }, { status: 400 });
  if (action !== "send" && action !== "recall") {
    return NextResponse.json({ message: "Chỉ nhận send hoặc recall" }, { status: 400 });
  }

  const by = auth.name || auth.username;
  const reason = String((body as { reason?: string }).reason || "").trim();
  try {
    const res =
      action === "send"
        ? await sendInsurance(spot, id, reason || "gửi tay", by)
        : await recallInsurance(spot, id, reason || "thu hồi tay", by);
    /** Gửi không được (hồ sơ thiếu) là lỗi nghiệp vụ, phải nói rõ chứ không im. */
    if (!res.ok) return NextResponse.json({ message: res.error || "Không thực hiện được" }, { status: 400 });
    return NextResponse.json({ view: await getBookingInsurance(auth, spot, id) });
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
