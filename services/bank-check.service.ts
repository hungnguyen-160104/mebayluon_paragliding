// services/bank-check.service.ts
/**
 * SOÁT CHUYỂN KHOẢN — phần đọc/ghi dữ liệu quanh bộ dò thuần ở lib/baobay/bank-check.ts.
 *
 * Kế toán dán danh sách SMS banking / sao kê của một ngày; máy bóc từng khoản
 * tiền VÀO rồi dò với:
 *
 *  - Khoản CK app ĐÃ GHI trong ngày: lệnh thu chuyển khoản (mỗi bill chia là
 *    một lệnh, có mã GD riêng) và tiền cọc của booking nhập trong ngày.
 *  - Booking BAY TRONG NGÀY còn phải thu — khách chuyển mà nhân viên chưa kịp
 *    ghi thì vẫn dò ra chủ, kèm nhắc "app chưa ghi thu".
 *
 * Khoản không tìm được chủ thì TREO lại (bản ghi trạng thái "pending") — nhân
 * viên nhập booking xong, kế toán bấm "soát lại" là khoản treo tự tìm chủ.
 *
 * Sao kê là của TÀI KHOẢN CÔNG TY dùng chung cho cả ba điểm bay, nên máy dò
 * trên mọi điểm mà tài khoản kế toán được phân — không lọc theo điểm đang mở.
 */

import { createHash } from "crypto";

import mongoose from "mongoose";

import {
  dedupeByBooking,
  matchBankEntry,
  parseBankStatement,
  type BankCandidate,
  type BankEntry,
} from "@/lib/baobay/bank-check";
import { formatDateKeyVN, isDateKey, toDateKeyVN } from "@/lib/baobay/date";
import { SPOT_IDS, normalizeSpot, spotName } from "@/lib/baobay/spots";
import type { BaobaySession } from "@/lib/baobay/token";
import { connectDB } from "@/lib/mongodb";
import { BaobayBankLine } from "@/models/BaobayBankLine.model";
import { BaobayServiceChange } from "@/models/BaobayServiceChange.model";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayCollect } from "@/models/BaobayCollect.model";
import { BaobayError, setBookingLock } from "@/services/baobay.service";

/* ================================================================== */
/* DTO cho trang kế toán                                               */
/* ================================================================== */

export type BankLineDTO = {
  id: string;
  raw: string;
  amount: number;
  bankDate: string;
  bankTime: string;
  checkDate: string;
  status: "matched" | "pending" | "manual";
  matchLevel?: "code" | "note" | "amount" | "manual";
  matchWhy?: string;
  matchLabel?: string;
  matchSpot?: string;
  /** false = đã biết của booking nào nhưng app CHƯA ghi thu khoản này. */
  recorded?: boolean;
  candidates?: string[];
  resolvedNote?: string;
  resolvedBy?: string;
};

/** Một khoản CK app đã ghi trong ngày — đối chiếu ngược với sao kê. */
export type BankAppTransferDTO = {
  refId: string;
  /** Booking đứng sau khoản — để nút "Đúng — khoá booking" gọi thẳng khoá sổ. */
  bookingId?: string;
  daySeq: number;
  label: string;
  amount: number;
  code: string;
  spot: string;
  source: string;
  /** Đã có dòng sao kê nào khớp về khoản này chưa. */
  seen: boolean;
  /** Kế toán đã bấm "ĐÃ NHẬN" khoản này. */
  verified: boolean;
  /** Kế toán đã soát đúng và KHOÁ booking — không ai sửa được số tiền nữa. */
  locked: boolean;
};

/** Khoản TIỀN MẶT ghi nhận trong ngày — kế toán tích "Đã nhận" để phân biệt khoản đã kiểm. */
export type BankAppCashDTO = {
  refId: string;
  bookingId?: string;
  daySeq: number;
  label: string;
  amount: number;
  /** Ai đang giữ khoản tiền mặt này. */
  by: string;
  spot: string;
  verified: boolean;
  locked: boolean;
};

/** BOOKING nhận NHIỀU BILL (khách chia 2-3 lần chuyển) — công thức cộng để soát. */
export type BankGroupDTO = {
  label: string;
  /** Từng bill đã về, theo thứ tự thời gian. */
  parts: number[];
  total: number;
  /** Số booking cần nhận (còn thu / đã ghi trong app). */
  expected: number;
  /** du = vừa khớp · thieu = còn thiếu · thua = chuyển dư. */
  status: "du" | "thieu" | "thua";
};

/**
 * MỘT BOOKING = MỘT THẺ SOÁT: gom mọi dòng tiền (CK app ghi, TM đang giữ, dòng
 * sao kê đã khớp, dòng sao kê NGHI là của nó) về đúng một chỗ — kế toán soát
 * theo từng khách thay vì nhảy qua lại giữa ba danh sách.
 */
export type BankBookingRowDTO = {
  bookingId: string;
  daySeq: number;
  spot: string;
  label: string;
  /** Tóm tắt dịch vụ: "3 khách PG · 1 PPG · 2×360 · 1×flycam". */
  summary: string;
  totalAmount: number;
  remaining: number;
  /** Giảm trừ đã áp cho booking (nếu có). */
  discount: number;
  /** THU THỪA (khách trả quá tổng) — dấu hiệu sửa/bỏ lệnh dịch vụ sau khi đã thu tiền. */
  overpaid: number;
  /** Số lệnh thêm/bớt dịch vụ ĐÃ BỊ BỎ của booking này — vết để soi gian lận. */
  undoneChanges: number;
  /** Ghi chú điều phối ghi trên booking. */
  note: string;
  /** Khách đã trả bên đại lý + tên đại lý (đại lý nợ công ty). */
  agencyPaidAmount: number;
  agencyName: string;
  /** Dữ liệu để tô sáng phần TRÙNG trong SMS: tên, SĐT, mã booking, ngày+STT. */
  contactName: string;
  phone: string;
  bookingCode: string;
  flightDate: string;
  status: string;
  flown: boolean;
  ticketIssued: boolean;
  noTicket: boolean;
  locked: boolean;
  transfers: BankAppTransferDTO[];
  cash: BankAppCashDTO[];
  /**
   * Dòng sao kê ĐÃ khớp về booking này — gom MỌI NGÀY, không riêng ngày đang
   * xem: khách trả làm nhiều lần thì các lần đó rơi vào nhiều ngày sao kê khác
   * nhau, chỉ lấy dòng của một ngày là cộng ra thiếu và tưởng khách còn nợ.
   */
  lines: BankLineDTO[];
  /** Tổng các dòng sao kê đã trỏ về booking này (tự cân nhiều lần chuyển). */
  bankTotal: number;
  /** Số CẦN VỀ qua ngân hàng (tổng tiền − tiền mặt − đại lý giữ) — mẫu số của phép tự cân. */
  bankNeed: number;
  /** Còn thiếu so với tổng tiền booking, đã trừ tiền mặt và tiền đại lý giữ hộ. */
  bankShort: number;
  /** Về DƯ so với tổng tiền booking. */
  bankOver: number;
  /** Dòng sao kê treo nhưng máy NGHI là của booking này — soát tay. */
  suggests: BankLineDTO[];
};

export type BankCheckReport = {
  date: string;
  /** Điểm bay đang soát — rỗng nghĩa là cả ba. */
  spots: string[];
  lines: BankLineDTO[];
  /** Khoản treo của MỌI ngày còn chưa xử — kể cả ngày trước. */
  pending: BankLineDTO[];
  appTransfers: BankAppTransferDTO[];
  /** Khoản TIỀN MẶT ghi nhận trong ngày — không tính vào đối chiếu sao kê. */
  appCash: BankAppCashDTO[];
  /** Booking chia bill — mỗi dòng một công thức cộng. */
  groups: BankGroupDTO[];
  /** SỔ BOOKING & TIỀN TRONG NGÀY — mỗi booking một thẻ gom trọn dòng tiền. */
  bookingRows: BankBookingRowDTO[];
  /**
   * ĐỐI CHIẾU TỔNG của ngày: tổng/số lượng tiền VỀ trên sao kê so với
   * tổng/số lượng khoản CK app đã ghi — lệch đồng nào khoản nào là thấy ngay.
   */
  summary: {
    bankTotal: number;
    bankCount: number;
    appTotal: number;
    appCount: number;
    diffAmount: number;
    diffCount: number;
  };
  /** Dòng dán vào nhưng không đọc được số tiền / là tiền CHI ra — chỉ báo, không lưu. */
  skipped: string[];
  /**
   * MỌI KHOẢN CHUYỂN KHOẢN CÒN CHƯA SOÁT, không phụ thuộc ngày đang xem:
   * booking chưa khoá mà kế toán chưa tích "đã nhận". Đây là danh sách để soát
   * tràn — làm hết là hết việc, thay vì phải nhớ mở lại từng ngày.
   */
  unchecked: BankUncheckedDTO[];
};

