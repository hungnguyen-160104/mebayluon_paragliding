// app/api/baocao/booking/route.ts
import { NextResponse } from "next/server";

import { isDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { bookingSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  assignBooking,
  acceptAssignedBooking,
  markNoTicketFlight,
  noteBookingContact,
  collectForBooking,
  payCommission,
  restoreBooking,
  splitBooking,
  toggleBookingTicket,
  listSpotStaffAll,
  createBooking,
  voidBooking,
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
 * PATCH {id, action: "flown"|"cancel"|"move"|"assign"|"collect", toDate?, assignee?, amount?, method?, transferCode?}
 *          -> đã bay / huỷ / dời / giao cho nhân sự / thu tiền
 * PUT    {id, ...các trường như POST}                    -> sửa thông tin booking
 * DELETE {id}                                            -> xoá booking nhập nhầm
 */
const ROLES = ["dispatcher", "counter", "accountant", "admin"] as const;

export async function GET(req: Request) {
  // Mọi vai trò xem được, nhưng phi công/camera man CHỈ thấy booking đã giao cho mình
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") || todayInVN();
  if (!isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }
  /**
   * `as=crew`: TRANG PHI CÔNG / CAMERA MAN tự khai mình đang xem với tư cách tổ
   * bay, dù tài khoản có vai gì.
   *
   * Trước đây chỉ xét vai trò, nên tài khoản quản trị kiêm phi công mở trang phi
   * công lại thấy TOÀN BỘ sổ khách kèm giá — đúng thứ trang đó phải giấu. Quyền
   * xem thuộc về TRANG đang mở, không phải chức danh của người mở.
   */
  const asCrew = new URL(req.url).searchParams.get("as") === "crew";
  const manager = !asCrew && (auth.viaAdmin || (ROLES as readonly string[]).includes(auth.role));
  const [lists, staff] = await Promise.all([
    listBookings(spot, date, manager ? undefined : auth.username),
    /**
     * "Nhân sự tiếp nhận" khi chuyển booking: quản lý thấy cả điểm; phi công /
     * camera man cũng cần danh sách này để chuyển khách cho nhau tại bãi.
     */
    listSpotStaffAll(spot),
  ]);
  return NextResponse.json({ ...lists, staff });
}

export async function POST(req: Request) {
  // Phi công cũng tạo booking được — đường "xác nhận dời" đẩy khách sang ngày mới
  const auth = requireBaobay(req, { roles: [...ROLES, "pilot"] });
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
    /**
     * "Xoá" giờ là BỎ KHỎI SỔ có lý do — bản ghi ở lại để lần vết. Trùng thì
     * phải chỉ đích danh booking giữ lại, máy chuyển tiền sang đó.
     */
    const res = await voidBooking(auth, spot, id, {
      kind: body?.kind === "duplicate" ? "duplicate" : "mistake",
      reason: String(body?.reason ?? ""),
      keepId: String(body?.keepId ?? ""),
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("DELETE /api/baocao/booking error:", err);
    return NextResponse.json({ message: "Không xoá được booking" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  /**
   * PHI CÔNG / CAMERA MAN vào được cửa này, nhưng CHỈ hai việc với khách được
   * giao cho mình: bấm xác nhận nhận khách, và thu tiền. Quyền "khách này có
   * phải của mình không" do tầng dịch vụ chốt, ở đây chỉ chặn loại việc.
   */
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "flown");
  const crewAllowed =
    action === "accept" || action === "collect" || action === "assign" || action === "commission" || action === "contact";
  const auth = requireBaobay(req, {
    roles: crewAllowed ? [...ROLES, "pilot", "cameraman"] : [...ROLES],
  });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const id = String(body?.id ?? "");
  const toDate = String(body?.toDate ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id booking" }, { status: 400 });
  if (!["flown", "cancel", "move", "assign", "collect", "ticket", "accept", "commission", "restore", "split", "contact", "noticket"].includes(action)) {
    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  }
  if (action === "move" && !isDateKey(toDate)) {
    return NextResponse.json({ message: "Ngày dời không hợp lệ" }, { status: 400 });
  }

  try {
    if (action === "assign") {
      const assignee = String(body?.assignee ?? "");
      if (!assignee) return NextResponse.json({ message: "Chưa chọn nhân sự tiếp nhận" }, { status: 400 });
      return NextResponse.json({ booking: await assignBooking(auth, spot, id, assignee) });
    }
    // HOÀN TÁC: bấm nhầm "đã bay" / "huỷ" thì trả về chờ bay
    if (action === "restore") {
      return NextResponse.json({ booking: await restoreBooking(auth, spot, id) });
    }
    // TÁCH NHÓM: đoàn 10 khách chỉ bay 6, còn 4 huỷ hoặc dời sang ngày khác
    if (action === "split") {
      const res = await splitBooking(auth, spot, id, {
        mode: body?.mode === "move" ? "move" : "cancel",
        guests: Number(body?.guests) || 0,
        toDate,
        ticketIssued: Boolean(body?.ticketIssued),
        ticketCodesText: String(body?.ticketCodesText ?? ""),
        refund: Number(body?.refund) || 0,
        refundMethod: body?.refundMethod === "cash" ? "cash" : "transfer",
        usedServices: String(body?.usedServices ?? ""),
        usedFee: Number(body?.usedFee) || 0,
        bankAccount: String(body?.bankAccount ?? ""),
      });
      return NextResponse.json(res);
    }
    // CHI CHIẾT KHẤU cho đại lý dẫn đoàn — trả ngoài, không lên phiếu khách
    if (action === "commission") {
      const booking = await payCommission(auth, spot, id, {
        amount: Math.max(0, Math.round(Number(body?.amount) || 0)),
        method: body?.method === "transfer" ? "transfer" : "cash",
        transferCode: String(body?.transferCode ?? ""),
        note: String(body?.note ?? ""),
      });
      return NextResponse.json({ booking });
    }
    // Bay KHÔNG VÉ — chuyến có thật nhưng không xé vé, phải ghi lý do
    if (action === "noticket") {
      return NextResponse.json({
        booking: await markNoTicketFlight(auth, spot, id, {
          on: body?.on !== false,
          reason: String(body?.reason ?? ""),
        }),
      });
    }
    // Ghi chú gọi khách + đánh dấu đã liên hệ
    if (action === "contact") {
      return NextResponse.json({
        booking: await noteBookingContact(auth, spot, id, {
          contactNote: body?.contactNote !== undefined ? String(body.contactNote) : undefined,
          contacted: typeof body?.contacted === "boolean" ? body.contacted : undefined,
        }),
      });
    }
    // Phi công/camera man xác nhận đã nhận khách được giao
    if (action === "accept") {
      return NextResponse.json({ booking: await acceptAssignedBooking(auth, spot, id) });
    }
    // Tích/bỏ tích ĐÃ XUẤT VÉ — khách đến lấy vé rồi hay chưa
    if (action === "ticket") {
      return NextResponse.json({ booking: await toggleBookingTicket(auth, spot, id) });
    }
    // THU TIỀN cho booking: CK về TK công ty · TM vào tiền giữ hộ của người bấm
    if (action === "collect") {
      /** Khách trả một phần TM + một phần CK: gửi cả hai số, máy tách hai lệnh thu. */
      const hasSplit = body?.cash !== undefined || body?.transfer !== undefined || Array.isArray(body?.transfers);
      const res = await collectForBooking(auth, spot, id, {
        ...(hasSplit
          ? {
              cash: Math.max(0, Math.round(Number(body?.cash) || 0)),
              transfer: Math.max(0, Math.round(Number(body?.transfer) || 0)),
              // Chia nhiều bill CK: mỗi bill một mã giao dịch riêng
              transfers: Array.isArray(body?.transfers)
                ? body.transfers.map((t: any) => ({
                    amount: Math.max(0, Math.round(Number(t?.amount) || 0)),
                    code: String(t?.code ?? ""),
                  }))
                : undefined,
            }
          : {
              amount: Math.max(0, Math.round(Number(body?.amount) || 0)),
              method: body?.method === "transfer" ? "transfer" : "cash",
            }),
        transferCode: String(body?.transferCode ?? ""),
        kind: body?.kind === "full" ? "full" : "deposit",
      });
      return NextResponse.json(res);
    }
    const booking = await updateBookingStatus(
      auth,
      spot,
      id,
      action as BookingAction,
      toDate || undefined,
      action === "cancel"
        ? {
            ticketIssued: body?.ticketIssued === true,
            ticketCodesText: String(body?.ticketCodesText ?? ""),
            refund: Math.max(0, Math.round(Number(body?.refund) || 0)),
            refundMethod: body?.refundMethod === "cash" ? "cash" : "transfer",
            usedServices: String(body?.usedServices ?? ""),
            usedFee: Math.max(0, Math.round(Number(body?.usedFee) || 0)),
            bankAccount: String(body?.bankAccount ?? ""),
            note: String(body?.note ?? ""),
          }
        : undefined,
    );
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("PATCH /api/baocao/booking error:", err);
    return NextResponse.json({ message: "Không cập nhật được booking" }, { status: 500 });
  }
}
