// models/BaobayBookingLog.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * NHẬT KÝ BẤT BIẾN của sổ booking báo bay — chỉ ghi thêm, không sửa, không xoá.
 *
 * Sinh ra từ vụ 02/09/2026: bảy số thứ tự (#3–#9) của một ngày biến mất không
 * vết — không phải huỷ, không phải bỏ sổ, app không có đường xoá cứng, nghĩa
 * là có bàn tay ngoài app hoặc một lỗi chưa lộ mặt. Từ nay MỌI lần tạo/sửa/xoá
 * booking đều để lại một dòng ở đây (collection riêng — xoá booking không xoá
 * được nhật ký của nó), lần sau còn có chỗ mà truy.
 *
 * Hai tầng ghi:
 *  - Middleware ngay trên model (models/BaobayBooking.model.ts): bắt MÁY MÓC
 *    mọi phép ghi qua mongoose, kể cả từ tính năng viết sau này — không cần
 *    nhớ gọi tay. Không biết ai bấm, nhưng payload thường tự khai (movedBy,
 *    cancelledBy, note "— tên"...).
 *  - Route booking (app/api/baocao/booking/route.ts): ghi thêm dòng "api" kèm
 *    ĐÍCH DANH người đăng nhập + hành động — trả lời thẳng câu "ai, lúc nào".
 *
 * Ghi kiểu bắn-và-quên: nhật ký hỏng không được phép làm hỏng nghiệp vụ chính.
 */
export interface IBaobayBookingLog {
  bookingId?: mongoose.Types.ObjectId;
  spot: string;
  /** create/update/delete = middleware bắt máy móc · api = route ghi đích danh. */
  op: "create" | "update" | "delete" | "api";
  /** Hành động ở tầng route (flown/cancel/move/split/void/collect…). */
  action?: string;
  byUsername?: string;
  byName?: string;
  /** Điều kiện tìm của phép ghi (JSON, cắt ngắn) — để biết phép ghi nhắm vào đâu. */
  filter?: string;
  /** Nội dung phép ghi ($set/$push… hoặc bản chụp lúc tạo — JSON, cắt ngắn). */
  update?: string;
  /** Bản chụp nhận dạng nhanh lúc ghi — đọc nhật ký không phải mở booking. */
  snap?: { contactName?: string; flightDate?: string; daySeq?: number; status?: string; guestCount?: number };
  at: Date;
}

const BaobayBookingLogSchema = new Schema<IBaobayBookingLog>(
  {
    bookingId: { type: Schema.Types.ObjectId, index: true },
    spot: { type: String, default: "" },
    op: { type: String, enum: ["create", "update", "delete", "api"], required: true },
    action: String,
    byUsername: String,
    byName: String,
    filter: String,
    update: String,
    snap: {
      type: {
        contactName: String,
        flightDate: String,
        daySeq: Number,
        status: String,
        guestCount: Number,
        _id: false,
      },
      default: undefined,
    },
    at: { type: Date, default: Date.now },
  },
  // Nhật ký tự mang mốc `at` — không cần timestamps đôi của mongoose
  { timestamps: false },
);

// Truy theo booking là câu hỏi chính; theo ngày bay là câu hỏi thứ hai
BaobayBookingLogSchema.index({ "snap.flightDate": 1, spot: 1 });
BaobayBookingLogSchema.index({ at: -1 });

export const BaobayBookingLog =
  mongoose.models.BaobayBookingLog ||
  mongoose.model<IBaobayBookingLog>("BaobayBookingLog", BaobayBookingLogSchema);

/** Cắt JSON cho vừa một dòng nhật ký — nhật ký để truy vết, không phải backup. */
export function logJson(x: unknown, max = 4000): string {
  try {
    const s = JSON.stringify(x);
    return s.length > max ? s.slice(0, max) + "…" : s;
  } catch {
    return String(x).slice(0, max);
  }
}

/** Ghi một dòng nhật ký, nuốt lỗi — nghiệp vụ chính không được chết vì nhật ký. */
export function logBooking(entry: Omit<IBaobayBookingLog, "at">): void {
  BaobayBookingLog.create({ ...entry, at: new Date() }).catch((err: unknown) => {
    console.error("BaobayBookingLog write failed:", err);
  });
}
