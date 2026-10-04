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
import { COMPANY_ACCOUNT_RULES, isOtaPrepaid, payAccountSpotEnabled, type PayAccountKind } from "@/lib/baobay/pay-account";
import { wearsRole } from "@/lib/baobay/roles";
import { APP_SPOTS, normalizeSpot, normalizeSpotList } from "@/lib/baobay/spots";
import type { BaobaySession } from "@/lib/baobay/token";
import type { BookingDTO } from "@/lib/baobay/types";
import { connectDB } from "@/lib/mongodb";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayCollect } from "@/models/BaobayCollect.model";
import { BaobayError, assertSpotAllowed, findBookingByCode, toBookingDTO } from "@/services/baobay.service";
import { dayRevenueTally, ensurePayAccountDoc } from "@/services/pay-account-pick";

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
 * QR của HỘP LỆNH THU tự do: ô "Mã booking" khớp một booking → dùng (và nếu
 * cần thì chốt) tài khoản của booking đó. Không khớp → TK cá nhân như cũ.
 */
export async function payAccountByCode(
  session: BaobaySession,
  spotRaw: string,
  code: string,
): Promise<{ payAccount: PayAccountKind; bookingId?: string; label?: string }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const b = await findBookingByCode(spot, code);
  if (!b) return { payAccount: "personal" };
  return {
    payAccount: await ensurePayAccountDoc(b),
    bookingId: String(b._id),
    label: `#${b.daySeq || "?"} ${b.contactName || b.bookingCode || ""}`.trim(),
  };
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
  // Khách OTA trả thêm tại bãi luôn vào BIDV Thuỷ (chủ 04/10 vòng 3)
  if (to === "company" && isOtaPrepaid(b)) throw new BaobayError("Booking OTA (Klook, Agoda, Viator…) luôn nhận tiền vào TK cá nhân BIDV", 400);
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

const acctOf = (v: unknown): PayAccountKind | "" => (v === "company" || v === "personal" ? v : "");

/**
 * MỘT DÒNG TIỀN QUA NGÂN HÀNG của booking (hoặc lệnh thu tự do): tiền VÀO
 * (lệnh thu CK, cọc CK gõ tay) là số dương, tiền HOÀN ra (lệnh hoàn CK, hoàn
 * huỷ flycam qua công ty) là số ÂM — để tổng tiền của TK công ty trừ đúng phần
 * đã hoàn khi xuất VAT (chủ 04/10 vòng 3).
 */
export type MoneyLine = {
  key: string;
  bookingId?: string;
  spot: string;
  date: string;
  at?: string;
  amount: number;
  code: string;
  account: PayAccountKind;
  kind: "thu" | "coc" | "hoan";
  purpose: string;
  guestName: string;
  bookingCode: string;
};

function purposeOfCollect(c: any): string {
  if (c.purpose === "dich-vu") return "thêm dịch vụ";
  const note = String(c.note ?? "");
  if (/^Thu đủ/i.test(note)) return "còn thu (trả đủ)";
  if (/^Cọc/i.test(note)) return "cọc / trả trước";
  return c.bookingId ? "thu tiền" : "lệnh thu";
}

/**
 * Mọi dòng tiền ngân hàng trong PHẠM VI: theo điểm + khoảng ngày tiền đi, hoặc
 * theo danh sách booking (mọi ngày). Tài khoản: khoản ghi rõ thì theo khoản,
 * khoản cũ chưa ghi thì theo tài khoản booking, không có booking = TK cá nhân.
 */
