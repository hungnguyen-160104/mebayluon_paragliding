// services/pay-account.service.ts
/**
 * TÀI KHOẢN NHẬN TIỀN BAY + DANH SÁCH XUẤT VAT CUỐI NGÀY (chủ 04/10/2026).
 *
 *  - ensurePayAccount: lần đầu đưa mã QR cho một booking chưa chốt tài khoản
 *    (booking từ web, từ sổ, lập trước khi có tính năng mà thuộc diện…) → máy
 *    chọn một lần rồi giữ nguyên.
 *  - setPayAccountManual: nhân viên/kế toán đổi tay TK công ty ↔ TK cá nhân,
 *    ghi người + lý do vào `payAccountLog` (hiện trong lịch sử booking).
 *  - listVatDay / setVatIssued / countVatPending: kế toán xem các booking có
 *    tiền về TK CÔNG TY trong ngày, tích "đã xuất VAT" (+ số hoá đơn).
 *
 * Luật chọn và các con số: lib/baobay/pay-account.ts.
 */
import mongoose from "mongoose";

import { depositDayOf, isDateKey, toDateKeyVN } from "@/lib/baobay/date";
import {
  FLIGHT_KIND_SHORT,
  SERVICE_PRICE_LABEL,
  flightUnitPrice,
  serviceChargedCount,
  servicePriceOf,
  type FlightKind,
} from "@/lib/baobay/flight-price";
import { COMPANY_ACCOUNT_RULES, payAccountSpotEnabled, type PayAccountKind } from "@/lib/baobay/pay-account";
import type { BaobaySession } from "@/lib/baobay/token";
import type { BookingDTO } from "@/lib/baobay/types";
import { connectDB } from "@/lib/mongodb";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayCollect } from "@/models/BaobayCollect.model";
import { BaobayError, assertSpotAllowed, toBookingDTO } from "@/services/baobay.service";
import { ensurePayAccountDoc } from "@/services/pay-account-pick";

/* ================================================================== */
/* Chốt / đổi tài khoản                                                */
/* ================================================================== */

async function loadBooking(spot: string, id: string): Promise<any> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Booking không hợp lệ", 400);
  const b = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!b) throw new BaobayError("Không tìm thấy booking", 404);
  return b;
}

/**
 * Lần đầu đưa mã QR: booking chưa chốt tài khoản thì máy chọn ngay (một lần).
 * Booking ngoài diện (Hà Nội, OTA, lập trước mốc) trả TK cá nhân, KHÔNG ghi gì.
 */
export async function ensurePayAccount(
  session: BaobaySession,
  spotRaw: string,
  id: string,
): Promise<{ payAccount: PayAccountKind; booking: BookingDTO }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const b = await loadBooking(spot, id);
  const payAccount = await ensurePayAccountDoc(b);
  const fresh = payAccount === b.payAccount ? b : await BaobayBooking.findById(b._id).lean<any>();
  return { payAccount, booking: toBookingDTO(fresh) };
}

/**
 * ĐỔI TAY tài khoản nhận tiền. Cho phép cả khi đã có tiền về — tiền đã về
 * tài khoản nào vẫn ghi đúng tài khoản đó trên từng khoản thu (`toAccount`),
 * chỉ các mã QR TỪ GIỜ mới theo tài khoản mới.
 */
export async function setPayAccountManual(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  to: PayAccountKind,
  reason: string,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (to !== "company" && to !== "personal") throw new BaobayError("Tài khoản không hợp lệ", 400);
  if (to === "company" && !payAccountSpotEnabled(spot)) {
    throw new BaobayError("Điểm này chưa dùng tài khoản công ty (chỉ Khau Phạ)", 400);
  }
  const b = await loadBooking(spot, id);
  const from = b.payAccount === "company" ? "company" : "personal";
  if (b.payAccount === to) return toBookingDTO(b);
  const who = session.name || session.username;
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: b._id, spot },
    {
      $set: { payAccount: to, payAccountSource: "manual", payAccountAt: new Date(), payAccountBy: who },
      $push: {
        payAccountLog: { at: new Date(), by: who, from, to, source: "manual", reason: String(reason ?? "").trim().slice(0, 300) },
      },
    },
    { new: true },
  ).lean<any>();
  return toBookingDTO(updated);
}

/* ================================================================== */
/* Danh sách xuất VAT — tiền về TK công ty                             */
/* ================================================================== */

export type VatServiceLine = { label: string; qty: number; unitPrice: number; amount: number };

