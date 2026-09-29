// models/Booking.model.ts
import mongoose, { Schema } from "mongoose";

export type AddonKey = "pickup" | "flycam" | "camera360";
export type AddonsBool = Partial<Record<AddonKey, boolean>>;
export type AddonsQty = Partial<Record<AddonKey, number>>;

export interface IBooking {
  customerId: mongoose.Types.ObjectId; // reference Customer
  location: string; // key: "sapa", "da-nang", etc.
  locationName?: string; // display name
  packageKey?: string;
  flightTypeKey?: string;
  packageLabel?: string;
  flightTypeLabel?: string;
  holidayType?: string;
  dateISO?: string; // "2024-01-15" format
  timeSlot?: string; // "07:00", "09:00", etc.
  guestsCount?: number;

  // Contact info
  contact?: {
    phone?: string;
    email?: string;
    pickupLocation?: string;
    specialRequest?: string;
  };

  // Guests details
  guests?: Array<{
    fullName?: string;
    dob?: string; // yyyy-mm-dd
    gender?: string; // "Nam", "Nữ", "Khác"
    idNumber?: string;
    weightKg?: number;
    nationality?: string;
  }>;

  // Add-ons
  addons?: AddonsBool; // backward compat
  addonsQty?: AddonsQty; // qty per addon
  services?: Record<
    string,
    {
      selected?: boolean;
      qty?: number;
      inputText?: string;
    }
  >;
  selectedServices?: Array<{
    key?: string;
    label?: string;
    inputText?: string;
    fixedMapUrl?: string;
  }>;

  // Pricing
  price?: {
    currency?: string; // "VND", "USD"
    perPerson?: number; // backward
    basePerPerson?: number;
    discountPerPerson?: number;
    addonsUnitPrice?: Partial<Record<AddonKey, number>>;
    addonsTotal?: Partial<Record<AddonKey, number>>;
    total?: number;
  };

  // Status
  status?: "pending" | "confirmed" | "completed" | "cancelled"; // default "pending"

  /**
   * SỐ THỨ TỰ BAY trong ngày — sổ điều hành (/baocao) ghi ngược về đây.
   *
   * Là số ưu tiên khi xếp lượt bay: ai đặt trước có số nhỏ, số nhỏ bay trước.
   * Số do sổ điều hành cấp (không phải trang khách tự sinh) nên chỉ có sau khi
   * đơn được đồng bộ sang sổ, thường vài giây sau khi khách bấm gửi.
   *
   * `queueDate` đi kèm vì số chỉ có nghĩa trong đúng một ngày bay — khách dời
   * lịch là nhận số mới của ngày mới.
   */
  queueNo?: number;
  /**
   * MÃ BOOKING cho khách (30/09/2026): 9 ký tự "MBL" + 6 ký tự ngẫu nhiên, ví
   * dụ MBL7K3Q9P. Khách dùng MÃ NÀY + SỐ ĐIỆN THOẠI để vào /booking/sua tự
   * sửa booking. Sổ nội bộ ghi "Web" + mã này (WebMBL7K3Q9P) nên quầy và khách
   * nói cùng một mã. Booking cũ không có — tra bằng mã sổ WebMBL<6 ký tự cuối id>.
   */
  maBooking?: string;
  /** Mỗi lần KHÁCH tự sửa trên web: lúc nào, đổi gì (trước → sau). */
  lichSuSua?: Array<{ at: Date; thayDoi: Array<{ truong: string; cu: string; moi: string }> }>;
  /** Khách bấm "yêu cầu huỷ" — quầy xử lý (cọc, hoàn tiền), không tự huỷ. */
  yeuCauHuy?: { at: Date; lyDo?: string };
  queueDate?: string; // "YYYY-MM-DD"
  queueUpdatedAt?: Date;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    locationName: {
      type: String,
      trim: true,
    },
    packageKey: {
      type: String,
      trim: true,
    },
    flightTypeKey: {
      type: String,
      trim: true,
    },
    packageLabel: {
      type: String,
      trim: true,
    },
    flightTypeLabel: {
      type: String,
      trim: true,
    },
    holidayType: {
      type: String,
      trim: true,
    },
    dateISO: {
      type: String,
      trim: true,
    },
    timeSlot: {
      type: String,
      trim: true,
    },
    guestsCount: {
      type: Number,
      min: 1,
      default: 1,
    },

    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      pickupLocation: { type: String, trim: true },
      specialRequest: { type: String },
    },

    guests: [
      {
        fullName: { type: String, trim: true },
        dob: String, // "yyyy-mm-dd"
        gender: String,
        idNumber: { type: String, trim: true },
        weightKg: Number,
        nationality: String,
      },
    ],

    addons: {
      type: Map,
      of: Boolean,
    },

    addonsQty: {
      type: Map,
      of: Number,
    },

    services: {
      type: Map,
      of: {
        selected: Boolean,
        qty: Number,
        inputText: String,
      },
      default: {},
    },

    selectedServices: [
      {
        key: { type: String, trim: true },
        label: { type: String, trim: true },
        inputText: { type: String, trim: true },
        fixedMapUrl: { type: String, trim: true },
      },
    ],

    price: {
      currency: { type: String, default: "VND" },
      perPerson: Number,
      basePerPerson: Number,
      discountPerPerson: Number,
      addonsUnitPrice: {
        type: Map,
        of: Number,
      },
      addonsTotal: {
        type: Map,
        of: Number,
      },
      total: Number,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Số thứ tự bay do sổ điều hành cấp — xem chú thích ở interface
    queueNo: { type: Number },
    queueDate: { type: String, trim: true },
    queueUpdatedAt: { type: Date },

    maBooking: { type: String, trim: true, uppercase: true },
    lichSuSua: {
      type: [
        {
          at: { type: Date, default: Date.now },
          thayDoi: [{ truong: String, cu: String, moi: String, _id: false }],
          _id: false,
        },
      ],
      default: undefined,
    },
    yeuCauHuy: { type: { at: Date, lyDo: String, _id: false }, default: undefined },
  },
  { timestamps: true }
);

// Indexes
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ location: 1, dateISO: 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ maBooking: 1 }, { unique: true, sparse: true });

// Prevent model recompilation in Next.js
export const Booking =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