async function moneyLines(
  scope: { spots: string[]; from: string; to: string } | { bookingIds: string[] },
): Promise<{ lines: MoneyLine[]; byId: Map<string, any> }> {
  const { BaobayRefund } = await import("@/models/BaobayRefund.model");
  const { BaobayFlycamCancel } = await import("@/models/BaobayFlycamCancel.model");
  const byIds = "bookingIds" in scope;
  const oids = byIds ? scope.bookingIds.filter((x) => mongoose.Types.ObjectId.isValid(x)).map((x) => new mongoose.Types.ObjectId(x)) : [];
  const where = byIds ? { bookingId: { $in: oids } } : { spot: { $in: scope.spots }, date: { $gte: scope.from, $lte: scope.to } };

  const [collects, refunds, flycams] = await Promise.all([
    BaobayCollect.find({ ...where, method: "transfer", status: { $ne: "rejected" } }).lean<any[]>(),
    BaobayRefund.find({ ...where, method: "transfer", status: { $ne: "voided" } }).lean<any[]>(),
    BaobayFlycamCancel.find({ ...where, refundMode: "company", status: { $ne: "voided" } }).lean<any[]>(),
  ]);
  // Cọc CK GÕ TAY (không qua lệnh thu) — nằm trên booking, ngày = ngày cọc
  const depositBookings = byIds
    ? await BaobayBooking.find({ _id: { $in: oids }, depositMethod: "transfer", deposit: { $gt: 0 } }).lean<any[]>()
    : await BaobayBooking.find({
        spot: { $in: scope.spots },
        depositMethod: "transfer",
        deposit: { $gt: 0 },
        status: { $ne: "voided" },
        $or: [
          { depositDate: { $gte: scope.from, $lte: scope.to } },
          {
            depositDate: { $in: ["", null] },
            createdAt: { $gte: new Date(`${scope.from}T00:00:00+07:00`), $lte: new Date(`${scope.to}T23:59:59+07:00`) },
          },
        ],
      }).lean<any[]>();

  const ids = new Set<string>([
    ...collects.map((c) => (c.bookingId ? String(c.bookingId) : "")),
    ...refunds.map((r) => (r.bookingId ? String(r.bookingId) : "")),
    ...flycams.map((f) => (f.bookingId ? String(f.bookingId) : "")),
  ]);
  ids.delete("");
  const missing = [...ids].filter((x) => !depositBookings.some((b) => String(b._id) === x));
  const more = missing.length ? await BaobayBooking.find({ _id: { $in: missing } }).lean<any[]>() : [];
  const byId = new Map<string, any>([...depositBookings, ...more].map((b) => [String(b._id), b]));
  const bookingAcct = (b: any): PayAccountKind => (b?.payAccount === "company" ? "company" : "personal");
  const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : undefined);

  const lines: MoneyLine[] = [];
  for (const c of collects) {
    const b = c.bookingId ? byId.get(String(c.bookingId)) : null;
    if (b?.status === "voided") continue;
    lines.push({
      key: `collect:${c._id}`,
      bookingId: b ? String(b._id) : undefined,
      spot: c.spot,
      date: c.date,
      at: iso(c.createdAt),
      amount: Number(c.amount) || 0,
      code: c.transferCode || "",
      account: acctOf(c.toAccount) || bookingAcct(b),
      kind: "thu",
      purpose: purposeOfCollect(c),
      guestName: c.guestName || b?.contactName || "",
      bookingCode: c.bookingCode || b?.bookingCode || "",
    });
  }
  for (const b of depositBookings) {
    if (b.status === "voided") continue;
    const viaLog = (b.collectedLog ?? []).reduce((t: number, c: any) => t + (Number(c.amount) || 0), 0);
    const base = Math.max(0, (Number(b.deposit) || 0) - viaLog + (Number(b.refundedTotal) || 0));
    if (base <= 0) continue;
    const day = depositDayOf(b);
    if (!byIds && "from" in scope && (day < scope.from || day > scope.to)) continue;
    lines.push({
      key: `deposit:${b._id}`,
      bookingId: String(b._id),
      spot: b.spot,
      date: day,
      at: iso(b.createdAt),
      amount: base,
      code: b.transferCode || "",
      account: bookingAcct(b),
      kind: "coc",
      purpose: "cọc (gõ tay lúc đặt)",
      guestName: b.contactName || "",
      bookingCode: b.bookingCode || "",
    });
  }
  for (const r of refunds) {
    const b = r.bookingId ? byId.get(String(r.bookingId)) : null;
    lines.push({
      key: `refund:${r._id}`,
      bookingId: b ? String(b._id) : undefined,
      spot: r.spot,
      date: r.date,
      at: iso(r.paidAt || r.createdAt),
      amount: -(Number(r.amount) || 0),
      code: r.transferCode || "",
      account: acctOf(r.fromAccount) || bookingAcct(b),
      kind: "hoan",
      purpose: `hoàn tiền${r.reason ? ` — ${r.reason}` : ""}${r.status === "pending" ? " (chờ kế toán chuyển)" : ""}`,
      guestName: r.guestName || b?.contactName || "",
      bookingCode: r.bookingCode || b?.bookingCode || "",
    });
  }
  for (const f of flycams) {
    const b = f.bookingId ? byId.get(String(f.bookingId)) : null;
    lines.push({
      key: `flycam:${f._id}`,
      bookingId: b ? String(b._id) : undefined,
      spot: f.spot,
      date: f.date,
      at: iso(f.paidAt || f.createdAt),
      amount: -(Number(f.amount) || 0),
      code: f.transferCode || "",
      account: acctOf(f.fromAccount) || bookingAcct(b),
      kind: "hoan",
      purpose: `hoàn huỷ ${f.service || "flycam"}${f.status === "pending" ? " (chờ kế toán chuyển)" : ""}`,
      guestName: b?.contactName || f.bookingLabel || "",
      bookingCode: b?.bookingCode || "",
    });
  }
  return { lines, byId };
}