export type VatRowDTO = {
  bookingId: string;
  spot: string;
  daySeq: number;
  flightDate: string;
  contactName: string;
  phone: string;
  bookingCode: string;
  source: string;
  status: string;
  /** Tiền về TK công ty TRONG NGÀY đang xem. */
  amountDay: number;
  /** Tổng tiền về TK công ty của booking (mọi ngày) — số ghi hoá đơn. */
  amountTotal: number;
  totalAmount: number;
  /** Từng khoản CK vào TK công ty trong ngày: số tiền · mã GD. */
  payments: Array<{ amount: number; code: string; date: string }>;
  lines: VatServiceLine[];
  issuedAt?: string;
  issuedBy?: string;
  invoiceNo?: string;
  /** Số tiền lúc tích "đã xuất" — tiền về thêm sau đó thì nhắc xuất bổ sung. */
  issuedAmount?: number;
};

/** Dòng dịch vụ để gõ hoá đơn: số lượng × đơn giá, giảm trừ ghi âm. */
function serviceLinesOf(b: any): VatServiceLine[] {
  const out: VatServiceLine[] = [];
  const kind = (b.flightKind || "pg") as FlightKind;
  const guests = Math.max(0, Number(b.guestCount) || 0);
  const ppg = Math.min(guests, Math.max(0, Number(b.ppgGuests) || 0));
  const pg = guests - ppg;
  const unit = Number(b.unitPrice) || 0;
  if (pg > 0) out.push({ label: `Bay dù lượn ${FLIGHT_KIND_SHORT[kind] ?? kind}`, qty: pg, unitPrice: unit, amount: pg * unit });
  if (ppg > 0) {
    const p = Number(b.ppgUnitPrice) || flightUnitPrice("ppg", b.flightDate, b.spot);
    out.push({ label: "Bay dù lượn PPG", qty: ppg, unitPrice: p, amount: ppg * p });
  }
  const prices = servicePriceOf(b.spot, b.createdAt);
  for (const { key, label } of SERVICE_PRICE_LABEL) {
    const qty = serviceChargedCount(key, b, b.spot);
    if (qty > 0) out.push({ label, qty, unitPrice: prices[key], amount: qty * prices[key] });
  }
  if ((Number(b.mountainCar) || 0) > 0) {
    out.push({ label: "Xe lên núi", qty: b.mountainCar, unitPrice: 150_000, amount: b.mountainCar * 150_000 });
  }
  if ((Number(b.pickupFee) || 0) > 0) out.push({ label: "Phí đưa đón", qty: 1, unitPrice: b.pickupFee, amount: b.pickupFee });
  if ((Number(b.comboDiscount) || 0) > 0) {
    out.push({ label: "Giảm combo flycam + 360", qty: 1, unitPrice: -b.comboDiscount, amount: -b.comboDiscount });
  }
  if ((Number(b.discount) || 0) > 0) out.push({ label: "Giảm trừ", qty: 1, unitPrice: -b.discount, amount: -b.discount });
  return out;
}

/** Ngày bắt đầu áp dụng TK công ty, dạng "YYYY-MM-DD" giờ Việt Nam. */
function startDayKey(): string {
  return toDateKeyVN(new Date(COMPANY_ACCOUNT_RULES.startAt));
}

/**
 * Mọi khoản tiền về TK CÔNG TY của một nhóm booking, theo ngày.
 *
 * Nguồn: lệnh thu CK của booking (`toAccount`, trống thì theo tài khoản booking
 * đang mang) + cọc CK gõ tay của booking mang TK công ty (đổi tay sang TKCT sau
 * khi khách đã cọc vào MB). Tiền mặt không bao giờ vào đây.
 */
async function companyPayments(filter: Record<string, unknown>, bookingFilter?: Record<string, unknown>) {
  const collects = await BaobayCollect.find({
    method: "transfer",
    bookingId: { $ne: null },
    status: { $ne: "rejected" },
    ...filter,
  })
    .select("bookingId amount transferCode date toAccount")
    .lean<any[]>();
  const ids = [...new Set(collects.map((c) => String(c.bookingId)))];
  const bookings = await BaobayBooking.find({
    $or: [
      { _id: { $in: ids } },
      ...(bookingFilter ? [{ ...bookingFilter, payAccount: "company", depositMethod: "transfer", deposit: { $gt: 0 } }] : []),
    ],
    status: { $ne: "voided" },
  }).lean<any[]>();
  const byId = new Map(bookings.map((b) => [String(b._id), b]));
  const pays: Array<{ bookingId: string; amount: number; code: string; date: string }> = [];
  for (const c of collects) {
    const b = byId.get(String(c.bookingId));
    if (!b) continue;
    const acct = c.toAccount === "company" || c.toAccount === "personal" ? c.toAccount : b.payAccount;
    if (acct !== "company") continue;
    pays.push({ bookingId: String(b._id), amount: Number(c.amount) || 0, code: c.transferCode || "", date: c.date });
  }
  for (const b of bookings) {
    if (b.payAccount !== "company" || b.depositMethod !== "transfer") continue;
    // Cọc gõ tay = số ròng − mọi khoản đã thu qua lệnh thu + đã hoàn
    const viaCollects = (b.collectedLog ?? []).reduce((t: number, c: any) => t + (Number(c.amount) || 0), 0);
    const base = Math.max(0, (Number(b.deposit) || 0) - viaCollects + (Number(b.refundedTotal) || 0));
    if (base > 0) pays.push({ bookingId: String(b._id), amount: base, code: b.transferCode || "", date: depositDayOf(b) });
  }
  return { pays, byId };
}