/** Một khoản CK còn chờ kế toán soát — gom từ mọi ngày. */
export type BankUncheckedDTO = {
  refId: string;
  kind: "collect" | "deposit" | "remaining";
  bookingId?: string;
  spot: string;
  label: string;
  /** Các mảnh rời để giao diện tự xếp và TÔ VÀNG phần trùng với sao kê. */
  daySeq: number;
  contactName: string;
  phone: string;
  bookingCode: string;
  flightDate: string;
  createdDate?: string;
  amount: number;
  /** Mã giao dịch nhân viên đã ghi — rỗng nghĩa là chưa ai ghi mã, phải dò bằng dấu hiệu khác. */
  code: string;
  /** App đã ghi khoản thu này chưa (false = mới chỉ là "còn phải thu"). */
  recorded: boolean;
  /** Dòng sao kê đã trỏ về khoản này (nếu có) — kế toán chỉ việc tích "đã nhận". */
  matchedLine?: { id: string; raw: string; bankDate: string; why: string };
};

/* ================================================================== */
/* Dựng danh sách ứng viên cho một ngày                                */
/* ================================================================== */

/** Khoảng thời gian của một ngày theo GIỜ VIỆT NAM — lọc bản ghi tạo trong ngày. */
function vnDayRange(date: string): { from: Date; to: Date } {
  const from = new Date(`${date}T00:00:00+07:00`);
  return { from, to: new Date(from.getTime() + 24 * 3600 * 1000) };
}

