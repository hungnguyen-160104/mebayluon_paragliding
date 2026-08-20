// services/homestay.service.ts
/**
 * QUẢN PHÒNG HOMESTAY: bảng phòng trống theo ngày cho kế toán, sổ đặt phòng
 * (ba cửa: thư OTA, khách đặt web, nhập tay) và kiểm tra phòng trống cho
 * trang đặt phòng công khai.
 *
 * Cách tính phòng trống nằm CẢ ở lib/baobay/homestay.ts (hàm thuần) — trang
 * khách và trang kế toán cùng nhìn một con số, không mỗi nơi một kiểu.
 */

import mongoose from "mongoose";

import { isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import {
  COMBO_COMPONENTS,
  HOMESTAY_ROOMS,
  homestayPrice,
  homestayRoom,
  isComboRoom,
  nightsBetween,
  unitsFree,
  type OccupancyBooking,
} from "@/lib/baobay/homestay";
import type { BaobaySession } from "@/lib/baobay/token";
import { connectDB } from "@/lib/mongodb";
import { HomestayBooking, HomestaySyncState } from "@/models/HomestayBooking.model";
import { BaobayError } from "@/services/baobay.service";

/* ================================================================== */
/* DTO                                                                 */
/* ================================================================== */

export type HomestayBookingDTO = {
  id: string;
  source: string;
  ref: string;
  guestName: string;
  phone: string;
  email: string;
  country: string;
  roomTypeId: string;
  roomLabel: string;
  rooms: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
  netAmount: number;
  prepaid: boolean;
  collect: number;
  collected: number;
  status: string;
  reviewReason?: string;
  raw?: string;
  note: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt: string;
};

export type HomestayBoard = {
  /** Các ngày của bảng (14 đêm từ mốc xem). */
  dates: string[];
  rooms: Array<{
    id: string;
    units: number;
    /** free[i] = còn trống bao nhiêu đơn vị đêm dates[i]. */
    free: number[];
  }>;
};

function toDTO(d: any): HomestayBookingDTO {
  return {
    id: String(d._id),
    source: d.source,
    ref: d.ref ?? "",
    guestName: d.guestName ?? "",
    phone: d.phone ?? "",
    email: d.email ?? "",
    country: d.country ?? "",
    roomTypeId: d.roomTypeId ?? "",
    roomLabel: d.roomLabel ?? "",
    rooms: d.rooms ?? 1,
    adults: d.adults ?? 0,
    children: d.children ?? 0,
    checkIn: d.checkIn ?? "",
    checkOut: d.checkOut ?? "",
    nights: nightsBetween(d.checkIn ?? "", d.checkOut ?? ""),
    amount: d.amount ?? 0,
    netAmount: d.netAmount ?? 0,
    prepaid: Boolean(d.prepaid),
    collect: d.collect ?? 0,
    collected: d.collected ?? 0,
    status: d.status,
    reviewReason: d.reviewReason,
    raw: d.raw,
    note: d.note ?? "",
    cancelledBy: d.cancelledBy || undefined,
    cancelReason: d.cancelReason || undefined,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
  };
}

/**
 * Booking CHẠM khoảng đêm [from, to): checkIn < to và checkOut > from.
 * Lấy CẢ booking đã huỷ: bảng sổ phòng hiện chúng mờ đi kèm gạch đỏ để còn
 * dấu vết (không xoá hẳn), còn tồn phòng thì không bị ảnh hưởng — unitsTaken/
 * unitsFree chỉ đếm booking "confirmed".
 */
async function bookingsTouching(from: string, to: string): Promise<any[]> {
  return HomestayBooking.find({
    status: { $in: ["confirmed", "cancelled"] },
    checkIn: { $lt: to },
    checkOut: { $gt: from },
  }).lean<any[]>();
}

/* ================================================================== */
/* Bảng cho kế toán                                                    */
/* ================================================================== */

export type HomestayOverview = {
  board: HomestayBoard;
  /** Booking CHẠM khung ngày của bảng — để vẽ ô tên khách theo từng phòng. */
  boardBookings: HomestayBookingDTO[];
  /** Booking chạm khung bảng + booking sắp tới, mới nhất lên đầu. */
  bookings: HomestayBookingDTO[];
  /** Khay cần soát — thư máy không bóc trọn. */
  review: HomestayBookingDTO[];
  /** Lần quét hộp thư gần nhất (ISO) — để biết còn phải bấm không. */
  mailSyncAt: string;
};

/** Khung bảng mặc định MỘT THÁNG — 14 đêm ngắn quá, soát lịch không đủ tầm nhìn. */
const BOARD_NIGHTS_DEFAULT = 30;
const BOARD_NIGHTS_MAX = 180;

export async function getHomestayOverview(fromRaw?: string, nightsRaw?: number): Promise<HomestayOverview> {
  await connectDB();
  const from = isDateKey(fromRaw ?? "") ? String(fromRaw) : todayInVN();
  const nights = Math.min(BOARD_NIGHTS_MAX, Math.max(7, Math.round(Number(nightsRaw) || BOARD_NIGHTS_DEFAULT)));
  const dates = Array.from({ length: nights }, (_, i) => shiftDateKey(from, i));
  const to = shiftDateKey(from, nights);

  const [touching, upcoming, review, sync] = await Promise.all([
    bookingsTouching(from, to),
    HomestayBooking.find({ status: "confirmed", checkOut: { $gte: todayInVN() } })
      .sort({ checkIn: 1 })
      .limit(200)
      .lean<any[]>(),
    HomestayBooking.find({ status: "review" }).sort({ createdAt: -1 }).limit(50).lean<any[]>(),
    HomestaySyncState.findOne({ key: "homestay-mail-sync" }).lean<any>(),
  ]);

  const occ: OccupancyBooking[] = touching.map((b) => ({
    roomTypeId: b.roomTypeId,
    rooms: b.rooms ?? 1,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
  }));

  return {
    board: {
      dates,
      rooms: HOMESTAY_ROOMS.map((r) => ({
        id: r.id,
        units: r.units,
        free: dates.map((d) => unitsFree(occ, r.id, d)),
      })),
    },
    boardBookings: touching.map(toDTO),
    bookings: upcoming.map(toDTO),
    review: review.map(toDTO),
    mailSyncAt: sync?.lastRunAt ? new Date(sync.lastRunAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Phòng trống cho trang khách                                         */
/* ================================================================== */

export type HomestayAvailability = {
  from: string;
  to: string;
  rooms: Array<{ id: string; units: number; free: number[] }>;
  dates: string[];
};

/** Trang khách hỏi cả tháng một lần — giới hạn 62 đêm cho khỏi ai kéo quá đà. */
export async function getHomestayAvailability(fromRaw: string, toRaw: string): Promise<HomestayAvailability> {
  await connectDB();
  const from = isDateKey(fromRaw) ? fromRaw : todayInVN();
  let to = isDateKey(toRaw) ? toRaw : shiftDateKey(from, 31);
  if (to <= from) to = shiftDateKey(from, 31);
  if (nightsBetween(from, to) > 62) to = shiftDateKey(from, 62);

  const touching = await bookingsTouching(from, to);
  const occ: OccupancyBooking[] = touching.map((b) => ({
    roomTypeId: b.roomTypeId,
    rooms: b.rooms ?? 1,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
  }));
  const dates: string[] = [];
  for (let d = from; d < to; d = shiftDateKey(d, 1)) dates.push(d);

  return {
    from,
    to,
    dates,
    rooms: HOMESTAY_ROOMS.map((r) => ({
      id: r.id,
      units: r.units,
      free: dates.map((d) => unitsFree(occ, r.id, d)),
    })),
  };
}

/* ================================================================== */
/* Khách đặt trên web                                                  */
/* ================================================================== */

export type WebHomestayBookingInput = {
  /** Giỏ phòng: mỗi hạng một dòng kèm SỐ LƯỢNG — khách gom nhiều phòng một đơn. */
  lines: Array<{ roomTypeId: string; qty: number }>;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  phone: string;
  email: string;
  note: string;
};

export type WebHomestayBookingResult = {
  ref: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
};

/**
 * Khách đặt trên /homestay/dat-phong — một đơn GOM ĐƯỢC NHIỀU HẠNG PHÒNG,
 * mỗi hạng một số lượng. Máy chủ TỰ TÍNH giá và TỰ KIỂM phòng trống từng đêm
 * cho TỪNG dòng — không tin con số trình duyệt gửi lên.
 *
 * Mỗi dòng phòng ghi thành MỘT bản ghi trong sổ (chung một mã WEB…): bảng
 * phòng của kế toán trừ tồn theo từng hạng, gộp một bản ghi là trừ sai.
 */
export async function createWebHomestayBooking(
  input: WebHomestayBookingInput,
): Promise<WebHomestayBookingResult> {
  await connectDB();

  if (!isDateKey(input.checkIn) || !isDateKey(input.checkOut)) throw new BaobayError("Ngày ở không hợp lệ", 400);
  if (input.checkIn < todayInVN()) throw new BaobayError("Ngày nhận phòng đã qua", 400);
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new BaobayError("Phải ở ít nhất một đêm", 400);
  if (nights > 30) throw new BaobayError("Ở dài ngày (30+ đêm) xin liên hệ trực tiếp", 400);

  /** Gom trùng hạng phòng và bỏ dòng số lượng 0 trước khi kiểm. */
  const qtyByRoom = new Map<string, number>();
  for (const line of input.lines ?? []) {
    const qty = Math.round(Number(line?.qty) || 0);
    if (qty <= 0) continue;
    qtyByRoom.set(String(line.roomTypeId), (qtyByRoom.get(String(line.roomTypeId)) ?? 0) + qty);
  }
  if (qtyByRoom.size === 0) throw new BaobayError("Chưa chọn phòng nào", 400);
  for (const [id, qty] of qtyByRoom) {
    const room = homestayRoom(id);
    if (!room || !room.webBookable) throw new BaobayError("Hạng phòng không hợp lệ", 400);
    if (qty > room.units) throw new BaobayError(`Hạng phòng chỉ có ${room.units} phòng`, 400);
  }
  /**
   * GÓI nguyên sàn đã BAO các phòng thành phần: giỏ chứa gói thì không được
   * kèm phòng lẻ nằm trong gói (kẻo tính tiền trùng), hai gói chồng nhau
   * cũng không — trình duyệt đã chặn nhưng máy chủ vẫn phải tự giữ luật.
   */
  const cartIds = [...qtyByRoom.keys()];
  for (const id of cartIds) {
    if (!isComboRoom(id)) continue;
    const comps = COMBO_COMPONENTS[id];
    const clash = cartIds.find(
      (o) =>
        o !== id &&
        (comps.includes(o) || (isComboRoom(o) && COMBO_COMPONENTS[o].some((c) => comps.includes(c)))),
    );
    if (clash) throw new BaobayError("Gói nguyên sàn đã bao gồm phòng chọn kèm — bỏ bớt một trong hai", 400);
  }

  const guestName = String(input.guestName ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  if (!guestName) throw new BaobayError("Chưa ghi tên người đặt", 400);
  if (phone.replace(/\D/g, "").length < 8) throw new BaobayError("Số điện thoại chưa đúng", 400);

  /**
   * SỐ KHÁCH KHÔNG VƯỢT SỨC CHỨA phòng đã lấy: mỗi phòng có mức tối đa,
   * trình duyệt đã trần sẵn nhưng máy chủ vẫn tự giữ luật — gọi thẳng API
   * cũng không khai 10 người vào một phòng đôi được.
   */
  let capAdults = 0;
  let capChildren = 0;
  for (const [id, qty] of qtyByRoom) {
    const room = homestayRoom(id)!;
    capAdults += room.maxAdults * qty;
    capChildren += room.maxChildren * qty;
  }
  const wantAdults = Math.max(1, Math.round(Number(input.adults) || 1));
  const wantChildren = Math.max(0, Math.round(Number(input.children) || 0));
  if (wantAdults > capAdults) {
    throw new BaobayError(`Phòng đã chọn chứa tối đa ${capAdults} người lớn — thêm phòng hoặc bớt khách giúp mình`, 400);
  }
  if (wantChildren > capChildren) {
    throw new BaobayError(
      capChildren > 0
        ? `Phòng đã chọn nhận tối đa ${capChildren} trẻ em đi kèm`
        : "Hạng phòng này không nhận thêm trẻ em đi kèm — chọn phòng gia đình hoặc gói nguyên sàn",
      400,
    );
  }

  // Kiểm TỪNG DÒNG TỪNG ĐÊM — thiếu phòng đêm nào là báo rõ đêm đó
  const touching = await bookingsTouching(input.checkIn, input.checkOut);
  const occ: OccupancyBooking[] = touching.map((b) => ({
    roomTypeId: b.roomTypeId,
    rooms: b.rooms ?? 1,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
  }));
  for (const [id, qty] of qtyByRoom) {
    for (let d = input.checkIn; d < input.checkOut; d = shiftDateKey(d, 1)) {
      if (unitsFree(occ, id, d) < qty) {
        throw new BaobayError(
          `Đêm ${d.split("-").reverse().slice(0, 2).join("/")} không còn đủ phòng — chọn ngày khác giúp mình nhé`,
          409,
        );
      }
    }
  }

  const ref = `WEB${Date.now().toString(36).toUpperCase()}`;
  const adults = Math.max(1, Math.round(Number(input.adults) || 1));
  const children = Math.max(0, Math.round(Number(input.children) || 0));
  const note = String(input.note ?? "").trim().slice(0, 500);

  let total = 0;
  let first = true;
  for (const [id, qty] of qtyByRoom) {
    const amount = homestayPrice(id, nights, qty);
    total += amount;
    await HomestayBooking.create({
      source: "web",
      ref,
      guestName,
      phone,
      email: String(input.email ?? "").trim(),
      roomTypeId: id,
      roomLabel: id,
      rooms: qty,
      // Số khách ghi vào DÒNG ĐẦU cho khỏi đếm trùng; các dòng sau cùng mã đơn
      adults: first ? adults : 0,
      children: first ? children : 0,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      amount,
      netAmount: amount,
      prepaid: false,
      collect: amount,
      note: first ? note : `cùng đơn ${ref}`,
      status: "confirmed",
    });
    first = false;
  }

  return { ref, checkIn: input.checkIn, checkOut: input.checkOut, nights, amount: total };
}

/* ================================================================== */
/* Kế toán sửa sổ                                                      */
/* ================================================================== */

export type ManualHomestayBookingInput = {
  source: string;
  ref: string;
  guestName: string;
  phone: string;
  /** Nhập tay cũng gom được NHIỀU hạng phòng một đơn — mỗi hạng một số lượng. */
  lines: Array<{ roomTypeId: string; qty: number }>;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  /** TỔNG TIỀN cả đơn — kế toán gõ tay (giá thoả thuận, giá đoàn…). */
  amount: number;
  prepaid: boolean;
  note: string;
};

/**
 * Kế toán nhập tay (điện thoại, B2B, sự kiện). Nhiều hạng phòng thì mỗi hạng
 * một bản ghi CHUNG MÃ ĐƠN — bảng sổ phòng trừ tồn theo từng hạng. Tổng tiền
 * kế toán gõ được CHIA THEO GIÁ NIÊM YẾT của từng dòng (dòng cuối nhận phần
 * lẻ) để mỗi bản ghi vẫn mang con số đọc được; số lệch do thoả thuận nằm hết
 * ở cách chia, tổng thì luôn đúng số đã gõ.
 */
export async function createManualHomestayBooking(
  session: BaobaySession,
  input: ManualHomestayBookingInput,
): Promise<HomestayBookingDTO> {
  await connectDB();
  if (!isDateKey(input.checkIn) || !isDateKey(input.checkOut) || input.checkOut <= input.checkIn) {
    throw new BaobayError("Ngày ở không hợp lệ", 400);
  }
  if (!String(input.guestName ?? "").trim()) throw new BaobayError("Chưa ghi tên khách", 400);

  const qtyByRoom = new Map<string, number>();
  for (const line of input.lines ?? []) {
    const qty = Math.round(Number(line?.qty) || 0);
    if (qty <= 0) continue;
    qtyByRoom.set(String(line.roomTypeId), (qtyByRoom.get(String(line.roomTypeId)) ?? 0) + qty);
  }
  if (qtyByRoom.size === 0) throw new BaobayError("Chưa chọn hạng phòng nào", 400);
  for (const [id, qty] of qtyByRoom) {
    const room = homestayRoom(id);
    if (!room) throw new BaobayError("Hạng phòng không hợp lệ", 400);
    if (qty > room.units) throw new BaobayError(`${room.id} chỉ có ${room.units} phòng/chỗ`, 400);
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const total = Math.max(0, Math.round(Number(input.amount) || 0));
  const prepaid = Boolean(input.prepaid);
  // Nhiều dòng thì phải có mã chung để nhìn là biết cùng một đoàn
  const ref =
    String(input.ref ?? "").trim() ||
    (qtyByRoom.size > 1 ? `TAY${Date.now().toString(36).toUpperCase()}` : "");

  /** Chia tổng tiền theo tỷ trọng giá niêm yết; dòng cuối nhận phần lẻ. */
  const list = [...qtyByRoom].map(([id, qty]) => ({ id, qty, listPrice: homestayPrice(id, nights, qty) }));
  const listTotal = list.reduce((t, l) => t + l.listPrice, 0);
  let allocated = 0;
  const amounts = list.map((l, i) => {
    if (i === list.length - 1) return total - allocated;
    const part = listTotal > 0 ? Math.round((total * l.listPrice) / listTotal) : Math.round(total / list.length);
    allocated += part;
    return part;
  });

  let firstDoc: any = null;
  for (let i = 0; i < list.length; i++) {
    const { id, qty } = list[i];
    const doc = await HomestayBooking.create({
      source: String(input.source || "manual"),
      ref,
      guestName: String(input.guestName).trim(),
      phone: String(input.phone ?? "").trim(),
      roomTypeId: id,
      roomLabel: id,
      rooms: qty,
      adults: i === 0 ? Math.max(0, Math.round(Number(input.adults) || 0)) : 0,
      children: i === 0 ? Math.max(0, Math.round(Number(input.children) || 0)) : 0,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      amount: amounts[i],
      netAmount: amounts[i],
      prepaid,
      collect: prepaid ? 0 : amounts[i],
      note: i === 0 ? String(input.note ?? "").trim() : `cùng đơn ${ref}`,
      status: "confirmed",
      createdByUsername: session.username,
      createdByName: session.name,
    });
    if (!firstDoc) firstDoc = doc;
  }
  return toDTO(firstDoc.toObject());
}

/** Các việc kế toán làm trên một booking: gán phòng, huỷ, duyệt khay soát, ghi thu. */
export async function actHomestayBooking(
  session: BaobaySession,
  id: string,
  action: "assign-room" | "cancel" | "restore" | "confirm-review" | "collect" | "note" | "rename" | "quick-edit" | "delete",
  payload: { roomTypeId?: string; amount?: number; note?: string; guestName?: string; phone?: string },
): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Booking không hợp lệ", 400);
  const doc = await HomestayBooking.findById(id);
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);

  if (action === "assign-room") {
    const room = homestayRoom(String(payload.roomTypeId ?? ""));
    if (!room) throw new BaobayError("Hạng phòng không hợp lệ", 400);
    doc.roomTypeId = room.id;
  } else if (action === "cancel") {
    doc.status = "cancelled";
    doc.cancelledAt = new Date();
    doc.cancelledBy = session.name;
    // Lý do huỷ đi kèm — ô sổ phòng gạch đỏ nhưng chữ vẫn đọc được vì sao
    if (payload.note !== undefined) doc.cancelReason = String(payload.note).trim();
  } else if (action === "restore") {
    doc.status = "confirmed";
    doc.cancelledAt = undefined;
    doc.cancelledBy = undefined;
  } else if (action === "confirm-review") {
    // Duyệt thư trong khay soát: phải đủ ngày ở và hạng phòng mới lên lịch được
    if (!isDateKey(doc.checkIn) || !isDateKey(doc.checkOut)) {
      throw new BaobayError("Booking chưa có ngày nhận/trả phòng — sửa xong mới duyệt được", 400);
    }
    if (payload.roomTypeId) {
      const room = homestayRoom(String(payload.roomTypeId));
      if (!room) throw new BaobayError("Hạng phòng không hợp lệ", 400);
      doc.roomTypeId = room.id;
    }
    if (!doc.roomTypeId) throw new BaobayError("Chưa gán hạng phòng cho booking này", 400);
    doc.status = "confirmed";
    doc.reviewReason = undefined;
  } else if (action === "collect") {
    const amount = Math.max(0, Math.round(Number(payload.amount) || 0));
    if (amount <= 0) throw new BaobayError("Chưa nhập số tiền thu", 400);
    doc.collected = (doc.collected ?? 0) + amount;
    doc.collect = Math.max(0, (doc.collect ?? 0) - amount);
  } else if (action === "note") {
    doc.note = String(payload.note ?? "").trim();
  } else if (action === "rename") {
    /** Sửa tên trên Ô SỔ PHÒNG — chỉ cho bản ghi nhập tay; tên trên thư OTA là dữ liệu gốc. */
    if (doc.source !== "manual" && doc.source !== "b2b") {
      throw new BaobayError("Chỉ sửa được ghi chú nhập tay — booking OTA/web sửa ở sổ đặt phòng", 400);
    }
    const name = String(payload.guestName ?? "").trim();
    if (!name) throw new BaobayError("Tên không được để trống — muốn xoá thì dùng nút xoá", 400);
    doc.guestName = name;
  } else if (action === "quick-edit") {
    /**
     * SỬA Ô GHI NHANH trên sổ phòng: tên khách + SĐT + CÒN THU — nhắc nhân
     * viên phòng khi khách đến là thu tiền luôn. Chỉ cho bản ghi nhập tay;
     * booking OTA/web sửa ở sổ đặt phòng.
     */
    if (doc.source !== "manual" && doc.source !== "b2b") {
      throw new BaobayError("Chỉ sửa được ô ghi tay — booking OTA/web sửa ở sổ đặt phòng", 400);
    }
    const name = String(payload.guestName ?? "").trim();
    if (name) doc.guestName = name;
    if (payload.phone !== undefined) doc.phone = String(payload.phone).trim();
    if (payload.amount !== undefined) {
      const v = Math.max(0, Math.round(Number(payload.amount) || 0));
      doc.amount = v;
      doc.netAmount = v;
      doc.collect = Math.max(0, v - (doc.collected ?? 0));
      doc.prepaid = v <= 0;
    }
  } else if (action === "delete") {
    // Chỉ cho xoá bản ghi khay soát / nhập nhầm — booking từ thư giữ lại làm vết
    if (doc.status !== "review" && doc.source !== "manual" && doc.source !== "b2b") {
      throw new BaobayError("Chỉ xoá được bản ghi cần soát hoặc nhập tay — còn lại dùng Huỷ", 400);
    }
    await doc.deleteOne();
    return;
  }

  await doc.save();
}