function vatRow(b: any, dayPays: Array<{ amount: number; code: string; date: string }>, allPays: Array<{ amount: number }>): VatRowDTO {
  return {
    bookingId: String(b._id),
    spot: b.spot,
    daySeq: Number(b.daySeq) || 0,
    flightDate: b.flightDate,
    contactName: b.contactName || "",
    phone: b.phone || "",
    bookingCode: b.bookingCode || "",
    source: b.source || "",
    status: b.status || "open",
    amountDay: dayPays.reduce((t, p) => t + p.amount, 0),
    amountTotal: allPays.reduce((t, p) => t + p.amount, 0),
    totalAmount: Number(b.totalAmount) || 0,
    payments: dayPays,
    lines: serviceLinesOf(b),
    issuedAt: b.vat?.issuedAt ? new Date(b.vat.issuedAt).toISOString() : undefined,
    issuedBy: b.vat?.issuedBy || undefined,
    invoiceNo: b.vat?.invoiceNo || undefined,
    issuedAmount: b.vat?.issuedAt ? Number(b.vat.amount) || 0 : undefined,
  };
}

/** Booking có tiền về TK công ty TRONG NGÀY `date` (ngày tiền về, không phải ngày bay). */
export async function listVatDay(session: BaobaySession, spotRaw: string, date: string): Promise<VatRowDTO[]> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!isDateKey(date)) throw new BaobayError("Ngày không hợp lệ", 400);
  if (!payAccountSpotEnabled(spot)) return [];

  const { pays, byId } = await companyPayments({ spot, date }, { spot });
  const dayPays = pays.filter((p) => p.date === date);
  const bookingIds = [...new Set(dayPays.map((p) => p.bookingId))];
  if (!bookingIds.length) return [];
  // Tổng mọi ngày của các booking này — số ghi lên hoá đơn
  const all = await companyPayments({ bookingId: { $in: bookingIds.map((x) => new mongoose.Types.ObjectId(x)) } }, {
    _id: { $in: bookingIds },
  });
  return bookingIds
    .map((id) => byId.get(id) ?? all.byId.get(id))
    .filter(Boolean)
    .map((b: any) =>
      vatRow(
        b,
        dayPays.filter((p) => p.bookingId === String(b._id)),
        all.pays.filter((p) => p.bookingId === String(b._id)),
      ),
    )
    .sort((a, b) => a.flightDate.localeCompare(b.flightDate) || a.daySeq - b.daySeq);
}

/** Tích / bỏ tích "đã xuất VAT" (+ số hoá đơn). */
export async function setVatIssued(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  on: boolean,
  invoiceNo: string,
): Promise<VatRowDTO | null> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const b = await loadBooking(spot, id);
  const all = await companyPayments({ bookingId: b._id }, { _id: b._id });
  const total = all.pays.reduce((t, p) => t + p.amount, 0);
  if (on && total <= 0) throw new BaobayError("Booking này chưa có tiền về TK công ty — chưa cần xuất VAT", 400);
  const who = session.name || session.username;
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: b._id, spot },
    on
      ? { $set: { vat: { issuedAt: new Date(), issuedBy: who, invoiceNo: String(invoiceNo ?? "").trim().slice(0, 60), amount: total } } }
      : { $unset: { vat: 1 } },
    { new: true },
  ).lean<any>();
  return vatRow(updated, [], all.pays);
}

/** Số booking có tiền về TK công ty mà CHƯA xuất VAT (hoặc tiền về thêm sau khi xuất). */
export async function countVatPending(session: BaobaySession, spotRaw: string): Promise<{ count: number; amount: number }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!payAccountSpotEnabled(spot)) return { count: 0, amount: 0 };
  const { pays, byId } = await companyPayments({ spot, date: { $gte: startDayKey() } }, { spot });
  const sum = new Map<string, number>();
  for (const p of pays) sum.set(p.bookingId, (sum.get(p.bookingId) ?? 0) + p.amount);
  let count = 0;
  let amount = 0;
  for (const [id, total] of sum) {
    const b = byId.get(id);
    if (!b) continue;
    const issued = b.vat?.issuedAt ? Number(b.vat.amount) || 0 : 0;
    if (total > issued) {
      count++;
      amount += total - issued;
    }
  }
  return { count, amount };
}
