// models/BaobayCollect.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * LỆNH THU TIỀN: kế toán/điều phối chốt lịch với khách, rồi:
 *  - Khách trả TIỀN MẶT tại hiện trường → chỉ định NGƯỜI THU; lệnh chạy về
 *    trang người đó, thu xong bấm "Đã thu tiền" (hoặc Từ chối kèm lý do).
 *  - Khách CHUYỂN KHOẢN vào TK CÔNG TY → ghi nhận ngay kèm mã CK; không ai
 *    cầm tiền cả nên không cần ai xác nhận.
 *
 * Lệnh là DẤU VẾT GIAO VIỆC — tiền thật vẫn ghi vào sổ THU CHI của người thu
 * như mọi khoản khác (một nguồn sự thật, không cộng trùng).
 */

export type CollectStatus = "pending" | "collected" | "rejected" | "company";

export interface IBaobayCollect {
  spot: string;
  /** Ngày lập lệnh, "YYYY-MM-DD" giờ Việt Nam. */
  date: string;

  guestName: string;
  /** Booking sinh ra lệnh thu này (nếu thu qua nút trên booking) — để tra số thứ tự khách. */
  bookingId?: mongoose.Types.ObjectId;
  bookingCode: string;
  /** Đại lý / nguồn khách: Klook, GYG, FB… */
  agency: string;
  guests: number;
  amount: number;

  method: "cash" | "transfer";
  /** CK: tiền vào thẳng TK CÔNG TY. */
  toCompanyAccount: boolean;
  /** Mã giao dịch chuyển khoản. */
  transferCode: string;
  note: string;

  /** TM: người được chỉ định đi thu. */
  collectorUsername?: string;
  collectorName?: string;

  /** pending = chờ thu · collected = đã thu · rejected = từ chối · company = CK về TK công ty. */
  status: CollectStatus;
  /** Kế toán bấm "ĐÃ NHẬN" khi soát: khoản này đã kiểm, tiền đã về đúng chỗ. */
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectedReason?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  createdByUsername: string;
  createdByName: string;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const BaobayCollectSchema = new Schema<IBaobayCollect>(
  {
    spot: { type: String, default: DEFAULT_SPOT, index: true },
    date: { type: String, required: true },

    guestName: { type: String, default: "" },
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking" },
    bookingCode: { type: String, default: "" },
    agency: { type: String, default: "" },
    guests: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },

    method: { type: String, enum: ["cash", "transfer"], default: "cash" },
    toCompanyAccount: { type: Boolean, default: false },
    transferCode: { type: String, default: "" },
    note: { type: String, default: "" },

    collectorUsername: String,
    collectorName: String,

    status: { type: String, enum: ["pending", "collected", "rejected", "company"], default: "pending" },
    verifiedAt: Date,
    verifiedBy: String,
    rejectedReason: String,
    resolvedAt: Date,
    resolvedBy: String,

    createdByUsername: { type: String, required: true },
    createdByName: { type: String, required: true },

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

// Trang nhân sự hỏi "lệnh chờ TÔI thu" mỗi lần mở
BaobayCollectSchema.index({ spot: 1, collectorUsername: 1, status: 1 });

export const BaobayCollect =
  mongoose.models.BaobayCollect || mongoose.model<IBaobayCollect>("BaobayCollect", BaobayCollectSchema);
