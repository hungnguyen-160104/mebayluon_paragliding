// app/api/baocao/homestay/route.ts
import { NextResponse } from "next/server";
import { after } from "next/server";

import { schedulePushLiveData } from "@/lib/bot/live-data";

import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  actHomestayBooking,
  createManualHomestayBooking,
  getHomestayOverview,
} from "@/services/homestay.service";
import { syncHomestayMail } from "@/services/homestay-mail.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Quét hộp thư lần đầu đọc cả tràng thư cũ — cho dư thời gian. */
export const maxDuration = 60;

/**
 * SỔ PHÒNG HOMESTAY của kế toán.
 *
 * GET   ?from=YYYY-MM-DD&nights=30 -> bảng sổ phòng + sổ đặt phòng + khay soát
 * POST  {...booking}               -> nhập tay một đặt phòng (khách gọi điện, đoàn B2B)
 * PATCH {action: "sync-mail"}      -> quét hộp mebayluon@gmail.com lấy thư đặt phòng mới
 * PATCH {action, id, ...}          -> gán phòng / huỷ / duyệt khay soát / ghi thu / sửa ghi chú / xoá
 */

const ROLES = {
  // Kế toán + người kiêm nhiệm quản homestay (Duyên, Trúc Ngọc, Minh Ngọc…) + quản trị
  roles: ["accountant", "homestay", "admin"] as ("accountant" | "homestay" | "admin")[],
  allowAdmin: true,
};

function fail(err: unknown, fallback: string) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error("homestay api error:", err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  try {
    const url = new URL(req.url);
    return NextResponse.json(
      await getHomestayOverview(url.searchParams.get("from") ?? undefined, Number(url.searchParams.get("nights") ?? 0)),
    );
  } catch (err) {
    return fail(err, "Không tải được sổ phòng");
  }
}

export async function POST(req: Request) {
  // Booking đổi thì hẹn đẩy dữ liệu sống sang Doc tri thức của bot (chặn 2 phút/lần)
  after(schedulePushLiveData);

  const auth = requireBaobay(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  try {
    const booking = await createManualHomestayBooking(auth, {
      source: String(body.source ?? "manual"),
      ref: String(body.ref ?? ""),
      guestName: String(body.guestName ?? ""),
      phone: String(body.phone ?? ""),
      lines: Array.isArray(body.lines)
        ? body.lines.map((l: { roomTypeId?: unknown; qty?: unknown }) => ({
            roomTypeId: String(l?.roomTypeId ?? ""),
            qty: Number(l?.qty ?? 0),
          }))
        : [],
      adults: Number(body.adults ?? 0),
      children: Number(body.children ?? 0),
      checkIn: String(body.checkIn ?? ""),
      checkOut: String(body.checkOut ?? ""),
      amount: Number(body.amount ?? 0),
      prepaid: Boolean(body.prepaid),
      note: String(body.note ?? ""),
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return fail(err, "Không lưu được đặt phòng");
  }
}

export async function PATCH(req: Request) {
  // Booking đổi thì hẹn đẩy dữ liệu sống sang Doc tri thức của bot (chặn 2 phút/lần)
  after(schedulePushLiveData);

  const auth = requireBaobay(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  try {
    if (action === "sync-mail") {
      return NextResponse.json({ sync: await syncHomestayMail() });
    }
    const ACTIONS = ["assign-room", "cancel", "restore", "confirm-review", "collect", "note", "rename", "quick-edit", "delete"] as const;
    if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
      return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
    }
    await actHomestayBooking(auth, String(body?.id ?? ""), action as (typeof ACTIONS)[number], {
      roomTypeId: body?.roomTypeId ? String(body.roomTypeId) : undefined,
      amount: body?.amount !== undefined ? Number(body.amount) : undefined,
      note: body?.note !== undefined ? String(body.note) : undefined,
      guestName: body?.guestName !== undefined ? String(body.guestName) : undefined,
      phone: body?.phone !== undefined ? String(body.phone) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Không xử lý được");
  }
}
