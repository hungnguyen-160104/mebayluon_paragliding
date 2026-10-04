// models/BaobayPayPick.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * LƯỢT CHỌN TÀI KHOẢN TẠM cho booking CHƯA LƯU (chủ 04/10 vòng 3).
 *
 * Nhân viên bấm QR ngay trên form booking mới (chưa lưu) → máy chọn TK công ty
 * hay TK cá nhân NGAY LÚC ĐÓ và đưa mã QR đúng tài khoản. Lượt chọn nằm ở đây,
 * khoá bằng `token`; lúc lưu booking, form gửi token kèm theo và booking nhận
 * đúng tài khoản đã đưa khách (`claimedAt`). Lượt chưa ai nhận vẫn được TÍNH
 * vào phần doanh thu của ngày bay (khỏi bốc trùng), hết hạn thì tự xoá (TTL).
 */
export interface IBaobayPayPick {
  token: string;
  spot: string;
  flightDate: string;
  account: "personal" | "company";
  /** Doanh thu CK ước tính lúc chọn — cộng vào phần của ngày khi chưa có booking. */
  amount: number;
  why: string;
  createdByUsername: string;
  expiresAt: Date;
  claimedAt?: Date;
  bookingId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const BaobayPayPickSchema = new Schema<IBaobayPayPick>(
  {
    token: { type: String, required: true, unique: true },
    spot: { type: String, required: true },
    flightDate: { type: String, required: true },
    account: { type: String, enum: ["personal", "company"], required: true },
    amount: { type: Number, default: 0 },
    why: { type: String, default: "" },
    createdByUsername: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    claimedAt: Date,
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking" },
  },
  { timestamps: true },
);

// Hết hạn mà chưa ai nhận thì Mongo tự xoá; lượt đã nhận giữ lại để lần vết
BaobayPayPickSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { claimedAt: { $exists: false } } });
BaobayPayPickSchema.index({ spot: 1, flightDate: 1 });

export const BaobayPayPick =
  mongoose.models.BaobayPayPick || mongoose.model<IBaobayPayPick>("BaobayPayPick", BaobayPayPickSchema);
