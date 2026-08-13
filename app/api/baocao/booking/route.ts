// app/api/baocao/booking/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { bookingSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  createBooking,
  deleteBooking,
  listBookings,
  updateBookingInfo,
  updateBookingStatus,
  type BookingAction,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BOOKING đặt trước — khách chốt hôm nay, bay ngày khác.
 *
 * Điều phối nhập ngay hôm khách đặt (thời điểm nhập tự ghi); booking hiện lên
 * đầu trang điều phối vào đúng NGÀY BAY; bay xong bấm "Hoàn thành" để ẩn.
 *
 * GET   ?date=  -> { forDate, upcoming }
 * POST  {flightDate, source, contactName, bookingCode, guestCount, dịch vụ, pickup, expectedTime, deposit, note}
 * PATCH {id, action: "flown"|"cancel"|"move", toDate?} -> đã bay / huỷ / dời lịch
 * PUT    {id, ...các trường như POST}                    -> sửa thông tin booking
 * DELETE {id}                                            -> xoá booking nhập nhầm
 */
const ROLES = ["dispatcher", "accountant", "admin"] as const;

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") || todayInVN();
  if (!isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }
  return NextResponse.json(await listBookings(spot, date));
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = bookingSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    const booking = await createBooking(auth, parsed.data);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/booking error:", err);
    return NextResponse.json({ message: "Không lưu được booking" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id booking" }, { status: 400 });

  const parsed = bookingSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    const booking = await updateBookingInfo(auth, spot, id, parsed.data);
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("PUT /api/baocao/booking error:", err);
    return NextResponse.json({ message: "Không sửa được booking" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id booking" }, { status: 400 });

  try {
    await deleteBooking(auth, spot, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("DELETE /api/baocao/booking error:", err);
    return NextResponse.json({ message: "Không xoá được booking" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const action = String(body?.action ?? "flown");
  const toDate = String(body?.toDate ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id booking" }, { status: 400 });
  if (!["flown", "cancel", "move"].includes(action)) {
    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  }
  if (action === "move" && !isDateKey(toDate)) {
    return NextResponse.json({ message: "Ngày dời không hợp lệ" }, { status: 400 });
  }

  try {
    const booking = await updateBookingStatus(auth, spot, id, action as BookingAction, toDate || undefined);
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("PATCH /api/baocao/booking error:", err);
    return NextResponse.json({ message: "Không cập nhật được booking" }, { status: 500 });
  }
}