function bookingLabel(b: {
  daySeq?: number;
  contactName?: string;
  bookingCode?: string;
  phone?: string;
  flightDate?: string;
  spot?: string;
}): string {
  return [
    b.daySeq ? `#${b.daySeq}` : "",
    b.contactName || b.bookingCode || b.phone || "khách",
    b.flightDate ? `bay ${formatDateKeyVN(b.flightDate)}` : "",
    b.spot ? spotName(b.spot) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Gom mọi "chỗ tiền có thể về" của một ngày:
 *  - lệnh thu CHUYỂN KHOẢN lập trong ngày (`date` của lệnh = ngày ghi nhận);
 *  - booking NHẬP trong ngày có tiền cọc (cọc luôn về TK công ty);
 *  - booking BAY trong ngày — số còn thu, số tổng (khách chuyển cả cục một lần).
 */
async function candidatesForDate(spots: string[], date: string): Promise<BankCandidate[]> {
  const { from, to } = vnDayRange(date);

  const [collects, createdToday, flyingToday] = await Promise.all([
    BaobayCollect.find({ spot: { $in: spots }, date, method: "transfer" }).lean<any[]>(),
    BaobayBooking.find({
      spot: { $in: spots },
      createdAt: { $gte: from, $lt: to },
      deposit: { $gt: 0 },
      status: { $ne: "voided" },
    })
      .select("spot daySeq flightDate contactName phone bookingCode deposit transferCode createdAt")
      .lean<any[]>(),
    BaobayBooking.find({ spot: { $in: spots }, flightDate: date, status: { $ne: "voided" } })
      .select("spot daySeq flightDate contactName phone bookingCode deposit remaining totalAmount transferCode createdAt")
      .lean<any[]>(),
  ]);

  /** Booking đứng sau các lệnh thu — để lệnh thu cũng khớp được bằng "2508 k3"/SĐT. */
  const ids = collects.map((c) => c.bookingId).filter(Boolean);
  const linked = ids.length
    ? await BaobayBooking.find({ _id: { $in: ids } })
        .select("spot daySeq flightDate contactName phone bookingCode createdAt")
        .lean<any[]>()
    : [];
  const linkedById = new Map(linked.map((b) => [String(b._id), b]));

  const out: BankCandidate[] = [];

  for (const c of collects) {
    const b = c.bookingId ? linkedById.get(String(c.bookingId)) : undefined;
    out.push({
      id: `collect:${String(c._id)}`,
      kind: "collect",
      bookingId: c.bookingId ? String(c.bookingId) : undefined,
      spot: c.spot,
      label: b
        ? bookingLabel(b)
        : [c.guestName || c.bookingCode || "khách", c.agency, spotName(c.spot)].filter(Boolean).join(" · "),
      daySeq: Number(b?.daySeq) || 0,
      flightDate: b?.flightDate || "",
      bookingCode: c.bookingCode || b?.bookingCode || "",
      phone: b?.phone || "",
      contactName: c.guestName || b?.contactName || "",
      codes: [c.transferCode].filter(Boolean),
      amounts: [c.amount].filter((n) => n > 0),
      recorded: true,
      createdDate: b?.createdAt ? toDateKeyVN(new Date(b.createdAt)) : undefined,
    });
  }

  /**
   * CỌC trên booking hay là TỔNG DỒN: nút "thu tiền" cộng từng lệnh thu vào
   * `deposit`, nên booking cọc 5.180.000 với hai lệnh thu 2.590.000 là CÙNG
   * MỘT dòng tiền kể ba lần. Chỉ giữ phần cọc KHÔNG được lệnh thu nào đại
   * diện (gõ tay lúc nhập booking) — phần đó mới là khoản chờ soát riêng.
   */
  const depIds = createdToday.map((b) => b._id);
  const linkedCollects = depIds.length
    ? await BaobayCollect.find({ bookingId: { $in: depIds } })
        .select("bookingId amount")
        .lean<any[]>()
    : [];
  const collectedByBooking = new Map<string, number>();
  for (const c of linkedCollects) {
    const k = String(c.bookingId);
    collectedByBooking.set(k, (collectedByBooking.get(k) ?? 0) + (c.amount || 0));
  }
  for (const b of createdToday) {
    const manualDeposit = (b.deposit || 0) - (collectedByBooking.get(String(b._id)) ?? 0);
    if (manualDeposit <= 0) continue;
    out.push({
      id: `deposit:${String(b._id)}`,
      kind: "deposit",
      bookingId: String(b._id),
      spot: b.spot,
      label: `${bookingLabel(b)} · cọc`,
      daySeq: Number(b.daySeq) || 0,
      flightDate: b.flightDate || "",
      bookingCode: b.bookingCode || "",
      phone: b.phone || "",
      contactName: b.contactName || "",
      codes: [b.transferCode].filter(Boolean),
      amounts: [manualDeposit],
      recorded: true,
      createdDate: b.createdAt ? toDateKeyVN(new Date(b.createdAt)) : undefined,
    });
  }

  for (const b of flyingToday) {
    /**
     * ĐÃ THU ĐỦ thì đứng ngoài vòng soát: không ai chuyển khoản sau khi trả
     * đủ (nhất là trả đủ tiền mặt). Để lại là tên khách bị đem so với sao kê
     * và rước nhầm tiền của người trùng tên (vụ Trần Thị Thu / TRAN THI THU
     * HUYEN). Khoản CK ĐÃ GHI của booking vẫn soát qua ngả collect ở trên.
     */
    if (!(Number(b.remaining) > 0)) continue;
    // Số có thể về: phần còn thu, hoặc khách chuyển trọn tổng tiền một lần
    const amounts = [...new Set([b.remaining, b.totalAmount].filter((n) => n > 0))];
    out.push({
      id: `remaining:${String(b._id)}`,
      kind: "remaining",
      bookingId: String(b._id),
      spot: b.spot,
      label: bookingLabel(b),
      daySeq: Number(b.daySeq) || 0,
      flightDate: b.flightDate || "",
      bookingCode: b.bookingCode || "",
      phone: b.phone || "",
      contactName: b.contactName || "",
      codes: [b.transferCode].filter(Boolean),
      amounts,
      recorded: false,
      createdDate: b.createdAt ? toDateKeyVN(new Date(b.createdAt)) : undefined,
    });
  }

  return out;
}

/**
 * MỌI CHỖ TIỀN CÒN CHỜ, KHÔNG THEO NGÀY.
 *
 * `candidatesForDate` chỉ gom booking LẬP trong ngày hoặc BAY trong ngày. Khách
 * đặt hôm nay, bay tháng sau, chuyển tiền vào một hôm bất kỳ ở giữa thì dòng
 * sao kê hôm đó chẳng có ứng viên nào để dò — treo lại, và kế toán phải nhớ.
 *
 * Danh sách này bù đúng khoảng trống ấy: mọi khoản chuyển khoản CHƯA được kế
 * toán tích "đã nhận", và mọi booking CHƯA KHOÁ còn tiền phải thu — bất kể ngày
 * nào. Đây cũng chính là thứ trả lời câu "cho tôi xem hết mã chưa soát".
 */
async function candidatesOpen(spots: string[]): Promise<BankCandidate[]> {
  const [collects, bookings] = await Promise.all([
    BaobayCollect.find({
      spot: { $in: spots },
      method: "transfer",
      status: { $ne: "rejected" },
      $or: [{ verifiedAt: null }, { verifiedAt: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean<any[]>(),
    BaobayBooking.find({
      spot: { $in: spots },
      status: { $nin: ["voided", "cancelled"] },
      lockedAt: null,
      $or: [
        { remaining: { $gt: 0 } },
        { deposit: { $gt: 0 }, depositVerifiedAt: null },
      ],
    })
      .sort({ flightDate: -1 })
      .limit(500)
      .select("spot daySeq flightDate contactName phone bookingCode deposit remaining totalAmount transferCode createdAt")
      .lean<any[]>(),
  ]);

  const ids = collects.map((c) => c.bookingId).filter(Boolean);
  const linked = ids.length
    ? await BaobayBooking.find({ _id: { $in: ids } })
        .select("spot daySeq flightDate contactName phone bookingCode createdAt")
        .lean<any[]>()
    : [];
  const byId = new Map(linked.map((b) => [String(b._id), b]));

  const out: BankCandidate[] = [];

  for (const c of collects) {
    const b = c.bookingId ? byId.get(String(c.bookingId)) : undefined;
    out.push({
      id: `collect:${String(c._id)}`,
      kind: "collect",
      bookingId: c.bookingId ? String(c.bookingId) : undefined,
      spot: c.spot,
      label: b ? bookingLabel(b) : [c.guestName || c.bookingCode || "khách", spotName(c.spot)].filter(Boolean).join(" · "),
      daySeq: Number(b?.daySeq) || 0,
      flightDate: b?.flightDate || c.date || "",
      bookingCode: c.bookingCode || b?.bookingCode || "",
      phone: b?.phone || "",
      contactName: c.guestName || b?.contactName || "",
      codes: [c.transferCode].filter(Boolean),
      amounts: [c.amount].filter((n) => n > 0),
      recorded: true,
      createdDate: b?.createdAt ? toDateKeyVN(new Date(b.createdAt)) : undefined,
    });
  }

  /** Cọc GÕ TAY (không qua lệnh thu) mới là khoản riêng cần soát — xem chú thích ở candidatesForDate. */
  const bookIds = bookings.map((b) => b._id);
  const linkedCollects = bookIds.length
    ? await BaobayCollect.find({ bookingId: { $in: bookIds } }).select("bookingId amount").lean<any[]>()
    : [];
  const collectedBy = new Map<string, number>();
  for (const c of linkedCollects) {
    const k = String(c.bookingId);
    collectedBy.set(k, (collectedBy.get(k) ?? 0) + (c.amount || 0));
  }

  for (const b of bookings) {
    const created = b.createdAt ? toDateKeyVN(new Date(b.createdAt)) : undefined;
    const manualDeposit = (b.deposit || 0) - (collectedBy.get(String(b._id)) ?? 0);
    if (manualDeposit > 0 && !b.depositVerifiedAt) {
      out.push({
        id: `deposit:${String(b._id)}`,
        kind: "deposit",
        bookingId: String(b._id),
        spot: b.spot,
        label: `${bookingLabel(b)} · cọc`,
        daySeq: Number(b.daySeq) || 0,
        flightDate: b.flightDate || "",
        bookingCode: b.bookingCode || "",
        phone: b.phone || "",
        contactName: b.contactName || "",
        codes: [b.transferCode].filter(Boolean),
        amounts: [manualDeposit],
        recorded: true,
        createdDate: created,
      });
    }
    if (Number(b.remaining) > 0) {
      out.push({
        id: `remaining:${String(b._id)}`,
        kind: "remaining",
        bookingId: String(b._id),
        spot: b.spot,
        label: bookingLabel(b),
        daySeq: Number(b.daySeq) || 0,
        flightDate: b.flightDate || "",
        bookingCode: b.bookingCode || "",
        phone: b.phone || "",
        contactName: b.contactName || "",
        codes: [b.transferCode].filter(Boolean),
        amounts: [...new Set([b.remaining, b.totalAmount].filter((n) => n > 0))],
        recorded: false,
        createdDate: created,
      });
    }
  }

  return out;
}

/**
 * Gộp hai nguồn ứng viên, bỏ trùng theo khoá khoản.
 *
 * Phần đến từ rổ rộng bị đánh dấu `wide` để bộ dò biết mà KHÔNG cho nó khớp
 * bằng mỗi số tiền — xem chú thích ở BankCandidate.wide.
 */
function mergeCandidates(narrow: BankCandidate[], wide: BankCandidate[]): BankCandidate[] {
  const seen = new Set(narrow.map((c) => c.id));
  return [...narrow, ...wide.filter((c) => !seen.has(c.id)).map((c) => ({ ...c, wide: true }))];
}

/** Điểm bay tài khoản này được phân — kế toán thường quản cả ba. */
function spotsOf(session: BaobaySession & { viaAdmin?: boolean }): string[] {
  if (session.viaAdmin) return [...SPOT_IDS];
  const spots = (session.spots ?? []).map(normalizeSpot);
  return spots.length ? [...new Set(spots)] : [...SPOT_IDS];
}

/** Kế toán lọc theo MỘT điểm hay xem cả ba — nhưng không vượt quá quyền được phân. */
function resolveSpots(session: BaobaySession, filter?: string[]): string[] {
  const allowed = spotsOf(session);
  const wanted = (filter ?? []).map(normalizeSpot).filter((x) => allowed.includes(x));
  return wanted.length ? [...new Set(wanted)] : allowed;
}

/* ================================================================== */
/* Chạy soát / đọc kết quả / xử khoản treo                             */
/* ================================================================== */

function lineKey(raw: string): string {
  return createHash("sha1").update(raw.replace(/\s+/g, " ").trim().toLowerCase()).digest("hex");
}

function toLineDTO(doc: any): BankLineDTO {
  return {
    id: String(doc._id),
    raw: doc.raw,
    amount: doc.amount ?? 0,
    bankDate: doc.bankDate ?? "",
    bankTime: doc.bankTime ?? "",
    checkDate: doc.checkDate,
    status: doc.status,
    matchLevel: doc.matchLevel,
    matchWhy: doc.matchWhy,
    matchLabel: doc.matchLabel,
    matchSpot: doc.matchSpot,
    recorded: doc.recorded,
    candidates: doc.candidates ?? [],
    resolvedNote: doc.resolvedNote,
    resolvedBy: doc.resolvedBy,
  };
}

/** Đổ kết quả dò vào các trường của bản ghi dòng sao kê. */
function matchFields(entry: BankEntry, candidates: BankCandidate[]) {
  const m = matchBankEntry(entry, candidates);
  if (m.status === "matched") {
    return {
      status: "matched" as const,
      matchLevel: m.level,
      matchWhy: m.why,
      refId: m.hit.id,
      bookingId:
        m.hit.bookingId && mongoose.Types.ObjectId.isValid(m.hit.bookingId) ? m.hit.bookingId : undefined,
      matchSpot: m.hit.spot,
      matchLabel: m.hit.label,
      recorded: m.hit.recorded,
      candidates: [],
    };
  }
  if (m.status === "multi" || m.status === "suggest") {
    // "suggest" = dấu hiệu yếu (tên giống): treo lại nhưng ghi rõ nghi cho ai
    // — giao diện in danh sách này ngay trong dòng nên hai luồng nằm cạnh nhau.
    return {
      status: "pending" as const,
      matchWhy: m.why,
      candidates: m.hits.map((h) => `${h.label} (${h.amounts.map((n) => n.toLocaleString("vi-VN")).join("/")}đ)`),
    };
  }
  return { status: "pending" as const, candidates: [] };
}

/**
 * Dán sao kê và soát: bóc từng khoản tiền vào, dò, rồi LƯU từng dòng.
 * Dòng đã có (dán lại) thì giữ nguyên kết luận cũ trừ khi nó còn đang treo.
 */
export async function runBankCheck(
  session: BaobaySession,
  date: string,
  text: string,
  spotsFilter?: string[],
): Promise<BankCheckReport> {
  await connectDB();
  if (!isDateKey(date)) throw new BaobayError("Ngày soát không hợp lệ", 400);
  if (!String(text ?? "").trim()) throw new BaobayError("Chưa dán nội dung sao kê", 400);

  const spots = resolveSpots(session, spotsFilter);
  const entries = parseBankStatement(text);
  const skipped: string[] = [];

  /**
   * Ứng viên = khoản của ĐÚNG NGÀY dòng sao kê + MỌI khoản còn treo bất kể ngày.
   *
   * Chỉ dò theo ngày thì tiền khách chuyển trước ngày bay cả tuần không có chỗ
   * nào để khớp: hôm chuyển tiền, booking đó vừa không được lập vừa không bay.
   */
  const [openPool, settled] = await Promise.all([candidatesOpen(spots), settledRefIds()]);
  const cache = new Map<string, BankCandidate[]>();
  const forDate = async (d: string) => {
    let c = cache.get(d);
    if (!c) {
      // Khoản đã chốt bị rút khỏi vòng dò — dòng MỚI không được gán vào nữa
      c = stillOpen(mergeCandidates(await candidatesForDate(spots, d), openPool), settled);
      cache.set(d, c);
    }
    return c;
  };

  for (const entry of entries) {
    if (entry.amount <= 0) {
      skipped.push(`Không đọc được số tiền: "${entry.raw.slice(0, 120)}"`);
      continue;
    }
    if (entry.outgoing) {
      skipped.push(`Tiền CHI ra, không soát: "${entry.raw.slice(0, 120)}"`);
      continue;
    }

    const key = lineKey(entry.raw);
    const existed = await BaobayBankLine.findOne({ key }).lean<any>();
    /** Đã khớp hoặc kế toán đã kết luận tay thì không đè — dán lại là chuyện thường. */
    if (existed && existed.status !== "pending") continue;

    /**
     * CÙNG MỘT GIAO DỊCH, KHÁC ĐỊNH DẠNG CHỮ. Hôm trước dán SMS, hôm sau dán
     * bản sao kê xuất tháng: cùng khoản tiền nhưng câu chữ khác nên khoá nội
     * dung khác nhau — thành hai dòng, tiền bị đếm hai lần. Cùng SỐ TIỀN + cùng
     * NGÀY + cùng GIỜ PHÚT với một dòng đã chốt thì gần như chắc chắn là một
     * giao dịch — bỏ qua và nói rõ, không lưu. Chỉ so khi cả hai bên có đủ
     * ngày giờ; thiếu giờ thì không dám (một ngày hai khoản 500k là thường).
     */
    if (!existed && entry.bankDate && entry.bankTime) {
      const twin = await BaobayBankLine.findOne({
        key: { $ne: key },
        amount: entry.amount,
        bankDate: entry.bankDate,
        bankTime: entry.bankTime,
        status: { $ne: "pending" },
      })
        .select("matchLabel")
        .lean<any>();
      if (twin) {
        skipped.push(
          `Trùng giao dịch ĐÃ SOÁT (cùng ${entry.bankDate} ${entry.bankTime} · ${entry.amount.toLocaleString("vi-VN")}đ${twin.matchLabel ? ` — đã khớp ${twin.matchLabel}` : ""}), bỏ qua: "${entry.raw.slice(0, 90)}"`,
        );
        continue;
      }
    }

    const target = isDateKey(entry.bankDate) ? entry.bankDate : date;
    const fields = matchFields(entry, await forDate(target));

    await BaobayBankLine.findOneAndUpdate(
      { key },
      {
        $set: { raw: entry.raw, amount: entry.amount, bankDate: entry.bankDate, bankTime: entry.bankTime, ...fields },
        $setOnInsert: {
          key,
          checkDate: date,
          createdByUsername: session.username,
          createdByName: session.name,
        },
      },
      { upsert: true },
    );
  }

  /**
   * PASS 2 — GHÉP THEO SỐ LƯỢNG: khách đặt 2-3 booking Y HỆT nhau (đặt hộ
   * người nhà) rồi chuyển 2-3 lần cùng số tiền. Từng dòng một thì máy phân
   * vân (nhiều booking cùng số), nhưng đếm cả ngày: N dòng cùng số tiền và
   * đúng N booking chưa ai nhận cùng số đó thì ghép 1-1 được.
   */
  for (const target of new Set(
    (await BaobayBankLine.find({ checkDate: date, status: "pending" }).select("bankDate").lean<any[]>()).map((l) =>
      isDateKey(l.bankDate) ? l.bankDate : date,
    ),
  )) {
    /**
     * Ghép theo SỐ LƯỢNG chỉ được dùng ứng viên của ĐÚNG NGÀY. Đưa cả rổ rộng
     * vào đây thì một dòng 900.000 sẽ bị ghép với một khoản 900.000 nào đó của
     * người dưng cách đấy hai tuần — đã xảy ra đúng thế lúc chạy thử.
     */
    await allocateByCount(date, target, (await forDate(target)).filter((c) => !c.wide), settled);
  }

  const report = await getBankCheck(session, date, spotsFilter);
  return { ...report, skipped };
}

/**
 * Ghép các dòng treo "nhiều booking cùng số tiền" khi SỐ LƯỢNG khớp 1-1.
 * Chỉ ghép khi số dòng treo cùng mệnh giá ĐÚNG BẰNG số booking chưa nhận —
 * lệch một là để nguyên cho người soát, máy không đoán.
 */
/**
 * Các khoản ĐÃ CHỐT — không được nhận thêm dòng sao kê MỚI nào nữa:
 *  - khoản đã có dòng sao kê khớp (bất kể ngày soát nào);
 *  - lệnh thu kế toán đã bấm "Đã nhận" (verifiedAt);
 *  - phần cọc gõ tay đã xác nhận (depositVerifiedAt).
 *
 * Vì sao phải nhớ: một lệnh thu 2.590.000 đã khớp + xác nhận hôm trước, hôm sau
 * dán tràng sao kê mới có một khoản 2.590.000 của KHÁCH KHÁC — không loại khoản
 * cũ ra thì máy lại gán dòng mới vào đúng lệnh đã chốt, một lệnh ăn hai dòng
 * tiền và tiền của khách sau mất dấu.
 *
 * Chỉ áp cho khoản "collect"/"deposit" (một khoản = một dòng tiền). Khoản
 * "remaining" vẫn được nhận nhiều dòng — khách chia nhiều lần chuyển là hợp lệ,
 * thẻ booking đã có phép cộng tự cân.
 */
async function settledRefIds(): Promise<Set<string>> {
  const [lines, collects, deposits] = await Promise.all([
    BaobayBankLine.find({ status: { $ne: "pending" }, refId: { $nin: [null, ""] } })
      .select("refId")
      .lean<any[]>(),
    BaobayCollect.find({ verifiedAt: { $ne: null } }).select("_id").lean<any[]>(),
    BaobayBooking.find({ depositVerifiedAt: { $ne: null } }).select("_id").lean<any[]>(),
  ]);
  const set = new Set<string>();
  for (const l of lines) if (l.refId) set.add(String(l.refId));
  for (const c of collects) set.add(`collect:${String(c._id)}`);
  for (const b of deposits) set.add(`deposit:${String(b._id)}`);
  return set;
}

/** Lọc ứng viên còn NHẬN ĐƯỢC dòng mới — xem chú thích settledRefIds. */
function stillOpen(candidates: BankCandidate[], settled: Set<string>): BankCandidate[] {
  return candidates.filter((c) => c.kind === "remaining" || !settled.has(c.id));
}

async function allocateByCount(checkDate: string, bankDate: string, candidates: BankCandidate[], settled?: Set<string>): Promise<void> {
  const dayLines = await BaobayBankLine.find({ checkDate }).sort({ bankTime: 1, createdAt: 1 }).lean<any[]>();
  // Khoá trong ngày + khoá TOÀN CỤC (dòng của ngày soát khác đã trỏ về khoản đó)
  const claimed = new Set(dayLines.filter((l) => l.status !== "pending" && l.refId).map((l) => l.refId as string));
  for (const r of settled ?? []) claimed.add(r);

  const pendingByAmount = new Map<number, any[]>();
  for (const l of dayLines) {
    const target = isDateKey(l.bankDate) ? l.bankDate : checkDate;
    if (l.status !== "pending" || !(l.amount > 0) || target !== bankDate) continue;
    (pendingByAmount.get(l.amount) ?? pendingByAmount.set(l.amount, []).get(l.amount)!).push(l);
  }

  for (const [amount, lines] of pendingByAmount) {
    const free = dedupeByBooking(candidates.filter((c) => c.amounts.includes(amount))).filter(
      (c) => !claimed.has(c.id),
    );
    if (free.length === 0 || free.length !== lines.length) continue;
    for (let i = 0; i < lines.length; i++) {
      const hit = free[i];
      claimed.add(hit.id);
      await BaobayBankLine.updateOne(
        { _id: lines[i]._id },
        {
          $set: {
            status: "matched",
            matchLevel: "amount",
            matchWhy: `trùng số tiền — ${lines.length} khoản giống hệt nhau ghép với ${lines.length} booking cùng số (khoản ${i + 1}/${lines.length})`,
            refId: hit.id,
            bookingId: hit.bookingId && mongoose.Types.ObjectId.isValid(hit.bookingId) ? hit.bookingId : undefined,
            matchSpot: hit.spot,
            matchLabel: hit.label,
            recorded: hit.recorded,
            candidates: [],
          },
        },
      );
    }
  }
}

/** Bảng soát của một ngày + mọi khoản còn treo + đối chiếu ngược với app. */
export async function getBankCheck(
  session: BaobaySession,
  date: string,
  spotsFilter?: string[],
): Promise<BankCheckReport> {
  await connectDB();
  if (!isDateKey(date)) throw new BaobayError("Ngày soát không hợp lệ", 400);

  const spots = resolveSpots(session, spotsFilter);
  const [lineDocs, pendingDocs, candidates] = await Promise.all([
    BaobayBankLine.find({ checkDate: date }).sort({ createdAt: 1 }).lean<any[]>(),
    BaobayBankLine.find({ status: "pending", checkDate: { $ne: date } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean<any[]>(),
    candidatesForDate(spots, date),
  ]);

  /**
   * Khoản app đã ghi trong ngày — dòng sao kê nào (bất kỳ ngày soát nào) trỏ về
   * là "đã thấy". So cả theo BOOKING chứ không chỉ theo khoá khoản: tiền về lúc
   * app chưa ghi thu thì dòng sao kê khớp vào "còn thu" của booking; sau đó
   * nhân viên mới ghi lệnh thu — hai khoá khác nhau nhưng vẫn là một dòng tiền.
   */
  const recorded = candidates.filter((c) => c.recorded);
  const recordedIds = new Set(recorded.map((c) => c.id));
  const bookingIds = recorded.map((c) => c.bookingId).filter(Boolean);
  const seenDocs = await BaobayBankLine.find({
    status: { $ne: "pending" },
    $or: [
      { refId: { $in: [...recordedIds] } },
      ...(bookingIds.length ? [{ bookingId: { $in: bookingIds } }] : []),
    ],
  })
    .select("refId bookingId amount")
    .lean<any[]>();
  /**
   * MỖI DÒNG SAO KÊ chỉ "nhìn thấy" ĐÚNG MỘT khoản app: booking có hai lệnh
   * thu mà mới một dòng tiền về thì chỉ một lệnh được tích ✓, lệnh kia phải
   * đỏ. Dòng trỏ thẳng khoản nào nhận khoản đó; dòng khớp qua booking (lúc
   * app chưa ghi thu) thì nhận MỘT khoản chưa ai giữ — ưu tiên đúng số tiền.
   */
  const claimedRefs = new Set<string>();
  for (const d of seenDocs) {
    if (d.refId && recordedIds.has(d.refId)) claimedRefs.add(d.refId as string);
  }
  for (const d of seenDocs) {
    if (d.refId && recordedIds.has(d.refId)) continue;
    if (!d.bookingId) continue;
    const free = recorded.filter((c) => c.bookingId === String(d.bookingId) && !claimedRefs.has(c.id));
    const hit = free.find((c) => (c.amounts[0] ?? 0) === (d.amount || 0)) ?? free[0];
    if (hit) claimedRefs.add(hit.id);
  }

  /**
   * NHÓM CHIA BILL: các dòng sao kê đã khớp về CÙNG MỘT BOOKING — in công
   * thức cộng "1.000.000 + 2.000.000 = 3.000.000 · cần 3.000.000 ✓" để kế
   * toán nhìn một dòng biết đủ hay thiếu bill nào chưa về.
   */
  const expectedByBooking = new Map<string, { label: string; recorded: number; remaining: number }>();
  for (const c of candidates) {
    const key = c.bookingId || c.id;
    const cur = expectedByBooking.get(key) ?? { label: c.label, recorded: 0, remaining: 0 };
    if (c.recorded) cur.recorded += c.amounts[0] ?? 0;
    else cur.remaining = Math.max(cur.remaining, c.amounts[0] ?? 0);
    expectedByBooking.set(key, cur);
  }
  const byBooking = new Map<string, any[]>();
  for (const l of lineDocs) {
    if (l.status === "pending") continue;
    const key = (l.bookingId && String(l.bookingId)) || l.refId;
    if (!key) continue;
    (byBooking.get(key) ?? byBooking.set(key, []).get(key)!).push(l);
  }
  const groups: BankGroupDTO[] = [...byBooking.entries()]
    .map(([key, ls]) => {
      const parts = ls.map((l) => l.amount as number);
      const total = parts.reduce((t, n) => t + n, 0);
      const exp = expectedByBooking.get(key);
      // Cần nhận = số app đã ghi cho booking này; chưa ghi gì thì lấy số còn thu
      const expected = exp ? exp.recorded || exp.remaining : 0;
      return {
        label: ls[0].matchLabel || exp?.label || "booking",
        parts,
        total,
        expected,
        status: (total === expected ? "du" : total < expected ? "thieu" : "thua") as BankGroupDTO["status"],
      };
    })
    /**
     * Đáng hiện: chia nhiều bill (soát công thức cộng) HOẶC tiền về chưa
     * khớp số cần — "mới ghi nhận 2.590.000, còn thiếu 2.590.000" phải kêu
     * lên cả khi mới có một dòng tiền về.
     */
    .filter((g) => g.parts.length >= 2 || (g.expected > 0 && g.status !== "du"))
    .sort((a, b) => (a.status === "du" ? 1 : 0) - (b.status === "du" ? 1 : 0));

  /** Trạng thái từng khoản: đã "ĐÃ NHẬN" chưa (lệnh thu / cọc gõ tay) + booking đã khoá chưa. */
  const collectIds = recorded.filter((c) => c.kind === "collect").map((c) => c.id.split(":")[1]);
  const verifiedCollects = collectIds.length
    ? await BaobayCollect.find({ _id: { $in: collectIds } })
        .select("verifiedAt")
        .lean<any[]>()
    : [];
  const verifiedSet = new Set(verifiedCollects.filter((d) => d.verifiedAt).map((d) => `collect:${String(d._id)}`));
  const lockDocs = bookingIds.length
    ? await BaobayBooking.find({ _id: { $in: bookingIds } })
        .select("lockedAt depositVerifiedAt")
        .lean<any[]>()
    : [];
  const lockedSet = new Set(lockDocs.filter((d) => d.lockedAt).map((d) => String(d._id)));
  for (const d of lockDocs) if (d.depositVerifiedAt) verifiedSet.add(`deposit:${String(d._id)}`);

  /** Khoản TIỀN MẶT đã thu trong ngày — cho kế toán tích "Đã nhận" từng khoản. */
  const cashDocs = await BaobayCollect.find({ spot: { $in: spots }, date, method: "cash", status: "collected" })
    .lean<any[]>();
  const cashBookingIds = cashDocs.map((c) => c.bookingId).filter(Boolean);
  const cashBookings = cashBookingIds.length
    ? await BaobayBooking.find({ _id: { $in: cashBookingIds } })
        .select("daySeq contactName bookingCode phone flightDate spot lockedAt")
        .lean<any[]>()
    : [];
  const cashBookingById = new Map(cashBookings.map((b) => [String(b._id), b]));
  const appCash: BankAppCashDTO[] = cashDocs
    .map((c) => {
      const b = c.bookingId ? cashBookingById.get(String(c.bookingId)) : undefined;
      return {
        refId: `collect:${String(c._id)}`,
        bookingId: c.bookingId ? String(c.bookingId) : undefined,
        daySeq: Number(b?.daySeq) || 0,
        label: b ? bookingLabel(b) : c.guestName || c.bookingCode || "khách",
        amount: c.amount || 0,
        by: c.collectorName || c.createdByName || "",
        spot: c.spot,
        verified: Boolean(c.verifiedAt),
        locked: Boolean(b?.lockedAt),
      };
    })
    .sort((a, b) => (a.daySeq || 999) - (b.daySeq || 999) || a.label.localeCompare(b.label));

  /**
   * Đối chiếu tổng: tiền VÀO trên sao kê ↔ khoản CK app ghi nhận trong ngày.
   * Danh sách XẾP THEO SỐ BOOKING — kế toán soát lần lượt từ #1 trở đi.
   */
  const appTransfers = recorded
    .map((c) => ({
      refId: c.id,
      bookingId: c.bookingId,
      daySeq: c.daySeq,
      label: c.label,
      amount: c.amounts[0] ?? 0,
      code: c.codes[0] ?? "",
      spot: c.spot,
      source: c.kind === "collect" ? "lệnh thu CK" : "cọc lúc nhập booking",
      // "Đã nhận" bằng tay là lệnh QUYỀN CAO NHẤT — coi như đã soát, khỏi đòi sao kê
      seen: claimedRefs.has(c.id) || verifiedSet.has(c.id),
      verified: verifiedSet.has(c.id),
      locked: Boolean(c.bookingId && lockedSet.has(c.bookingId)),
    }))
    .sort((a, b) => (a.daySeq || 999) - (b.daySeq || 999) || a.label.localeCompare(b.label));
  const bankTotal = lineDocs.reduce((t, l) => t + (l.amount || 0), 0);
  const appTotal = appTransfers.reduce((t, x) => t + x.amount, 0);

  /* ---------- SỔ BOOKING & TIỀN TRONG NGÀY ---------- */
  const rowBookingIds = new Set<string>();
  for (const t of appTransfers) if (t.bookingId) rowBookingIds.add(t.bookingId);
  for (const c of appCash) if (c.bookingId) rowBookingIds.add(c.bookingId);
  for (const l of lineDocs) if (l.bookingId) rowBookingIds.add(String(l.bookingId));

  const rowBookings = rowBookingIds.size
    ? await BaobayBooking.find({ _id: { $in: [...rowBookingIds] } })
        .select(
          "spot daySeq flightDate contactName phone bookingCode guestCount ppgGuests flightKind flycam video360 redFlag sunset flagFlight totalAmount remaining discount note agencyPaidAmount agencyName deposit refundedTotal transferCode depositVerifiedAt status ticketIssuedAt noTicketFlight lockedAt",
        )
        .lean<any[]>()
    : [];

  /**
   * TRỌN LỊCH SỬ THANH TOÁN của từng booking — mọi ngày, không chỉ ngày soát.
   * Khách cọc 500k hôm kia + CK 2.390k hôm qua thì thẻ phải kể đủ hai khoản,
   * kèm tích ✓ kế toán đã "nhận" từng khoản chưa. Trước đây thẻ chỉ nhìn
   * khoản của đúng ngày soát nên booking trả tiền hôm khác trông như 0 đồng.
   */
  const histCollects = rowBookingIds.size
    ? await BaobayCollect.find({
        bookingId: { $in: [...rowBookingIds] },
        status: { $in: ["collected", "company"] },
      })
        .select("bookingId method amount transferCode date spot collectorName createdByName verifiedAt")
        .lean<any[]>()
    : [];
  const histRefIds = [
    ...histCollects.map((c) => `collect:${String(c._id)}`),
    ...[...rowBookingIds].map((id) => `deposit:${id}`),
  ];
  /** Dòng sao kê (bất kỳ ngày soát nào) đã trỏ về các khoản/booking này. */
  const histSeenDocs = rowBookingIds.size
    ? await BaobayBankLine.find({
        status: { $ne: "pending" },
        $or: [{ refId: { $in: histRefIds } }, { bookingId: { $in: [...rowBookingIds] } }],
      })
        .select("refId bookingId amount")
        .lean<any[]>()
    : [];
  const histSeenRefs = new Set(histSeenDocs.map((d) => d.refId).filter(Boolean));
  const histSeenByBooking = new Map<string, Set<number>>();
  for (const d of histSeenDocs) {
    if (!d.bookingId) continue;
    const k = String(d.bookingId);
    (histSeenByBooking.get(k) ?? histSeenByBooking.set(k, new Set()).get(k)!).add(d.amount || 0);
  }

  /** "3 khách PG · 1 PPG · 2×flycam · 1×360" — dòng tóm tắt kế toán liếc một giây. */
  const summaryOf = (b: any): string => {
    const parts: string[] = [];
    const pg = (b.guestCount || 0) - (b.ppgGuests || 0);
    if (pg > 0) parts.push(`${pg} khách ${b.flightKind === "pg" || b.flightKind === "ppg" ? "PG" : String(b.flightKind ?? "PG").toUpperCase()}`);
    if (b.ppgGuests > 0) parts.push(`${b.ppgGuests} PPG`);
    if (b.flycam > 0) parts.push(`${b.flycam}×flycam`);
    if (b.video360 > 0) parts.push(`${b.video360}×360`);
    if (b.redFlag > 0) parts.push(`${b.redFlag}×cờ đỏ`);
    if (b.sunset > 0) parts.push(`${b.sunset}×hoàng hôn`);
    if (b.flagFlight > 0) parts.push(`${b.flagFlight}×kéo cờ`);
    return parts.join(" · ") || `${b.guestCount || 0} khách`;
  };

  /** Lệnh thêm/bớt dịch vụ ĐÃ BỊ BỎ — đếm theo booking để hiện vết trên thẻ soát. */
  const undoneRows = rowBookingIds.size
    ? await BaobayServiceChange.aggregate([
        { $match: { bookingId: { $in: [...rowBookingIds].map((x) => new mongoose.Types.ObjectId(x)) }, undoneAt: { $ne: null } } },
        { $group: { _id: "$bookingId", n: { $sum: 1 } } },
      ])
    : [];
  const undoneByBooking = new Map<string, number>(undoneRows.map((r: any) => [String(r._id), Number(r.n) || 0]));

  const lineDTOs = lineDocs.map(toLineDTO);
  const pendingToday = lineDTOs.filter((l) => l.status === "pending");

  /**
   * MỌI DÒNG SAO KÊ của các booking đang hiện, bất kể ngày soát.
   *
   * Booking 5.000.000 mà khách chuyển bốn lần 900k + 500k + 2.000k + 1.500k —
   * bốn lần đó thường rơi vào bốn ngày sao kê khác nhau. Chỉ đọc dòng của ngày
   * đang xem thì cộng ra 900k và tưởng khách còn nợ 4.100.000.
   */
  const histLineDocs = rowBookingIds.size
    ? await BaobayBankLine.find({
        bookingId: { $in: [...rowBookingIds].map((x) => new mongoose.Types.ObjectId(x)) },
        status: { $ne: "pending" },
      })
        .sort({ bankDate: 1, createdAt: 1 })
        .lean<any[]>()
    : [];
  const histLinesByBooking = new Map<string, any[]>();
  for (const l of histLineDocs) {
    const k = String(l.bookingId);
    (histLinesByBooking.get(k) ?? histLinesByBooking.set(k, []).get(k)!).push(l);
  }
  const bookingRows: BankBookingRowDTO[] = rowBookings
    .map((b) => {
      const id = String(b._id);
      const label = bookingLabel(b);
      return {
        bookingId: id,
        daySeq: Number(b.daySeq) || 0,
        spot: b.spot,
        label,
        summary: summaryOf(b),
        totalAmount: b.totalAmount || 0,
        remaining: Math.max(0, b.remaining || 0),
        discount: b.discount || 0,
        overpaid: Math.max(
          0,
          (b.deposit || 0) + (b.agencyPaidAmount || 0) - (b.totalAmount || 0) - (b.refundedTotal || 0),
        ),
        undoneChanges: undoneByBooking.get(id) ?? 0,
        note: b.note || "",
        agencyPaidAmount: b.agencyPaidAmount || 0,
        agencyName: b.agencyName || "",
        contactName: b.contactName || "",
        phone: b.phone || "",
        bookingCode: b.bookingCode || "",
        flightDate: b.flightDate || "",
        status: b.status || "open",
        flown: b.status === "done",
        ticketIssued: Boolean(b.ticketIssuedAt),
        noTicket: Boolean(b.noTicketFlight),
        locked: Boolean(b.lockedAt),
        transfers: (() => {
          const mine = histCollects.filter((c) => String(c.bookingId) === id);
          const out: BankAppTransferDTO[] = mine
            .filter((c) => c.method === "transfer")
            .map((c) => ({
              refId: `collect:${String(c._id)}`,
              bookingId: id,
              daySeq: Number(b.daySeq) || 0,
              label,
              amount: c.amount || 0,
              code: c.transferCode || "",
              spot: c.spot,
              source: `lệnh thu CK · ${formatDateKeyVN(c.date)}`,
              seen:
                histSeenRefs.has(`collect:${String(c._id)}`) ||
                (histSeenByBooking.get(id)?.has(c.amount || 0) ?? false) ||
                Boolean(c.verifiedAt),
              verified: Boolean(c.verifiedAt),
              locked: Boolean(b.lockedAt),
            }));
          // Cọc GÕ TAY lúc nhập booking = deposit trừ phần các lệnh thu đã đại diện
          const manualDeposit = (b.deposit || 0) - mine.reduce((t, c) => t + (c.amount || 0), 0);
          if (manualDeposit > 0) {
            out.unshift({
              refId: `deposit:${id}`,
              bookingId: id,
              daySeq: Number(b.daySeq) || 0,
              label,
              amount: manualDeposit,
              code: b.transferCode || "",
              spot: b.spot,
              source: "cọc lúc nhập booking",
              seen:
                histSeenRefs.has(`deposit:${id}`) ||
                (histSeenByBooking.get(id)?.has(manualDeposit) ?? false) ||
                Boolean(b.depositVerifiedAt),
              verified: Boolean(b.depositVerifiedAt),
              locked: Boolean(b.lockedAt),
            });
          }
          return out;
        })(),
        cash: histCollects
          .filter((c) => String(c.bookingId) === id && c.method === "cash")
          .map((c) => ({
            refId: `collect:${String(c._id)}`,
            bookingId: id,
            daySeq: Number(b.daySeq) || 0,
            label,
            amount: c.amount || 0,
            by: `${c.collectorName || c.createdByName || ""} · ${formatDateKeyVN(c.date)}`,
            spot: c.spot,
            verified: Boolean(c.verifiedAt),
            locked: Boolean(b.lockedAt),
          })),
        lines: (histLinesByBooking.get(id) ?? []).map(toLineDTO),
        // Dòng treo mà danh sách nghi ngờ có nhắc đúng nhãn booking này
        suggests: pendingToday.filter((l) => (l.candidates ?? []).some((c) => c.startsWith(label))),
        ...(() => {
          /**
           * TỰ CÂN: cộng mọi dòng sao kê đã trỏ về booking, so với tổng tiền
           * booking sau khi trừ tiền mặt và phần đại lý đang giữ hộ. Ra ngay
           * "đã về 4.900.000 / cần 5.000.000 · còn thiếu 100.000".
           */
          const bankTotal = (histLinesByBooking.get(id) ?? []).reduce((t, l) => t + (Number(l.amount) || 0), 0);
          const paidCash = histCollects
            .filter((c) => String(c.bookingId) === id && c.method === "cash" && c.status === "collected")
            .reduce((t, c) => t + (c.amount || 0), 0);
          /**
           * Booking cũ (trước bản tính tiền) không lưu totalAmount — lấy 0 làm
           * tổng thì "cần 0đ" và mọi đồng về đều thành "về DƯ", kế toán hoảng
           * oan (bắt được thật với #4 MILEKHINA 13/08: đủ 6.180.000 mà báo dư
           * 6.180.000). Thiếu tổng thì ước bằng cọc + còn thu — cọc là tổng dồn
           * các khoản đã ghi nên cọc + còn thu ≈ tổng tiền.
           */
          const totalNeed = (b.totalAmount || 0) > 0 ? b.totalAmount : (b.deposit || 0) + (b.remaining || 0);
          const need = Math.max(0, totalNeed - paidCash - (b.agencyPaidAmount || 0));
          return {
            bankTotal,
            bankNeed: need,
            bankShort: Math.max(0, need - bankTotal),
            bankOver: Math.max(0, bankTotal - need),
          };
        })(),
      };
    })
    .sort((a, b) => (a.daySeq || 999) - (b.daySeq || 999) || a.label.localeCompare(b.label));

  /**
   * Danh sách SOÁT TRÀN: mọi khoản CK chưa được tích "đã nhận", bất kể ngày.
   * Kèm dòng sao kê đã trỏ về khoản đó (nếu có) để kế toán khỏi phải đi tìm.
   */
  const openNow = await candidatesOpen(spots);
  const matchedLines = await BaobayBankLine.find({
    status: "matched",
    refId: { $in: openNow.map((c) => c.id) },
  })
    .select("refId raw bankDate matchWhy")
    .lean<any[]>();
  const lineByRef = new Map(matchedLines.map((l) => [String(l.refId), l]));

  const unchecked: BankUncheckedDTO[] = openNow.map((c) => {
    const l = lineByRef.get(c.id);
    return {
      refId: c.id,
      kind: c.kind,
      bookingId: c.bookingId,
      spot: c.spot,
      label: c.label,
      daySeq: c.daySeq || 0,
      contactName: c.contactName || "",
      phone: c.phone || "",
      bookingCode: c.bookingCode || "",
      flightDate: c.flightDate,
      createdDate: c.createdDate,
      amount: Math.max(...c.amounts.filter((n) => n > 0), 0),
      code: c.codes[0] ?? "",
      recorded: c.recorded,
      matchedLine: l
        ? { id: String(l._id), raw: String(l.raw), bankDate: String(l.bankDate ?? ""), why: String(l.matchWhy ?? "") }
        : undefined,
    };
  });

  return {
    date,
    spots,
    lines: lineDTOs,
    pending: pendingDocs.map(toLineDTO),
    appTransfers,
    appCash,
    groups,
    bookingRows,
    unchecked,
    summary: {
      bankTotal,
      bankCount: lineDocs.length,
      appTotal,
      appCount: appTransfers.length,
      diffAmount: bankTotal - appTotal,
      diffCount: lineDocs.length - appTransfers.length,
    },
    skipped: [],
  };
}

/** Danh sách khoản của MỘT NGÀY để kế toán chỉ định tay dòng sao kê lạc chủ. */
export async function listAssignOptions(
  session: BaobaySession,
  date: string,
  spotsFilter?: string[],
): Promise<Array<{ refId: string; label: string; amount: number }>> {
  await connectDB();
  if (!isDateKey(date)) throw new BaobayError("Ngày không hợp lệ", 400);
  const spots = resolveSpots(session, spotsFilter);
  const candidates = await candidatesForDate(spots, date);
  return dedupeByBooking(candidates).map((c) => ({
    refId: c.id,
    label: `${c.label}${c.kind === "remaining" ? " · còn thu" : c.kind === "deposit" ? " · cọc" : " · lệnh thu"}`,
    amount: c.amounts[0] ?? 0,
  }));
}

/**
 * KẾ TOÁN CHỈ ĐỊNH: dòng sao kê máy không khớp được thì người chỉ thẳng nó
 * thuộc khoản nào (chọn ngày + chọn khoản). Ghi như một kết luận tay có địa
 * chỉ — bảng soát và thẻ booking nhận ra ngay.
 */
export async function assignBankLine(
  session: BaobaySession,
  id: string,
  refId: string,
  date: string,
): Promise<void> {
  await connectDB();
  if (!isDateKey(date)) throw new BaobayError("Ngày không hợp lệ", 400);
  const spots = resolveSpots(session, undefined);
  const candidates = await candidatesForDate(spots, date);
  const hit = candidates.find((c) => c.id === refId);
  if (!hit) throw new BaobayError("Không thấy khoản được chỉ định — kiểm lại ngày", 404);

  const r = await BaobayBankLine.updateOne(
    { _id: id },
    {
      $set: {
        status: "manual",
        matchLevel: "manual",
        matchWhy: `kế toán chỉ định (${formatDateKeyVN(date)})`,
        refId: hit.id,
        bookingId: hit.bookingId && mongoose.Types.ObjectId.isValid(hit.bookingId) ? hit.bookingId : undefined,
        matchSpot: hit.spot,
        matchLabel: hit.label,
        recorded: hit.recorded,
        resolvedNote: `chỉ định: ${hit.label}`,
        resolvedBy: session.name || session.username,
        candidates: [],
      },
    },
  );
  if (!r.matchedCount) throw new BaobayError("Không thấy dòng sao kê này", 404);
}

/**
 * SOÁT LẠI mọi khoản còn treo: nhân viên vừa nhập thêm booking / ghi thêm mã GD
 * thì bấm một phát, khoản nào tìm được chủ sẽ tự chuyển sang "khớp".
 */
export async function recheckBankPending(
  session: BaobaySession,
  date: string,
  spotsFilter?: string[],
): Promise<BankCheckReport> {
  await connectDB();
  const spots = resolveSpots(session, spotsFilter);
  const pending = await BaobayBankLine.find({ status: "pending" }).lean<any[]>();
  const settled = await settledRefIds();

  const cache = new Map<string, BankCandidate[]>();
  for (const doc of pending) {
    const target = isDateKey(doc.bankDate) ? doc.bankDate : doc.checkDate;
    let candidates = cache.get(target);
    if (!candidates) {
      candidates = stillOpen(await candidatesForDate(spots, target), settled);
      cache.set(target, candidates);
    }
    const entry: BankEntry = {
      raw: doc.raw,
      amount: doc.amount ?? 0,
      outgoing: false,
      bankDate: doc.bankDate ?? "",
      bankTime: doc.bankTime ?? "",
    };
    const fields = matchFields(entry, candidates);
    // Vẫn treo thì chỉ cập nhật danh sách ứng viên phân vân, giữ nguyên trạng thái
    await BaobayBankLine.updateOne({ _id: doc._id }, { $set: fields });
  }

  // Ghép nốt các dòng treo "cùng số tiền" theo SỐ LƯỢNG cho từng ngày còn treo
  const dates = new Set(pending.map((l) => (isDateKey(l.bankDate) ? l.bankDate : l.checkDate)));
  for (const target of dates) {
    let candidates = cache.get(target);
    if (!candidates) {
      candidates = stillOpen(await candidatesForDate(spots, target), settled);
      cache.set(target, candidates);
    }
    for (const cd of new Set(pending.filter((l) => (isDateKey(l.bankDate) ? l.bankDate : l.checkDate) === target).map((l) => l.checkDate))) {
      await allocateByCount(cd, target, candidates, settled);
    }
  }

  return getBankCheck(session, date, spotsFilter);
}

/**
 * KHOÁ BOOKING sau khi soát — máy tự kiểm ba điều kiện trước:
 *  1. Booking đã tích ĐÃ BAY.
 *  2. Thu đủ: cọc + các khoản thanh toán = tổng phải trả (hết nợ).
 *  3. Mọi khoản tiền (CK, TM, cọc gõ tay) đều đã được "Đã nhận".
 * Đủ cả ba thì khoá NGAY không hỏi lại. Thiếu điều nào trả về danh sách
 * cảnh báo — kế toán vẫn được "Tôi hiểu & vẫn khoá" bằng cờ force.
 */
export async function lockBookingChecked(
  session: BaobaySession,
  bookingId: string,
  force: boolean,
): Promise<{ locked: boolean; warnings: string[] }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const booking = await BaobayBooking.findById(bookingId).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);
  if (booking.lockedAt) return { locked: true, warnings: [] };

  const vnd = (n: number) => `${(n || 0).toLocaleString("vi-VN")} đ`;
  const collects = await BaobayCollect.find({ bookingId })
    .select("method amount status transferCode collectorName verifiedAt")
    .lean<any[]>();
  const active = collects.filter((c) => c.status === "company" || c.status === "collected");

  const warnings: string[] = [];
  if (booking.status !== "done") {
    warnings.push("Booking CHƯA tích ĐÃ BAY — còn chờ bay hoặc chưa ai tích");
  }
  if ((booking.remaining ?? 0) > 0) {
    warnings.push(
      `Thu tổng CHƯA ĐỦ: đã thu ${vnd(booking.deposit)} / cần ${vnd(booking.totalAmount)} — còn nợ ${vnd(booking.remaining)}`,
    );
  }
  for (const c of active) {
    if (c.verifiedAt) continue;
    warnings.push(
      c.method === "transfer"
        ? `Khoản CK ${vnd(c.amount)}${c.transferCode ? ` (mã ${c.transferCode})` : ""} chưa được "Đã nhận"`
        : `Khoản TM ${vnd(c.amount)}${c.collectorName ? ` (${c.collectorName} giữ)` : ""} chưa được "Đã nhận"`,
    );
  }
  const manualDeposit = (booking.deposit || 0) - active.reduce((t, c) => t + (c.amount || 0), 0);
  if (manualDeposit > 0 && !booking.depositVerifiedAt) {
    warnings.push(`Cọc gõ tay ${vnd(manualDeposit)} chưa được "Đã nhận"`);
  }

  if (warnings.length > 0 && !force) return { locked: false, warnings };
  await setBookingLock(session, booking.spot, bookingId, true);
  return { locked: true, warnings: [] };
}

/**
 * Kế toán bấm "ĐÃ NHẬN" (hoặc bỏ đánh dấu) một khoản tiền — lệnh thu
 * ("collect:<id>") hay phần cọc gõ tay ("deposit:<bookingId>"). KHÔNG khoá
 * booking: khách cọc trước cho ngày tương lai thì điều phối vẫn phải thao
 * tác tiếp được; khoá là nút riêng.
 */
export async function confirmBankItem(session: BaobaySession, refId: string, on: boolean): Promise<void> {
  await connectDB();
  const [kind, id] = String(refId ?? "").split(":");
  if (!mongoose.Types.ObjectId.isValid(id ?? "")) throw new BaobayError("Khoản không hợp lệ", 400);

  let bookingId: string | undefined;
  if (kind === "collect") {
    const doc = await BaobayCollect.findByIdAndUpdate(
      id,
      on
        ? { $set: { verifiedAt: new Date(), verifiedBy: session.name || session.username } }
        : { $set: { verifiedAt: null, verifiedBy: "" } },
      { new: true },
    ).lean<any>();
    if (!doc) throw new BaobayError("Không tìm thấy khoản này", 404);
    bookingId = doc.bookingId ? String(doc.bookingId) : undefined;
  } else if (kind === "deposit") {
    const doc = await BaobayBooking.findByIdAndUpdate(
      id,
      on
        ? { $set: { depositVerifiedAt: new Date(), depositVerifiedBy: session.name || session.username } }
        : { $set: { depositVerifiedAt: null, depositVerifiedBy: "" } },
      { new: true },
    ).lean<any>();
    if (!doc) throw new BaobayError("Không tìm thấy booking", 404);
    bookingId = String(doc._id);
  } else {
    throw new BaobayError("Khoản không hợp lệ", 400);
  }

  if (bookingId) await rollupBookingChecks(bookingId);
}

/**
 * Dồn cờ TÍCH XANH của một booking từ các khoản đã "Đã nhận":
 *  - ✓CK khi MỌI lệnh thu chuyển khoản đã nhận, và phần cọc gõ tay (nếu có)
 *    cũng đã nhận.
 *  - ✓TM khi có ít nhất một khoản tiền mặt và tất cả đều đã nhận.
 * Gọi lại mỗi lần đánh dấu — cờ chỉ là bản dồn, sự thật nằm ở từng khoản.
 */
async function rollupBookingChecks(bookingId: string): Promise<void> {
  const booking = await BaobayBooking.findById(bookingId).select("deposit depositVerifiedAt").lean<any>();
  if (!booking) return;
  const collects = await BaobayCollect.find({ bookingId })
    .select("method amount status verifiedAt")
    .lean<any[]>();
  const tx = collects.filter((c) => c.method === "transfer" && c.status !== "rejected");
  const cash = collects.filter((c) => c.method === "cash" && c.status === "collected");
  // Cọc gõ tay = deposit trừ phần các lệnh thu đã đại diện (cùng cách tính với bảng soát)
  const manualDeposit = (booking.deposit || 0) - collects.reduce((t, c) => t + (c.amount || 0), 0);

  const ckDone =
    (tx.length > 0 || manualDeposit > 0) &&
    tx.every((c) => c.verifiedAt) &&
    (manualDeposit <= 0 || Boolean(booking.depositVerifiedAt));
  const tmDone = cash.length > 0 && cash.every((c) => c.verifiedAt);

  await BaobayBooking.updateOne(
    { _id: bookingId },
    { $set: { ckCheckedAt: ckDone ? new Date() : null, tmCheckedAt: tmDone ? new Date() : null } },
  );
}

/** Kế toán kết luận tay một khoản treo (đã kiểm sao kê/gọi khách xong). */
export async function resolveBankLine(session: BaobaySession, id: string, note: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Khoản không hợp lệ", 400);
  const r = await BaobayBankLine.updateOne(
    { _id: id },
    {
      $set: {
        status: "manual",
        matchLevel: "manual",
        resolvedNote: note.trim(),
        resolvedBy: session.name,
        resolvedAt: new Date(),
      },
    },
  );
  if (!r.matchedCount) throw new BaobayError("Không tìm thấy khoản này", 404);
}

/**
 * GỠ dòng sao kê khỏi khoản nó đang khớp — trả về trạng thái TREO để kế toán
 * chỉ định lại (hoặc bấm "Soát lại" cho máy dò lại bằng luật mới).
 *
 * Khác deleteBankLine: dòng tiền là THẬT, chỉ khớp sai chỗ — xoá đi là mất dấu
 * một khoản tiền đã về. Sinh ra từ vụ 6 sao kê của 6 khách lạ bị hút về một
 * booking vì trùng đuôi số tài khoản công ty (23/08).
 */
export async function detachBankLine(id: string): Promise<void> {
  await connectDB();
  const r = await BaobayBankLine.updateOne(
    { _id: id },
    {
      $set: { status: "pending", matchWhy: "kế toán gỡ khỏi khoản khớp nhầm", candidates: [] },
      $unset: { matchLevel: "", refId: "", bookingId: "", matchSpot: "", matchLabel: "", recorded: "" },
    },
  );
  if (!r.matchedCount) throw new BaobayError("Không tìm thấy dòng sao kê này", 404);
}

/** Xoá một dòng dán nhầm (không phải tiền khách, dán lộn tài khoản khác…). */
export async function deleteBankLine(id: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Khoản không hợp lệ", 400);
  const r = await BaobayBankLine.deleteOne({ _id: id });
  if (!r.deletedCount) throw new BaobayError("Không tìm thấy khoản này", 404);
}
