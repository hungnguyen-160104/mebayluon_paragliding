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
  sunset: number;
  flagFlight: number;
  /** Booking gốc từ trang khách mebayluon.com/booking — khoá chống nhập trùng. */
  webBookingId?: string;
  /** Booking từ THƯ OTA (Klook…): mã của OTA — khoá chống nhập trùng. */
  otaRef?: string;
  otaName?: string;
  /** Hành khách kèm giấy tờ (OTA gửi sẵn) — dùng làm bảo hiểm, khỏi hỏi lại khách. */
  otaGuests?: Array<{ fullName: string; birthday: string; gender: string; idNumber: string; nationality: string }>;
  /** Trạng thái bên trang khách lúc đồng bộ gần nhất. */
  webStatus?: string;
  syncedAt?: Date;
  /** Loại hình bay — quyết định đơn giá: "pg" dù lượn · "ppg" có động cơ. */
  flightKind: "pg" | "ppg" | "m650" | "m850";
  /** Phí đưa đón thu của khách (nếu có). */
  pickupFee: number;
  /** Số suất xe chuyên dụng lên núi (Hà Nội) — 150k/khách. */
  mountainCar: number;
  /** HUỶ BAY: đã xuất vé chưa · mã vé thu hồi · tiền hoàn và hoàn bằng gì. */
  cancelTicketIssued?: boolean;
  cancelTicketCodes?: string[];
  refundAmount?: number;
  /**
   * VỆT THU TIỀN của booking: ai thu, bao nhiêu, TM hay CK, lúc nào.
   * Ghi thẳng lên booking để quầy nhìn một dòng là biết tiền nong tới đâu,
   * khỏi lật sổ lệnh thu.
   */
  collectedLog?: Array<{ amount: number; method: "cash" | "transfer"; byName: string; at: Date; kind: string }>;
  refundMethod?: "cash" | "transfer";
  cancelledAt?: Date;
  cancelledBy?: string;
  /** Đơn giá một khách theo loại hình + ngày bay (thường / cuối tuần & lễ). */
  unitPrice: number;
  /** Giảm trừ cả đoàn (chiết khấu đại lý, khuyến mãi…) — số tiền tuyệt đối. */
  discount: number;
  /** Tổng tiền chốt với khách — máy tự tính, lưu lại để đối chiếu về sau. */
  totalAmount: number;

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
  /** Cọc CK vào thẳng TK công ty. */
  depositToCompany: boolean;
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
  /**
   * SỐ THỨ TỰ KHÁCH TRONG NGÀY, cấp theo thời điểm đặt và KHÔNG đổi nữa —
   * quầy gọi "khách số 4" là cả ngày ai cũng hiểu, kể cả khi khách đó đã bay
   * hay đã huỷ. Dời lịch sang ngày khác thì cấp số mới của ngày mới.
   */
  daySeq: number;

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
    sunset: { type: Number, default: 0, min: 0 },
    flagFlight: { type: Number, default: 0, min: 0 },
    webBookingId: { type: String, index: true, sparse: true },
    otaRef: { type: String, index: true, sparse: true },
    otaName: String,
    otaGuests: {
      type: [
        new Schema(
          {
            fullName: { type: String, default: "" },
            birthday: { type: String, default: "" },
            gender: { type: String, default: "" },
            idNumber: { type: String, default: "" },
            nationality: { type: String, default: "" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    webStatus: String,
    syncedAt: Date,
    flightKind: { type: String, enum: ["pg", "ppg", "m650", "m850"], default: "pg" },
    pickupFee: { type: Number, default: 0, min: 0 },
    mountainCar: { type: Number, default: 0, min: 0 },
    cancelTicketIssued: Boolean,
    cancelTicketCodes: { type: [String], default: [] },
    refundAmount: { type: Number, default: 0, min: 0 },
    collectedLog: {
      type: [
        {
          amount: { type: Number, default: 0 },
          method: { type: String, enum: ["cash", "transfer"], default: "cash" },
          byName: { type: String, default: "" },
          at: Date,
          kind: { type: String, default: "" },
          _id: false,
        },
      ],
      default: [],
    },
    refundMethod: { type: String, enum: ["cash", "transfer"] },
    cancelledAt: Date,
    cancelledBy: String,
    unitPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },

    pickup: { type: String, enum: ["self", "bigc", "hotel", "other"], default: "self" },
    pickupNote: { type: String, default: "" },
    expectedTime: { type: String, default: "" },
    deposit: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 },
    transferCode: { type: String, default: "" },
    depositToCompany: { type: Boolean, default: false },
    note: { type: String, default: "" },

    assignedToUsername: String,
    assignedToName: String,
    assignedBy: String,
    assignedAt: Date,

    status: { type: String, enum: ["open", "done", "cancelled"], default: "open" },
    doneAt: Date,
    doneBy: String,
    rescheduledFrom: { type: [String], default: [] },
    daySeq: { type: Number, default: 0 },

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

// Trang điều phối hỏi "booking của ngày X" và "booking đang chờ" mỗi lần mở
BaobayBookingSchema.index({ spot: 1, flightDate: 1, status: 1 });

export const BaobayBooking =
  mongoose.models.BaobayBooking || mongoose.model<IBaobayBooking>("BaobayBooking", BaobayBookingSchema);
