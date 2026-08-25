// models/BaobayBankLine.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * MỘT DÒNG SAO KÊ ngân hàng kế toán đã dán vào máy soát chuyển khoản.
 *
 * Lưu lại từng dòng (chứ không chỉ kết quả tổng) vì:
 *  - Dán lại cùng tràng SMS không được nhân đôi — mỗi dòng có `key` (băm nội
 *    dung) làm khoá chống trùng, dán bao nhiêu lần cũng chỉ một bản ghi.
 *  - Khoản CHƯA KHỚP phải treo lại được qua ngày: khách chuyển trước rồi nhân
 *    viên mới nhập booking là chuyện thường — hôm sau bấm "soát lại" là những
 *    khoản treo tự tìm được chủ.
 *
 * KHÔNG có trường `spot`: tiền cả ba điểm bay về CÙNG MỘT tài khoản công ty,
 * sao kê là của tài khoản chứ không của điểm nào. Điểm bay chỉ xuất hiện ở
 * booking được khớp (`matchSpot`).
 */

export type BankLineStatus = "matched" | "pending" | "manual";

export interface IBaobayBankLine {
  /** Băm nội dung dòng (đã dồn khoảng trắng) — chống dán trùng. */
  key: string;
  /** Ngày kế toán soát, "YYYY-MM-DD" giờ Việt Nam. */
  checkDate: string;

  /** Nguyên văn dòng sao kê. */
  raw: string;
  amount: number;
  /** Ngày/giờ đọc được từ chính dòng sao kê (có thể trống). */
  bankDate: string;
  bankTime: string;

  /** matched = máy khớp được · pending = treo chờ · manual = kế toán tự kết luận. */
  status: BankLineStatus;
  /** Khớp bằng gì: mã GD > nội dung > số tiền > AI đề xuất > kế toán tự ghi. */
  matchLevel?: "code" | "note" | "amount" | "ai" | "manual";
  /**
   * MÁY TỰ XÁC NHẬN khoản này — nội dung CK có đủ ngày bay + số thứ tự khách +
   * mã booking VÀ số tiền đúng tuyệt đối (xem isExactHit). Kế toán không phải
   * bấm "Đã nhận" nữa; giữ cờ lại để sau còn lọc ra xem máy đã tự nhận những gì.
   */
  autoConfirmed?: boolean;
  matchWhy?: string;
  /** Khoá ứng viên đã khớp: "collect:<id>" · "deposit:<id>" · "remaining:<id>". */
  refId?: string;
  bookingId?: mongoose.Types.ObjectId;
  matchSpot?: string;
  matchLabel?: string;
  /** false = khớp vào booking nhưng app CHƯA ghi thu khoản này — phải nhắc. */
  recorded?: boolean;
  /** Danh sách ứng viên khi máy PHÂN VÂN (nhiều booking cùng căn cứ). */
  candidates?: string[];

  /** Kế toán kết luận tay cho khoản treo. */
  resolvedNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;

  createdByUsername: string;
  createdByName: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const BaobayBankLineSchema = new Schema<IBaobayBankLine>(
  {
    key: { type: String, required: true, unique: true },
    checkDate: { type: String, required: true, index: true },

    raw: { type: String, required: true },
    amount: { type: Number, default: 0 },
    bankDate: { type: String, default: "" },
    bankTime: { type: String, default: "" },

    status: { type: String, enum: ["matched", "pending", "manual"], default: "pending", index: true },
    matchLevel: { type: String, enum: ["code", "note", "amount", "ai", "manual"] },
    autoConfirmed: Boolean,
    matchWhy: String,
    refId: String,
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking" },
    matchSpot: String,
    matchLabel: String,
    recorded: Boolean,
    candidates: [String],

    resolvedNote: String,
    resolvedBy: String,
    resolvedAt: Date,

    createdByUsername: { type: String, required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true },
);

export const BaobayBankLine =
  mongoose.models.BaobayBankLine || mongoose.model<IBaobayBankLine>("BaobayBankLine", BaobayBankLineSchema);
