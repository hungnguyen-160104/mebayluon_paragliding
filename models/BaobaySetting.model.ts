// models/BaobaySetting.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * Cấu hình vận hành — MỘT bản ghi cho MỖI ĐIỂM BAY (`key` = mã điểm bay).
 *
 * `submitDeadline` ("HH:mm", giờ Việt Nam): mốc phi công phải CHỐT báo cáo
 * trong ngày. Chốt lần đầu sau mốc này (và có chuyến bay) là bị ghi phạt
 * 200.000đ. Admin đổi giờ ở /admin/baobay và CÓ HIỆU LỰC NGAY: mỗi lần phi
 * công bấm chốt, máy chủ đọc giá trị mới nhất từ đây chứ không cache.
 *
 * Chỉ tính giờ CHỐT, không tính giờ sửa: đã chốt kịp giờ một lần thì sửa lại
 * lúc nào cũng không bị phạt (xem firstSubmittedAt ở PilotDailyReport).
 */
export interface IBaobaySetting {
  /** Mã điểm bay: "ha-noi" | "khau-pha" | "sapa". */
  key: string;
  submitDeadline: string;
  /**
   * Bảng Google Sheets RIÊNG của điểm bay này. Để trống thì rơi về biến môi
   * trường BAOBAY_SHEET_WEBHOOK_URL — giữ cho cấu hình một điểm cũ vẫn chạy.
   *
   * Đặt trong cơ sở dữ liệu thay vì biến môi trường: mở thêm điểm bay là việc
   * của người quản lý, không nên phải sửa Vercel rồi deploy lại mới xong.
   */
  sheetWebhookUrl?: string;
  sheetSecret?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_SUBMIT_DEADLINE = "20:00";

const BaobaySettingSchema = new Schema<IBaobaySetting>(
  {
    key: { type: String, required: true, unique: true },
    submitDeadline: { type: String, default: DEFAULT_SUBMIT_DEADLINE },
    sheetWebhookUrl: String,
    sheetSecret: String,
    updatedBy: String,
  },
  { timestamps: true },
);

export const BaobaySetting =
  (mongoose.models.BaobaySetting as mongoose.Model<IBaobaySetting>) ||
  mongoose.model<IBaobaySetting>("BaobaySetting", BaobaySettingSchema);
