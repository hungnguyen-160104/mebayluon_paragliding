// models/BaobayRefund.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * LỆNH HOÀN TIỀN cho khách (huỷ bay, huỷ dịch vụ, thu nhầm).
 *
 * Tách bảng riêng vì hoàn tiền có ĐUÔI, không xong ngay như một dòng số:
 *  - HOÀN TIỀN MẶT: người trực rút ví trả tại bãi ⇒ xong ngay, nhưng phải trừ
 *    vào phần tiền họ đang giữ, không thì cuối ngày họ nộp thiếu mà không hiểu.
 *  - HOÀN CHUYỂN KHOẢN: tiền ra từ TK công ty, người trực không tự làm được ⇒
 *    lệnh nằm CHỜ ở trang kế toán; kế toán chuyển xong mới bấm xác nhận kèm mã
 *    giao dịch. Chỉ khi đó mới tính là công ty đã chi.
 *
 * Giữ cả `usedServices` (khách đã dùng gì) và `usedFee` (thu lại bao nhiêu) để
 * sau này mở ra còn biết vì sao hoàn thiếu hơn số khách đã trả.
 */
export interface IBaobayRefund {
  spot: string;
  /** Ngày bay của booking — hoàn tiền thuộc về ngày đó, không phải ngày bấm. */
  date: string;
  bookingId?: mongoose.Types.ObjectId;
  guestName: string;
  bookingCode?: string;
  guests: number;
  /** Số khách đã thanh toán trước đó — mốc để soát tiền hoàn. */
  paid: number;
  /** Dịch vụ khách đã dùng (chữ tự do) và phí thu lại của phần đó. */
  usedServices?: string;
  usedFee: number;
  amount: number;
  method: "cash" | "transfer";
  /** Số tài khoản khách nhận — chỉ cần khi hoàn chuyển khoản. */
  bankAccount?: string;
  /** "done" tự trả tiền mặt xong · "pending" chờ kế toán chuyển · "paid" đã chuyển. */
  status: "done" | "pending" | "paid" | "voided";
  reason?: string;
  note?: string;
  createdByUsername: string;
  createdByName: string;
  paidAt?: Date;
  paidBy?: string;
  transferCode?: string;
  sheetSynced: boolean;
  sheetError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RefundSchema = new Schema<IBaobayRefund>(
  {
    spot: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking", index: true },
    guestName: { type: String, default: "" },
    bookingCode: String,
    guests: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    usedServices: String,
    usedFee: { type: Number, default: 0 },
    amount: { type: Number, default: 0, min: 0 },
    method: { type: String, enum: ["cash", "transfer"], required: true },
    bankAccount: String,
    // "voided" = lệnh bị vô hiệu vì booking được "bay lại" trước khi kế toán chuyển
    status: { type: String, enum: ["done", "pending", "paid", "voided"], default: "pending", index: true },
    reason: String,
    note: String,
    createdByUsername: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    paidAt: Date,
    paidBy: String,
    transferCode: String,
    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

RefundSchema.index({ spot: 1, date: 1, status: 1 });

export const BaobayRefund =
  (mongoose.models.BaobayRefund as mongoose.Model<IBaobayRefund>) ||
  mongoose.model<IBaobayRefund>("BaobayRefund", RefundSchema);