/** Dạng cũ cho thẻ VAT: chỉ dòng TK công ty có gắn booking. */
async function companyPays(scope: Parameters<typeof moneyLines>[0]) {
  const { lines, byId } = await moneyLines(scope);
  const pays = lines
    .filter((l) => l.account === "company" && l.bookingId)
    .map((l) => ({ bookingId: l.bookingId!, amount: l.amount, code: l.code || (l.kind === "hoan" ? "hoàn" : ""), date: l.date }));
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

/**
 * Điểm được xem/tích VAT: kế toán thuế (và quản trị) nhìn cả công ty như ở
 * /baocao/thue; vai khác chỉ điểm được phân.
 */
function vatSpot(session: BaobaySession & { viaAdmin?: boolean }, spotRaw: string): string {
  if (session.viaAdmin || session.role === "admin" || wearsRole(session, "tax")) return normalizeSpot(spotRaw);
  return assertSpotAllowed(session, spotRaw);
}

function vatSpots(session: BaobaySession & { viaAdmin?: boolean }): string[] {
  if (session.viaAdmin || session.role === "admin" || wearsRole(session, "tax")) return APP_SPOTS.map((s) => s.id);
  return normalizeSpotList(session.spots);
}

/** Booking có tiền về TK công ty TRONG NGÀY `date` (ngày tiền về, không phải ngày bay). */
export async function listVatDay(session: BaobaySession, spotRaw: string, date: string): Promise<VatRowDTO[]> {
  await connectDB();
  const spot = vatSpot(session, spotRaw);
  if (!isDateKey(date)) throw new BaobayError("Ngày không hợp lệ", 400);
  if (!payAccountSpotEnabled(spot)) return [];

  const day = await companyPays({ spots: [spot], from: date, to: date });
  const bookingIds = [...new Set(day.pays.map((p) => p.bookingId))];
  if (!bookingIds.length) return [];
  // Tổng mọi ngày của các booking này (đã trừ hoàn) — số ghi lên hoá đơn
  const all = await companyPays({ bookingIds });
  return bookingIds
    .map((id) => all.byId.get(id) ?? day.byId.get(id))
    .filter(Boolean)
    .map((b: any) =>
      vatRow(
        b,
        day.pays.filter((p) => p.bookingId === String(b._id)),
        all.pays.filter((p) => p.bookingId === String(b._id)),
      ),
    )
    .sort((a, b) => a.flightDate.localeCompare(b.flightDate) || a.daySeq - b.daySeq);
}

/** Tích / bỏ tích "đã xuất VAT" (+ số hoá đơn). Số lưu = tiền về TK công ty sau khi trừ hoàn. */
export async function setVatIssued(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  on: boolean,
  invoiceNo: string,
): Promise<VatRowDTO | null> {
  await connectDB();
  const spot = vatSpot(session, spotRaw);
  const b = await loadBooking(spot, id);
  const all = await companyPays({ bookingIds: [String(b._id)] });
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
  const spot = vatSpot(session, spotRaw);
  if (!payAccountSpotEnabled(spot)) return { count: 0, amount: 0 };
  const { pays, byId } = await companyPays({ spots: [spot], from: startDayKey(), to: "9999-12-31" });
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

/* ================================================================== */
/* BẢNG LỌC TIỀN NGÂN HÀNG cho kế toán thuế (chủ 04/10 vòng 3)          */
/* ================================================================== */

export type PayLedgerRow = MoneyLine & {
  daySeq: number;
  phone: string;
  flightDate: string;
  /** Booking đã xuất VAT chưa (chỉ có nghĩa với dòng MB có booking). */
  vatIssued: boolean;
  invoiceNo?: string;
  /** Tiền về MB cả booking (đã trừ hoàn) — so với số đã xuất để biết còn thiếu. */
  bookingMbTotal?: number;
  vatAmount?: number;
};

/**
 * Mọi dòng tiền ngân hàng trong khoảng ngày, lọc theo TÀI KHOẢN NHẬN (MB /
 * BIDV) và TÌNH TRẠNG VAT — 100% tiền vào MB phải có hoá đơn. Hoàn tiền ra từ
 * MB là dòng ÂM để số hoá đơn trừ đúng.
 */
export async function listPayLedger(
  session: BaobaySession,
  q: { from: string; to: string; account: "all" | PayAccountKind; vat: "all" | "pending" | "issued" },
): Promise<{ rows: PayLedgerRow[]; totals: { company: number; personal: number } }> {
  await connectDB();
  if (!isDateKey(q.from) || !isDateKey(q.to) || q.to < q.from) throw new BaobayError("Khoảng ngày không hợp lệ", 400);
  const spots = vatSpots(session);
  const { lines, byId } = await moneyLines({ spots, from: q.from, to: q.to });
  // Tổng MB mọi ngày của các booking có mặt — để biết số đã xuất còn đủ không
  const mbIds = [...new Set(lines.filter((l) => l.account === "company" && l.bookingId).map((l) => l.bookingId!))];
  const mbAll = mbIds.length ? await companyPays({ bookingIds: mbIds }) : { pays: [], byId: new Map() };
  const mbTotal = new Map<string, number>();
  for (const p of mbAll.pays) mbTotal.set(p.bookingId, (mbTotal.get(p.bookingId) ?? 0) + p.amount);

  const rows: PayLedgerRow[] = lines.map((l) => {
    const b = l.bookingId ? byId.get(l.bookingId) ?? mbAll.byId.get(l.bookingId) : null;
    return {
      ...l,
      daySeq: Number(b?.daySeq) || 0,
      phone: b?.phone || "",
      flightDate: b?.flightDate || "",
      guestName: l.guestName || b?.contactName || "",
      vatIssued: Boolean(b?.vat?.issuedAt),
      invoiceNo: b?.vat?.invoiceNo || undefined,
      bookingMbTotal: l.account === "company" && l.bookingId ? mbTotal.get(l.bookingId) : undefined,
      vatAmount: b?.vat?.issuedAt ? Number(b.vat.amount) || 0 : undefined,
    };
  });
  const totals = { company: 0, personal: 0 };
  for (const r of rows) totals[r.account] += r.amount;
  const filtered = rows
    .filter((r) => q.account === "all" || r.account === q.account)
    .filter((r) => {
      if (q.vat === "all") return true;
      if (r.account !== "company") return false;
      const done = r.vatIssued && (r.vatAmount ?? 0) >= (r.bookingMbTotal ?? 0);
      return q.vat === "issued" ? done : !done;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.at ?? "").localeCompare(b.at ?? ""))
    .slice(0, 3000);
  return { rows: filtered, totals };
}

/* ================================================================== */
/* Cân 30% doanh thu — chủ xem ngày bay đang lệch tới đâu              */
/* ================================================================== */

export type RevenueShareDTO = {
  flightDate: string;
  /** Doanh thu CK đã chốt vào TK công ty / tổng doanh thu CK đã chốt tài khoản. */
  companyValue: number;
  decidedValue: number;
  /** 0..1 — trống (null) khi ngày chưa có booking nào thuộc diện. */
  share: number | null;
  companyBookings: number;
  decidedBookings: number;
  target: number;
  low: number;
  high: number;
};

/** Phần doanh thu CK của NGÀY BAY đang vào TK công ty (booking lập từ mốc áp dụng). */
export async function dayRevenueShare(session: BaobaySession, spotRaw: string, flightDate: string): Promise<RevenueShareDTO | null> {
  await connectDB();
  const spot = vatSpot(session, spotRaw);
  if (!payAccountSpotEnabled(spot) || !isDateKey(flightDate)) return null;
  const t = await dayRevenueTally(spot, flightDate);
  return {
    flightDate,
    companyValue: t.companyValue,
    decidedValue: t.decidedValue,
    share: t.decidedValue > 0 ? t.companyValue / t.decidedValue : null,
    companyBookings: t.company,
    decidedBookings: t.decided,
    target: COMPANY_ACCOUNT_RULES.targetRevenueShare,
    low: COMPANY_ACCOUNT_RULES.band.low,
    high: COMPANY_ACCOUNT_RULES.band.high,
  };
}
