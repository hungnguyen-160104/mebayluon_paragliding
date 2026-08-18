// models/OtaEmail.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * Thư đặt chỗ của OTA (Klook, GYG…) mà Gmail đẩy về app.
 *
 * Giữ NGUYÊN VĂN phần chữ của thư để còn lần vết khi số liệu vênh — mẫu thư của
 * OTA đổi bất kỳ lúc nào, có bản gốc thì sửa bộ bóc dữ liệu rồi chạy lại được.
 * Không lưu tệp đính kèm.
 *
 * Khoá `gmailId` là mã thư của Gmail: chạy lại bao nhiêu lần cũng không nhân đôi.
 */
export interface IOtaEmail {
  ota: string;
  gmailId: string;
  subject: string;
  body: string;
  /** Địa chỉ người gửi — để lần vết và để đoán OTA khi script không gửi kèm. */
  from?: string;
  receivedAt?: Date;
  /** "new" | "cancel" | "amend" | "unknown" */
  kind: string;
  /** Mã booking của OTA đọc được trong thư. */
  ref?: string;
  spot?: string;
  /**
   * Hộp thư đã gửi thư này về — "" là hộp chung mebayluon@gmail.com, "sapa" là
   * hộp riêng sapa.paragliding@gmail.com. Khay của Khau Phạ / Hà Nội lọc theo
   * đây để không bao giờ lẫn thư của hộp Sa Pa.
   */
  mailboxSpot?: string;
  /** "applied" đã vào lịch · "review" cần người soát · "ignored" bỏ qua. */
  status: string;
  /** Việc app đã làm với thư này — hiện cho người soát đọc. */
  result?: string;
  bookingId?: mongoose.Types.ObjectId;
  /** Bản nháp đã bóc (ngày mới, số khách…) — để người duyệt xem trước khi áp. */
  draft?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const OtaEmailSchema = new Schema<IOtaEmail>(
  {
    ota: { type: String, required: true, index: true },
    gmailId: { type: String, required: true, unique: true },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    from: String,
    receivedAt: Date,
    kind: { type: String, default: "unknown", index: true },
    ref: { type: String, index: true },
    spot: String,
    mailboxSpot: { type: String, default: "" },
    status: { type: String, default: "review", index: true },
    result: String,
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking" },
    draft: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const OtaEmail =
  (mongoose.models.OtaEmail as mongoose.Model<IOtaEmail>) ||
  mongoose.model<IOtaEmail>("OtaEmail", OtaEmailSchema);
