// models/BaobaySetting.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * Cấu hình vận hành — MỘT bản ghi cho MỖI ĐIỂM BAY (`key` = mã điểm bay).
 *
 * `submitDeadline` ("HH:mm", giờ Việt Nam): mốc phi công phải CHỐT báo cáo
 * trong ngày. Chốt lần đầu sau mốc này (và có chuyến bay) là bị ghi phạt
 * 200.000đ. Admin đổi giờ ở /admin/baocao và CÓ HIỆU LỰC NGAY: mỗi lần phi
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
  /**
   * BẢNG THỨ HAI của điểm: SỔ TAY do nhân viên gõ tay (Sa Pa —
   * "Bảng theo dõi chuyến bay", mỗi tháng một tab T9-2026…).
   *
   * PHẢI tách khỏi `sheetWebhookUrl` chứ không dùng chung: ô kia đang trỏ vào
   * bảng BÁO BAY của điểm (tab Phi công · Điều phối · Chốt ngày · thẻ từng phi
   * công theo tháng). Dán đè địa chỉ sổ tay lên đó là báo cáo hằng ngày của cả
   * điểm ngừng chảy — hai bảng, hai Apps Script, hai đường riêng.
   *
   * Để trống thì rơi về biến môi trường SAPA_BOOK_SHEET_URL / _SECRET.
   */
  bookSheetWebhookUrl?: string;
  bookSheetSecret?: string;
  /**
   * BẮT BUỘC PHI CÔNG KHAI MÃ VÉ ở điểm này hay không.
   *
   * Chưa đặt (undefined) thì rơi về luật cũ: chỉ Khau Phạ bắt buộc, vì đó là
   * điểm duy nhất có vé 3 liên in mã. Sa Pa sắp có máy in vé — đặt thành công
   * tắc ở đây để hôm bắt đầu phát vé chỉ cần bật lên, không phải sửa mã nguồn
   * rồi deploy lại (luật chủ 07/09).
   */
  requireTicketCodes?: boolean;
  /**
   * THỜI TIẾT của điểm: chỗ cất cánh thật và ngưỡng gió do chủ điểm đặt.
   *
   * Để trong cấu hình điểm chứ không đóng cứng trong mã nguồn vì hai lẽ: chỗ
   * cất cánh có thể dời (Sa Pa còn đang chọn bãi), và ngưỡng an toàn là thứ
   * chủ điểm chỉnh dần theo kinh nghiệm — mỗi lần chỉnh mà phải sửa mã rồi
   * deploy lại thì chẳng ai chỉnh.
   *
   * `huongThuan` là cung hướng gió cất cánh được, [từ, đến] theo chiều kim
   * đồng hồ; null = không xét hướng.
   */
  weather?: {
    lat?: number;
    lon?: number;
    alt?: number;
    ten?: string;
    huongThuan?: [number, number] | null;
    gioXanh?: number;
    gioDo?: number;
    giatDo?: number;
    muaDo?: number;
    tranMayDo?: number;
    /** Khung giờ bay của điểm (giờ trong ngày) — Khau Phạ 9–16. */
    gioBayTu?: number;
    gioBayDen?: number;
  };
  /** Lần gần nhất bấm/chạy "Lấy book từ website & OTA" cho điểm này. */
  webSyncAt?: Date;
  webSyncBy?: string;
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
    bookSheetWebhookUrl: String,
    bookSheetSecret: String,
    requireTicketCodes: { type: Boolean, default: undefined },
    /** `_id: false` — đây là một khối cấu hình, không phải bản ghi con. */
    weather: {
      type: new Schema(
        {
          lat: Number,
          lon: Number,
          alt: Number,
          ten: String,
          huongThuan: { type: [Number], default: undefined },
          gioXanh: Number,
          gioDo: Number,
          giatDo: Number,
          muaDo: Number,
          tranMayDo: Number,
          gioBayTu: Number,
          gioBayDen: Number,
        },
        { _id: false },
      ),
      default: undefined,
    },
    webSyncAt: Date,
    webSyncBy: String,
    updatedBy: String,
  },
  { timestamps: true },
);

export const BaobaySetting =
  (mongoose.models.BaobaySetting as mongoose.Model<IBaobaySetting>) ||
  mongoose.model<IBaobaySetting>("BaobaySetting", BaobaySettingSchema);
