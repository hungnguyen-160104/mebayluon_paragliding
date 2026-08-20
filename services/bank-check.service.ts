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
import { formatDateKeyVN, isDateKey } from "@/lib/baobay/date";
import { SPOT_IDS, normalizeSpot, spotName } from "@/lib/baobay/spots";
import type { BaobaySession } from "@/lib/baobay/token";
import { connectDB } from "@/lib/mongodb";
import { BaobayBankLine } from "@/models/BaobayBankLine.model";
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
      .select("spot daySeq flightDate contactName phone bookingCode deposit transferCode")
      .lean<any[]>(),
    BaobayBooking.find({ spot: { $in: spots }, flightDate: date, status: { $ne: "voided" } })
      .select("spot daySeq flightDate contactName phone bookingCode deposit remaining totalAmount transferCode")
      .lean<any[]>(),
  ]);

  /** Booking đứng sau các lệnh thu — để lệnh thu cũng khớp được bằng "2508 k3"/SĐT. */
  const ids = collects.map((c) => c.bookingId).filter(Boolean);
  const linked = ids.length
    ? await BaobayBooking.find({ _id: { $in: ids } })
        .select("spot daySeq flightDate contactName phone bookingCode")
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
    });
  }

  return out;
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

  /** Ứng viên theo từng ngày: dòng sao kê mang ngày khác thì dò theo ngày ấy. */
  const cache = new Map<string, BankCandidate[]>();
  const forDate = async (d: string) => {
    let c = cache.get(d);
    if (!c) {
      c = await candidatesForDate(spots, d);
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
    await allocateByCount(date, target, await forDate(target));
  }

  const report = await getBankCheck(session, date, spotsFilter);
  return { ...report, skipped };
}

/**
 * Ghép các dòng treo "nhiều booking cùng số tiền" khi SỐ LƯỢNG khớp 1-1.
 * Chỉ ghép khi số dòng treo cùng mệnh giá ĐÚNG BẰNG số booking chưa nhận —
 * lệch một là để nguyên cho người soát, máy không đoán.
 */
async function allocateByCount(checkDate: string, bankDate: string, candidates: BankCandidate[]): Promise<void> {
  const dayLines = await BaobayBankLine.find({ checkDate }).sort({ bankTime: 1, createdAt: 1 }).lean<any[]>();
  const claimed = new Set(dayLines.filter((l) => l.status !== "pending" && l.refId).map((l) => l.refId as string));

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

  return {
    date,
    spots,
    lines: lineDocs.map(toLineDTO),
    pending: pendingDocs.map(toLineDTO),
    appTransfers,
    appCash,
    groups,
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

  const cache = new Map<string, BankCandidate[]>();
  for (const doc of pending) {
    const target = isDateKey(doc.bankDate) ? doc.bankDate : doc.checkDate;
    let candidates = cache.get(target);
    if (!candidates) {
      candidates = await candidatesForDate(spots, target);
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
      candidates = await candidatesForDate(spots, target);
      cache.set(target, candidates);
    }
    for (const cd of new Set(pending.filter((l) => (isDateKey(l.bankDate) ? l.bankDate : l.checkDate) === target).map((l) => l.checkDate))) {
      await allocateByCount(cd, target, candidates);
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

/** Xoá một dòng dán nhầm (không phải tiền khách, dán lộn tài khoản khác…). */
export async function deleteBankLine(id: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Khoản không hợp lệ", 400);
  const r = await BaobayBankLine.deleteOne({ _id: id });
  if (!r.deletedCount) throw new BaobayError("Không tìm thấy khoản này", 404);
}
