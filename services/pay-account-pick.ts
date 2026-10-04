// services/pay-account-pick.ts
/**
 * MÁY CHỌN TÀI KHOẢN NHẬN TIỀN cho booking (chủ 04/10/2026) — phần chạm DB.
 *
 * Tách khỏi services/pay-account.service.ts để services/baobay.service.ts
 * gọi được lúc LẬP booking mà không dính vòng import (pay-account.service cần
 * toBookingDTO của baobay.service). Tệp này chỉ đọc model + lib thuần.
 *
 * Luật và mọi con số: lib/baobay/pay-account.ts (COMPANY_ACCOUNT_RULES).
 */
import { randomInt } from "node:crypto";

import {
  COMPANY_ACCOUNT_RULES,
  companyChance,
  transferValueOf,
  createdAfterStart,
  isOtaPrepaid,
  payAccountSpotEnabled,
  type PayAccountKind,
  type PayAccountSource,
} from "@/lib/baobay/pay-account";
import { BaobayBooking } from "@/models/BaobayBooking.model";

export type PayAccountPick = { account: PayAccountKind; source: PayAccountSource; why: string };

/** Thông tin tối thiểu để chọn — đủ cho cả booking đang lập lẫn bản ghi đã có. */
export type PickInput = {
  spot: string;
  flightDate: string;
  createdAt?: Date | string | null;
  status?: string;
  source?: string;
  otaRef?: string;
  otaName?: string;
  agencyPaidAmount?: number;
  /** Tổng tiền booking — doanh thu để cân 30% (booking đang lập: số máy chủ vừa tính). */
  totalAmount?: number;
  refundedTotal?: number;
  deposit?: number;
  depositMethod?: string;
  collectedLog?: Array<{ method?: string; amount?: number; toAccount?: string }>;
  /** Form chưa lưu đã đưa mã QR TK cá nhân. */
  qrShown?: boolean;
  payAccount?: string | null;
};

/** Booking này có thuộc diện máy chọn không (chưa xét đã chốt hay chưa). */
export function pickEligible(b: PickInput): boolean {
  if (!payAccountSpotEnabled(b.spot)) return false;
  if (!createdAfterStart(b.createdAt)) return false;
  if (b.status === "voided" || b.status === "cancelled") return false;
  return !isOtaPrepaid(b);
}

/**
 * DOANH THU CK của NGÀY BAY (từ mốc áp dụng, không tính OTA/booking bỏ/huỷ) đã
 * chốt tài khoản, và phần ở TK công ty. Tính theo tiền HIỆN TẠI của booking.
 */
export async function dayRevenueTally(
  spot: string,
  flightDate: string,
): Promise<{ decidedValue: number; companyValue: number; decided: number; company: number }> {
  const rows = await BaobayBooking.find({
    spot,
    flightDate,
    status: { $nin: ["voided", "cancelled"] },
    createdAt: { $gte: new Date(COMPANY_ACCOUNT_RULES.startAt) },
    payAccount: { $in: ["personal", "company"] },
  })
    .select("payAccount totalAmount agencyPaidAmount deposit depositMethod refundedTotal collectedLog")
    .lean<any[]>();
  let decidedValue = 0;
  let companyValue = 0;
  let company = 0;
  for (const b of rows) {
    const v = transferValueOf(b);
    decidedValue += v;
    if (b.payAccount === "company") {
      companyValue += v;
      company++;
    }
  }
  return { decidedValue, companyValue, decided: rows.length, company };
}

/** Số ngẫu nhiên [0,1) từ nguồn mật mã — không ai đoán trước lượt bốc. */
function roll(): number {
  return randomInt(0, 1_000_000) / 1_000_000;
}

