// models/CafeSale.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * MỘT PHIẾU BÁN (hoặc MỘT KHOẢN CHI) của quầy cafe.
 *
 * Sinh ra ở MÁY BÁN HÀNG (Sunmi cầm tay) — máy có thể MẤT MẠNG lúc bán, nên
 * bản ghi được xếp hàng trong máy rồi đẩy lên khi có mạng lại. Hai hệ quả đổ
 * vào thiết kế:
 *
 *  1. `clientId` là KHOÁ CHỐNG TRÙNG: mạng chập chờn làm máy gửi lại cùng một
 *     phiếu nhiều lần là chuyện chắc chắn xảy ra — upsert theo clientId thì
 *     gửi mấy lần vẫn chỉ một bản ghi, tiền không bị đếm đôi.
 *  2. `soldAt` là giờ BẤM BÁN tại máy (không phải giờ máy chủ nhận) — phiếu
 *     bán 10 giờ sáng lúc mất mạng, 3 giờ chiều mới đẩy lên, vẫn phải nằm
 *     trong doanh thu buổi sáng. `date` suy từ soldAt theo giờ Việt Nam.
 */
export interface ICafeSale {
  clientId: string;
  counter: string;
  /** "YYYY-MM-DD" theo giờ VN, suy từ soldAt — mọi phép cộng ngày bám cột này. */
  date: string;
  kind: "sale" | "expense";
  /** Với kind "expense": tiền VÀO tay người trực ("thu") hay ra ("chi"). */
  direction: "thu" | "chi";
  items: Array<{ id: string; name: string; note?: string; price: number; qty: number }>;
  /** Tiền hàng TRƯỚC giảm giá — giữ lại để biết phiếu đáng lẽ thu bao nhiêu. */
  subtotal: number;
  /** Mức giảm đã bấm: "none" · "staff" (phi công/người nhà −20%) · "diplomatic" (−100%). */
  discountKind: string;
  discountAmount: number;
  /** Tiền THỰC THU = subtotal − discountAmount. */
  total: number;
  method: "cash" | "transfer" | "free";
  /** Số phiếu nước miễn phí trong phiếu này — cột "số khách uống nước". */
  freeTickets: number;
  note: string;
  soldAt: Date;
  byUsername: string;
  byName: string;
  /** Máy chủ nhận lúc nào — lệch xa soldAt nghĩa là phiếu từng nằm chờ mạng. */
  syncedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CafeSaleSchema = new Schema<ICafeSale>(
  {
    clientId: { type: String, required: true, unique: true },
    counter: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    kind: { type: String, enum: ["sale", "expense"], required: true },
    direction: { type: String, enum: ["thu", "chi"], default: "chi" },
    items: [{ _id: false, id: String, name: String, note: String, price: Number, qty: Number }],
    subtotal: { type: Number, default: 0 },
    discountKind: { type: String, default: "none" },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    method: { type: String, enum: ["cash", "transfer", "free"], default: "cash" },
    freeTickets: { type: Number, default: 0 },
    note: { type: String, default: "" },
    soldAt: { type: Date, required: true },
    byUsername: { type: String, default: "" },
    byName: { type: String, default: "" },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
CafeSaleSchema.index({ date: 1, counter: 1 });

export const CafeSale =
  mongoose.models.CafeSale || mongoose.model<ICafeSale>("CafeSale", CafeSaleSchema);
