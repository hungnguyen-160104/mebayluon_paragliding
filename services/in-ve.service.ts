// services/in-ve.service.ts
/**
 * HÀNG ĐỢI IN VÉ + TRẠM IN — xem models/BaobayPrintJob.model.ts vì sao có.
 *
 * Luật thời gian:
 *  - Trạm coi là ĐANG TRỰC nếu nhịp tim gần nhất < 45 giây.
 *  - Lệnh "printing" quá 120 giây không báo xong → "failed" (trạm treo giữa chừng).
 *  - Lệnh "queued" quá 10 phút không ai nhận → "failed" (không in vé cũ vô ích).
 */
import mongoose from "mongoose";

import type { BookingDTO } from "@/lib/baobay/types";
import type { BaobaySession } from "@/lib/baobay/token";
import { connectDB } from "@/lib/mongodb";
import { BaobayPrintJob } from "@/models/BaobayPrintJob.model";
import { BaobayPrintStation } from "@/models/BaobayPrintStation.model";
import { BaobayError, layBookingDTOTheoId } from "@/services/baobay.service";

export const TRAM_SONG_MS = 45_000;
const IN_TREO_MS = 120_000;
const LENH_HET_HAN_MS = 10 * 60_000;

export type PrintJobDTO = {
  id: string;
  spot: string;
  bookingId: string;
  bookingLabel: string;
  status: "queued" | "printing" | "done" | "failed";
  reason: string;
  createdByName: string;
  createdAt: string;
  takenAt?: string;
  doneAt?: string;
  stationName?: string;
  error?: string;
};

function toDTO(d: any): PrintJobDTO {
  return {
    id: String(d._id),
    spot: d.spot,
    bookingId: String(d.bookingId),
    bookingLabel: d.bookingLabel || "",
    status: d.status,
    reason: d.reason || "",
    createdByName: d.createdByName || d.createdByUsername || "",
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
    takenAt: d.takenAt ? new Date(d.takenAt).toISOString() : undefined,
    doneAt: d.doneAt ? new Date(d.doneAt).toISOString() : undefined,
    stationName: d.stationName || undefined,
    error: d.error || undefined,
  };
}

export type TramDTO = { online: boolean; lastSeenAt: string; deviceName: string; kenh: string };

export async function trangThaiTram(spot: string): Promise<TramDTO> {
  await connectDB();
  const t = await BaobayPrintStation.findOne({ spot }).lean<any>();
  const last = t?.lastSeenAt ? new Date(t.lastSeenAt).getTime() : 0;
  return {
    online: Date.now() - last < TRAM_SONG_MS,
    lastSeenAt: last ? new Date(last).toISOString() : "",
    deviceName: t?.deviceName || "",
    kenh: t?.kenh || "",
  };
}

export async function nhipTram(session: BaobaySession, spot: string, deviceName: string, kenh: string): Promise<TramDTO> {
  await connectDB();
  await BaobayPrintStation.updateOne(
    { spot },
    { $set: { lastSeenAt: new Date(), deviceName: deviceName.slice(0, 80), username: session.username, kenh: kenh.slice(0, 20) } },
    { upsert: true },
  );
  return trangThaiTram(spot);
}

/** Trạm dừng trực: xoá nhịp để máy khác không gửi lệnh vào khoảng không. */
export async function tramNghi(spot: string): Promise<void> {
  await connectDB();
  await BaobayPrintStation.updateOne({ spot }, { $set: { lastSeenAt: new Date(0) } });
}

/**
 * ĐƯA LỆNH VÀO HÀNG ĐỢI. Cùng booking đang chờ/đang in trong 60 giây thì trả
 * lại lệnh cũ — bấm đúp không in đôi.
 */
export async function taoLenhIn(
  session: BaobaySession,
  spot: string,
  bookingId: string,
  reason: string,
): Promise<{ job: PrintJobDTO; tram: TramDTO }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const tram = await trangThaiTram(spot);
  if (!tram.online) throw new BaobayError("Trạm in của điểm này đang không trực — mở trang Trạm in trên máy ghép máy in", 409);
  const booking = await layBookingDTOTheoId(spot, bookingId);
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);
  const moc = new Date(Date.now() - 60_000);
  const cu = await BaobayPrintJob.findOne({ spot, bookingId, status: { $in: ["queued", "printing"] }, createdAt: { $gte: moc } }).lean<any>();
  if (cu) return { job: toDTO(cu), tram };
  const doc = await BaobayPrintJob.create({
    spot,
    bookingId: new mongoose.Types.ObjectId(bookingId),
    bookingLabel: `#${booking.daySeq} ${booking.contactName || booking.phone || "khách"} · ${booking.guestCount} khách`,
    status: "queued",
    reason: (reason || "").slice(0, 200),
    createdByUsername: session.username,
    createdByName: session.name,
  });
  return { job: toDTO(doc.toObject()), tram };
}

export async function trangThaiLenh(spot: string, id: string): Promise<PrintJobDTO | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const d = await BaobayPrintJob.findOne({ _id: id, spot }).lean<any>();
  return d ? toDTO(d) : null;
}

/** Dọn lệnh treo / hết hạn trước khi trạm nhận lệnh mới. */
async function donLenhTreo(spot: string): Promise<void> {
  const now = Date.now();
  await BaobayPrintJob.updateMany(
    { spot, status: "printing", takenAt: { $lt: new Date(now - IN_TREO_MS) } },
    { $set: { status: "failed", error: "Trạm in không báo xong sau 2 phút", doneAt: new Date() } },
  );
  await BaobayPrintJob.updateMany(
    { spot, status: "queued", createdAt: { $lt: new Date(now - LENH_HET_HAN_MS) } },
    { $set: { status: "failed", error: "Quá 10 phút không có trạm in nhận", doneAt: new Date() } },
  );
}

/** TRẠM NHẬN LỆNH kế tiếp (nguyên tử: queued → printing) kèm booking để dựng vé. */
export async function nhanLenh(
  session: BaobaySession,
  spot: string,
  stationName: string,
): Promise<{ job: PrintJobDTO; booking: BookingDTO } | null> {
  await connectDB();
  await donLenhTreo(spot);
  const d = await BaobayPrintJob.findOneAndUpdate(
    { spot, status: "queued" },
    { $set: { status: "printing", takenAt: new Date(), stationName: stationName.slice(0, 80) } },
    { sort: { createdAt: 1 }, new: true },
  ).lean<any>();
  if (!d) return null;
  const booking = await layBookingDTOTheoId(spot, String(d.bookingId));
  if (!booking) {
    await BaobayPrintJob.updateOne({ _id: d._id }, { $set: { status: "failed", error: "Booking không còn", doneAt: new Date() } });
    return null;
  }
  void session;
  return { job: toDTO(d), booking };
}

export async function ketThucLenh(spot: string, id: string, ok: boolean, error?: string): Promise<PrintJobDTO | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const d = await BaobayPrintJob.findOneAndUpdate(
    { _id: id, spot, status: "printing" },
    { $set: { status: ok ? "done" : "failed", doneAt: new Date(), error: ok ? "" : (error || "Lỗi không rõ").slice(0, 300) } },
    { new: true },
  ).lean<any>();
  return d ? toDTO(d) : null;
}

export async function lenhGanDay(spot: string, n = 20): Promise<PrintJobDTO[]> {
  await connectDB();
  const ds = await BaobayPrintJob.find({ spot }).sort({ createdAt: -1 }).limit(n).lean<any[]>();
  return ds.map(toDTO);
}
