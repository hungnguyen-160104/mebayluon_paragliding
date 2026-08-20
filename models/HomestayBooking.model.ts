// models/HomestayBooking.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * MỘT ĐẶT PHÒNG homestay (Clubhouse Mebayluon) — về từ BA CỬA:
 *
 *  - Thư OTA đổ vào hộp mebayluon@gmail.com (Agoda là chính, thêm Airbnb,
 *    Booking.com, Trip.com, Traveloka…) — máy tự đọc thư và ghi vào đây,
 *    `gmailId` (mã thư) là khoá chống trùng: quét lại bao nhiêu lần cũng
 *    không nhân đôi.
 *  - Khách tự đặt trên mebayluon.com/homestay/dat-phong (source "web").
 *  - Kế toán nhập tay (khách gọi điện, đoàn B2B) — source "manual"/"b2b".
 *
 * Booking OTA TRẢ TRƯỚC (prepaid) thì tiền cần thu tại nhà = 0 — OTA chuyển
 * sau theo kỳ; `netAmount` là số thật về tài khoản để kế toán đối chiếu.
 * Booking web / nhập tay thì `collect` là số phải thu khi khách đến.
 */

export type HomestayBookingStatus = "confirmed" | "cancelled" | "review";

export interface IHomestayBooking {
  /** agoda · airbnb · booking · trip · traveloka · klook · b2b · web · manual. */
  source: string;
  /** Mã đặt phòng bên nguồn (Agoda Booking ID…) — dùng tìm thư huỷ/sửa. */
  ref: string;
  /** Mã thư Gmail sinh ra bản ghi — khoá chống trùng khi quét lại hộp thư. */
  gmailId?: string;

  guestName: string;
  phone: string;
  email: string;
  country: string;

  /** Hạng phòng theo id của lib/homestay-data — "" khi máy chưa đoán được, kế toán gán tay. */
  roomTypeId: string;
  /** Tên phòng NGUYÊN VĂN trên nguồn ("Loft A"…) — giữ để đối chiếu khi gán tay. */
  roomLabel: string;
  /** Số đơn vị giữ: phòng lẻ đếm phòng, phòng cộng đồng đếm chỗ nằm. */
  rooms: number;
  adults: number;
  children: number;

  /** "YYYY-MM-DD" — giữ phòng các đêm [checkIn, checkOut). */
  checkIn: string;
  checkOut: string;

  /** Giá bán cho khách (tham khảo đối chiếu). */
  amount: number;
  /** Tiền thật về tài khoản từ OTA (đã trừ hoa hồng, thuế). */
  netAmount: number;
  /** Khách đã trả cho OTA rồi — tại nhà không thu nữa. */
  prepaid: boolean;
  /** Còn phải thu khi khách đến (web/B2B/nhập tay). */
  collect: number;
  /** Đã thu được bao nhiêu. */
  collected: number;

  status: HomestayBookingStatus;
  /** Vì sao rơi vào khay cần soát (thư không bóc được, huỷ không thấy booking…). */
  reviewReason?: string;
  /** Trích thư gốc — để người soát đọc bằng mắt khi máy bó tay. */
  raw?: string;

  note: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  /** Lý do huỷ — bắt ghi khi huỷ từ ô sổ phòng, đọc lại còn biết vì sao. */
  cancelReason?: string;

  createdByUsername?: string;
  createdByName?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const HomestayBookingSchema = new Schema<IHomestayBooking>(
  {
    source: { type: String, required: true, index: true },
    ref: { type: String, default: "", index: true },
    gmailId: { type: String, unique: true, sparse: true },

    guestName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    country: { type: String, default: "" },

    roomTypeId: { type: String, default: "" },
    roomLabel: { type: String, default: "" },
    rooms: { type: Number, default: 1, min: 0 },
    adults: { type: Number, default: 0, min: 0 },
    children: { type: Number, default: 0, min: 0 },

    checkIn: { type: String, default: "", index: true },
    checkOut: { type: String, default: "" },

    amount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    prepaid: { type: Boolean, default: false },
    collect: { type: Number, default: 0 },
    collected: { type: Number, default: 0 },

    status: { type: String, enum: ["confirmed", "cancelled", "review"], default: "confirmed", index: true },
    reviewReason: String,
    raw: String,

    note: { type: String, default: "" },
    cancelledAt: Date,
    cancelledBy: String,
    cancelReason: String,

    createdByUsername: String,
    createdByName: String,
  },
  { timestamps: true },
);

// Bảng phòng hỏi "các booking chạm khoảng ngày này" mỗi lần mở
HomestayBookingSchema.index({ status: 1, checkIn: 1, checkOut: 1 });

export const HomestayBooking =
  mongoose.models.HomestayBooking || mongoose.model<IHomestayBooking>("HomestayBooking", HomestayBookingSchema);

/**
 * MỐC QUÉT HỘP THƯ của máy lấy booking phòng — mỗi hộp một bản ghi, nhớ UID
 * thư đọc đến đâu để lần sau chỉ lấy thư mới. Không nhét vào BaobaySetting:
 * bảng đó khai báo chặt theo điểm bay, trường lạ sẽ bị Mongoose lặng lẽ vứt.
 */
export interface IHomestaySyncState {
  key: string;
  lastUid: number;
  lastRunAt?: Date;
  lastRunBy?: string;
}

const HomestaySyncStateSchema = new Schema<IHomestaySyncState>(
  {
    key: { type: String, required: true, unique: true },
    lastUid: { type: Number, default: 0 },
    lastRunAt: Date,
    lastRunBy: String,
  },
  { timestamps: true },
);

export const HomestaySyncState =
  mongoose.models.HomestaySyncState ||
  mongoose.model<IHomestaySyncState>("HomestaySyncState", HomestaySyncStateSchema);