/**
 * CHỌN tài khoản. Trả `null` = không thuộc diện (Hà Nội, OTA, booking cũ trước
 * mốc, đã chốt rồi) — nơi gọi KHÔNG ghi gì, booking giữ TK cá nhân như cũ.
 *
 * Thứ tự:
 *  1. Đã có tiền CHUYỂN KHOẢN → đi theo tài khoản của khoản đó (`deposit`).
 *     Chưa ghi tài khoản thì là TK cá nhân: trước khi máy chọn, mã QR / số TK
 *     duy nhất từng đưa khách là TK cá nhân.
 *  2. Form chưa lưu đã đưa QR TK cá nhân → TK cá nhân (`qr`).
 *  3. Bốc thăm có trọng số (`auto`): chưa cọc gì (trả MỘT lần CK) ưu tiên cao,
 *     đã cọc tiền mặt ưu tiên thấp; xác suất kéo phần DOANH THU CK của ngày bay
 *     về 30%, đoàn lớn làm ngày vượt 35% thì hạ xác suất (companyChance).
 */
export async function pickPayAccount(b: PickInput): Promise<PayAccountPick | null> {
  if (b.payAccount === "company" || b.payAccount === "personal") return null;
  if (!pickEligible(b)) return null;

  const R = COMPANY_ACCOUNT_RULES;
  const transfers = (b.collectedLog ?? []).filter((c) => c?.method === "transfer" && (Number(c.amount) || 0) > 0);
  const depositTransfer = b.depositMethod === "transfer" && (Number(b.deposit) || 0) > 0;
  if (transfers.length || depositTransfer) {
    const toCompany = transfers.some((c) => c.toAccount === "company");
    return {
      account: toCompany ? "company" : "personal",
      source: "deposit",
      why: toCompany ? "đã có CK vào TK công ty" : "đã có CK (cọc) vào TK cá nhân",
    };
  }
  if (b.qrShown) return { account: "personal", source: "qr", why: "đã đưa QR TK cá nhân trước khi lưu booking" };

  const paidCash =
    (b.depositMethod === "cash" && (Number(b.deposit) || 0) > 0) ||
    (b.collectedLog ?? []).some((c) => c?.method === "cash" && (Number(c.amount) || 0) > 0);
  const weight = paidCash ? R.weightCashDeposit : R.weightOneTransfer;
  const tally = await dayRevenueTally(b.spot, b.flightDate);
  const amount = transferValueOf(b);
  const chance = companyChance({ decidedValue: tally.decidedValue, companyValue: tally.companyValue, amount, weight });
  const company = roll() < chance;
  return {
    account: company ? "company" : "personal",
    source: "auto",
    why: `bốc thăm ${Math.round(chance * 100)}% — booking ${Math.round(amount / 1000)}k CK; ngày ${b.flightDate} TK cty ${Math.round(tally.companyValue / 1000)}k/${Math.round(tally.decidedValue / 1000)}k (${tally.decidedValue ? Math.round((tally.companyValue / tally.decidedValue) * 100) : 0}%)${paidCash ? ", đã cọc TM" : ", trả một lần CK"}`,
  };
}

/** Trường ghi vào booking khi đã chọn. */
export function pickFields(p: PayAccountPick, by = "máy") {
  const at = new Date();
  return {
    payAccount: p.account,
    payAccountSource: p.source,
    payAccountAt: at,
    payAccountBy: by,
  };
}

/**
 * CHỐT tài khoản cho một booking ĐÃ CÓ mà chưa chốt (lần đầu đưa QR / ghi CK).
 * Ghi có điều kiện `payAccount` còn trống — hai máy cùng bấm thì chỉ một lượt
 * thắng, lượt kia đọc lại kết quả. Trả về tài khoản đang dùng sau cùng.
 */
export async function ensurePayAccountDoc(doc: any, extra?: { qrShown?: boolean }): Promise<PayAccountKind> {
  if (doc?.payAccount === "company" || doc?.payAccount === "personal") return doc.payAccount;
  const p = await pickPayAccount({ ...doc, qrShown: extra?.qrShown });
  if (!p) return "personal";
  const res = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, payAccount: { $in: [null, ""] } },
    {
      $set: pickFields(p),
      $push: { payAccountLog: { at: new Date(), by: "máy", from: "", to: p.account, source: p.source, reason: p.why } },
    },
    { new: true },
  )
    .select("payAccount")
    .lean<any>();
  if (res?.payAccount) return res.payAccount;
  const now = await BaobayBooking.findById(doc._id).select("payAccount").lean<any>();
  return now?.payAccount === "company" ? "company" : "personal";
}
