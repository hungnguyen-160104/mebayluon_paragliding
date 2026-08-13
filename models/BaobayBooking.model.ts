// models/BaobayBooking.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * Một BOOKING đặt trước: khách chốt hôm nay nhưng bay một ngày khác
 * (VD 13/08 đặt qua Klook cho ngày 20/08, 2 khách, đón khách sạn, 1 cam360).
 *
 * Bảng RIÊNG, không nhét vào báo cáo ngày, vì:
 *  - Booking thuộc về NGÀY BAY tương lai, còn thời điểm nhập là hôm nay —
 *    báo cáo ngày chỉ ôm số liệu của chính ngày đó.
 *  - Vòng đời khác hẳn: nhập → chờ tới ngày bay → bấm "Hoàn thành" để ẩn;
 *    không bị khoá theo ngày kế toán đã chốt.
 *
 * `createdAt` (timestamps) chính là "thời điểm điều phối nhập liệu" — dùng
 * để đối chiếu khách đặt lúc nào, không cho sửa.
 */

/** "other" = đón chỗ khác — ghi rõ địa điểm vào pickupNote (Khau Phạ/Sa Pa dùng). */
export type BookingPickup = "self" | "bigc" | "hotel" | "other";
/** open = chờ bay · done = đã bay (ghi nhận vào ngày bay) · cancelled = khách huỷ. */
export type BookingStatus = "open" | "done" | "cancelled";

export interface IBaobayBooking {
  spot: string;
  /** Ngày khách BAY, "YYYY-MM-DD" giờ Việt Nam — booking hiện lên trang điều phối đúng ngày này. */
  flightDate: string;

  /** Điều phối (hoặc kế toán/quản trị) đã nhập booking. */
  createdByUsername: string;
  createdByName: string;

  /** Nguồn khách: FB / TikTok / Zalo / Klook / SEEK / GYG / KKday… — chữ tự do. */
  source: string;
  contactName: string;
  /** SĐT khách — người được giao lịch gọi đón/tiếp. */
  phone: string;
  /** Mã booking bên nguồn (số booking Klook, mã đơn…). */
  bookingCode: string;

  guestCount: number;
  /** Dịch vụ đặt kèm — SỐ LƯỢNG, khớp cách đếm của báo cáo ngày. */
  flycam: number;
  video360: number;
  redFlag: number;
  flagFlight: number;

  /** Đưa đón: tự đến / đón BigC (chỉ Hà Nội) / đón khách sạn / khác. */
  pickup: BookingPickup;
  /** Đón tại đâu khi chọn "khác" — chữ tự do. */
  pickupNote: string;
  /** Giờ bay dự kiến "HH:MM" — không bắt buộc. */
  expectedTime: string;
  /** Tiền khách đã cọc (VND). */
  deposit: number;
  /** Số tiền CÒN LẠI phải thu khi khách đến bay (VND). */
  remaining: number;
  /** Mã chuyển khoản của khoản cọc — soi lại sao kê ngân hàng. */
  transferCode: string;
  note: string;

  /**
   * Điều phối GIAO lịch cho một nhân sự của điểm (phi công đón khách, tiếp
   * khách…) — người được giao thấy booking trên trang của mình.
   */
  assignedToUsername?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedAt?: Date;

  status: BookingStatus;
  /** Thời điểm + người bấm xác nhận cuối (đã bay hoặc huỷ). */
  doneAt?: Date;
  doneBy?: string;
  /** Các ngày bay CŨ nếu khách dời lịch — booking tự chuyển sang ngày mới. */
  rescheduledFrom: string[];

  sheetSynced: boolean;
  sheetError?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const BaobayBookingSchema = new Schema<IBaobayBooking>(
  {
    spot: { type: String, default: DEFAULT_SPOT, index: true },
    flightDate: { type: String, required: true },

    createdByUsername: { type: String, required: true },
    createdByName: { type: String, required: true },

    source: { type: String, default: "" },
    contactName: { type: String, default: "" },
    phone: { type: String, default: "" },
    bookingCode: { type: String, default: "" },

    guestCount: { type: Number, default: 0, min: 0 },
    flycam: { type: Number, default: 0, min: 0 },
    video360: { type: Number, default: 0, min: 0 },
    redFlag: { type: Number, default: 0, min: 0 },
    flagFlight: { type: Number, default: 0, min: 0 },

    pickup: { type: String, enum: ["self", "bigc", "hotel", "other"], default: "self" },
    pickupNote: { type: String, default: "" },
    expectedTime: { type: String, default: "" },
    deposit: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 },
    transferCode: { type: String, default: "" },
    note: { type: String, default: "" },

    assignedToUsername: String,
    assignedToName: String,
    assignedBy: String,
    assignedAt: Date,

    status: { type: String, enum: ["open", "done", "cancelled"], default: "open" },
    doneAt: Date,
    doneBy: String,
    rescheduledFrom: { type: [String], default: [] },

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

// Trang điều phối hỏi "booking của ngày X" và "booking đang chờ" mỗi lần mở
BaobayBookingSchema.index({ spot: 1, flightDate: 1, status: 1 });

export const BaobayBooking =
  mongoose.models.BaobayBooking || mongoose.model<IBaobayBooking>("BaobayBooking", BaobayBookingSchema);
