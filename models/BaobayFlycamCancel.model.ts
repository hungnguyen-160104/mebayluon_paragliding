// models/BaobayFlycamCancel.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * HUỶ FLYCAM vì lỗi vận hành — máy hỏng, gió to, quay ra hình không dùng được.
 *
 * Tách bảng riêng thay vì sửa vào báo cáo ngày, vì đây là việc có ĐUÔI: khách
 * phải được hoàn tiền, mà tiền hoàn đi hai đường khác hẳn nhau —
 *   - "self"    : đội trả ngay tại bãi bằng tiền mặt đang cầm ⇒ trừ luôn vào
 *                 tiền phi công bay kèm đang giữ, xong việc trong ngày.
 *   - "company" : khách đã về, phải chuyển khoản ⇒ tạo LỆNH CHỜ cho kế toán,
 *                 kế toán chuyển xong mới bấm xác nhận kèm mã giao dịch.
 *
 * Giữ cả hai loại trong một bảng để cuối tháng cộng được "mất bao nhiêu tiền vì
 * hỏng flycam", không phải đi nhặt từng chỗ.
 */
export interface IBaobayFlycamCancel {
  spot: string;
  /** Ngày bay của chuyến bị huỷ flycam ("YYYY-MM-DD"). */
  date: string;
  /** Mã vé flycam bị huỷ — mối nối duy nhất về chuyến bay đã xảy ra. */
  ticketCode: string;
  /** Phi công bay kèm khách này (người giữ tiền của khách). */
  pilotUsername: string;
  pilotName: string;
  /** Booking tra được từ mã vé — có thì lưu, không có cũng không chặn. */
  bookingId?: mongoose.Types.ObjectId;
  bookingLabel?: string;
  reason: string;
  /** "self" tự hoàn tại bãi · "company" nhờ công ty chuyển khoản. */
  refundMode: "self" | "company";
  amount: number;
  /** Số tài khoản khách nhận tiền — chỉ dùng cho đường "company". */
  bankAccount?: string;
  /** "done" xong ngay (tự hoàn) · "pending" chờ kế toán · "paid" kế toán đã chuyển. */
  status: "done" | "pending" | "paid";
  createdByUsername: string;
  createdByName: string;
  /** Kế toán xác nhận đã chuyển tiền. */
  paidAt?: Date;
  paidBy?: string;
  transferCode?: string;
  sheetSynced: boolean;
  sheetError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const FlycamCancelSchema = new Schema<IBaobayFlycamCancel>(
  {
    spot: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    ticketCode: { type: String, default: "", index: true },
    pilotUsername: { type: String, default: "", index: true },
    pilotName: { type: String, default: "" },
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking" },
    bookingLabel: String,
    reason: { type: String, default: "" },
    refundMode: { type: String, enum: ["self", "company"], required: true },
    amount: { type: Number, default: 0, min: 0 },
    bankAccount: String,
    status: { type: String, enum: ["done", "pending", "paid"], default: "pending", index: true },
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

FlycamCancelSchema.index({ spot: 1, date: 1, status: 1 });

export const BaobayFlycamCancel =
  (mongoose.models.BaobayFlycamCancel as mongoose.Model<IBaobayFlycamCancel>) ||
  mongoose.model<IBaobayFlycamCancel>("BaobayFlycamCancel", FlycamCancelSchema);
