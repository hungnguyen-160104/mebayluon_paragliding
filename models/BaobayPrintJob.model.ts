// models/BaobayPrintJob.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * HÀNG ĐỢI IN VÉ (chủ 12/09: "làm cho chạy được cả trên iPhone, và setup một
 * lần là sau này không phải cài lại").
 *
 * iPhone không có Web Bluetooth lẫn WebUSB nên không nói chuyện trực tiếp với
 * máy in được. Cách chạy được trên MỌI máy: một TRẠM IN ở quầy (điện thoại /
 * máy tính bảng Android ghép Bluetooth với máy in một lần, mở trang
 * /baocao/tram-in và để đó). Máy nào bấm IN VÉ thì lệnh vào bảng này, trạm
 * nhận lệnh, in, rồi báo xong. Người bấm thấy "đã gửi tới trạm in".
 */
export interface IBaobayPrintJob {
  spot: string;
  bookingId: mongoose.Types.ObjectId;
  bookingLabel: string;
  status: "queued" | "printing" | "done" | "failed";
  /** Lý do in lại (nếu là in lại); lần đầu để trống. */
  reason: string;
  createdByUsername: string;
  createdByName: string;
  takenAt?: Date;
  doneAt?: Date;
  stationName?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrintJobSchema = new Schema<IBaobayPrintJob>(
  {
    spot: { type: String, required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, required: true, index: true },
    bookingLabel: { type: String, default: "" },
    status: { type: String, enum: ["queued", "printing", "done", "failed"], default: "queued", index: true },
    reason: { type: String, default: "" },
    createdByUsername: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    takenAt: Date,
    doneAt: Date,
    stationName: String,
    error: String,
  },
  { timestamps: true },
);
PrintJobSchema.index({ spot: 1, status: 1, createdAt: 1 });

export const BaobayPrintJob =
  (mongoose.models.BaobayPrintJob as mongoose.Model<IBaobayPrintJob>) ||
  mongoose.model<IBaobayPrintJob>("BaobayPrintJob", PrintJobSchema);
