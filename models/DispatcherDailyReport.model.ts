// models/DispatcherDailyReport.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/roles";
import type {
  CancelEntryDTO,
  DiploEntryDTO,
  ExpenseDTO,
  IssuedRangeDTO,
  RescheduleEntryDTO,
  RescheduledDTO,
} from "@/lib/baobay/types";

/**
 * Báo cáo cuối ngày của MỘT nhân sự điều phối bay.
 *
 * Điều phối là người nắm mặt vé và tiền tại điểm bay: xuất vé, thu vé về, thu
 * tiền mặt, đếm dịch vụ gia tăng và chi hộ khách. Mỗi người mỗi ngày một bản
 * ghi (chỉ mục duy nhất accountId + date) để kế toán không cộng trùng.
 *
 * Vé không bay chỉ có HAI đường — huỷ trả vé, hoặc dời lịch (ghi rõ ngày dời
 * tới). Nhờ vậy luôn có đẳng thức để soát:
 *
 *      vé xuất = đã bay + huỷ + dời lịch
 *
 * `diplomaticGuests` là khách ngoại giao: không thu tiền nhưng VẪN xuất vé, nên
 * vé của họ vẫn nằm trong dải mã đã xuất và vẫn phải có phi công khai đã bay —
 * chỉ khác là không sinh doanh thu.
 */
export interface IDispatcherDailyReport {
  accountId: mongoose.Types.ObjectId;
  username: string;
  staffName: string;
  spot: string;

  /** Ngày làm việc, "YYYY-MM-DD" theo giờ Việt Nam. */
  date: string;

  guestCount: number;
  /** Số vé đã xuất ra. */
  ticketsIssued: number;
  /** Số vé thu về (liên bay dù phi công trả lại quầy sau khi bay). */
  ticketsReturned: number;

  /** Các dải mã vé đã xuất — nhiều dải vì có thể xuất từ nhiều cuốn khác tiền tố. */
  issuedRanges: IssuedRangeDTO[];

  cancelledCount: number;
  /** Bản phẳng (mọi mã huỷ) — bộ đối chiếu và Sheets dùng bản này. */
  cancelledCodes: string[];
  /** Bản chi tiết theo nhóm đoàn: mã – lý do – tên liên hệ. */
  cancelledEntries: CancelEntryDTO[];
  cancelledGuestEntries?: Array<{ name: string; bookingCode: string; guests: number; source: string; refund: number; note?: string }>;
  rescheduledGuestEntries?: Array<{ name: string; guests: number; toDate: string; note?: string; phone?: string; bookedId?: string }>;
  rescheduledCount: number;
  /** Bản phẳng {code, toDate} — bộ đối chiếu dùng bản này. */
  rescheduled: RescheduledDTO[];
  /** Bản chi tiết theo nhóm: mã – ngày dời – lý do – liên hệ – sđt. */
  rescheduledEntries: RescheduleEntryDTO[];

  /** Khách ngoại giao chi tiết: mã vé + tiền thu được nếu có. */
  diplomaticEntries: DiploEntryDTO[];
  diplomaticAmount: number;

  /**
   * Tiền giao cho giám đốc KHÔNG nằm ở đây: xem models/BaobayHandover.model.ts.
   * Mọi vai trò đều đưa tiền, một ngày có thể đưa nhiều lần, và giám đốc phải
   * ký nhận được cả khi ngày đã chốt — nên tách hẳn thành bảng riêng.
   */

  /**
   * Dịch vụ gia tăng đếm tại quầy. Mã vé KHÔNG bắt buộc — chỉ điền khi kế toán
   * báo lệch số với phi công/camera man và cần dò ra vé nào sai.
   */
  flycam: number;
  flycamCodes: string[];
  video360: number;
  video360ServiceCodes: string[];
  redFlag: number;
  redFlagCodes: string[];
  /** Số chuyến bay kéo cờ. */
  flagFlight: number;
  flagFlightCodes: string[];

  /** Khách ngoại giao (không thu tiền) nhưng vẫn xuất vé. */
  diplomaticGuests: number;
  diplomaticCodes: string[];

  cashReceived: number;
  transferReceived: number;
  /**
   * Các khoản thu CÓ TÊN, thêm bằng nút "+" dưới hai ô tiền vé: nội dung –
   * tiền mặt/CK – số tiền. `cashReceived`/`transferReceived` lưu TỔNG đã gộp
   * cả các dòng này (máy chủ cộng), nên mọi phép đối chiếu giữ nguyên.
   */
  revenueEntries: Array<{ content: string; method: "cash" | "transfer"; amount: number }>;

  /** Chi hộ khách — ba khoản hay gặp nhất, tách riêng để cộng nhanh. */
  guestWaterCost: number;
  mountainCarCost: number;
  shuttleCarCost: number;
  /** Các khoản chi khác: nội dung – số tiền – ghi chú. */
  expenses: ExpenseDTO[];

  note?: string;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const IssuedRangeSchema = new Schema<IssuedRangeDTO>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const RescheduledSchema = new Schema<RescheduledDTO>(
  {
    code: { type: String, required: true },
    toDate: { type: String, required: true },
    note: String,
  },
  { _id: false },
);

export const ExpenseSchema = new Schema<ExpenseDTO>(
  {
    content: { type: String, required: true },
    amount: { type: Number, default: 0, min: 0 },
    kind: { type: String, enum: ["thu", "chi"], default: "chi" },
    // Không default: dòng cũ chưa phân loại thì để trống, UI coi như tiền mặt
    method: { type: String, enum: ["cash", "transfer"] },
    note: String,
  },
  { _id: false },
);

const CancelEntrySchema = new Schema<CancelEntryDTO>(
  {
    codes: { type: [String], default: [] },
    reason: { type: String, default: "" },
    contactName: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const RescheduleEntrySchema = new Schema<RescheduleEntryDTO>(
  {
    codes: { type: [String], default: [] },
    toDate: { type: String, default: "" },
    reason: { type: String, default: "" },
    contactName: { type: String, default: "" },
    phone: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false },
);

/** HÀ NỘI: nhóm KHÁCH huỷ hoàn tiền / dời lịch — điểm này không có vé. */
const CancelGuestSchema = new Schema(
  {
    name: { type: String, default: "" },
    bookingCode: { type: String, default: "" },
    guests: { type: Number, default: 0, min: 0 },
    source: { type: String, default: "" },
    refund: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const RescheduleGuestSchema = new Schema(
  {
    name: { type: String, default: "" },
    guests: { type: Number, default: 0, min: 0 },
    toDate: { type: String, default: "" },
    note: { type: String, default: "" },
    phone: { type: String, default: "" },
    bookedId: { type: String, default: "" },
  },
  { _id: false },
);

const DiploEntrySchema = new Schema<DiploEntryDTO>(
  {
    codes: { type: [String], default: [] },
    amount: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const DispatcherDailyReportSchema = new Schema<IDispatcherDailyReport>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "BaobayAccount", required: true },
    username: { type: String, required: true },
    staffName: { type: String, required: true },
    spot: { type: String, default: DEFAULT_SPOT },

    date: { type: String, required: true, index: true },

    guestCount: { type: Number, default: 0, min: 0 },
    ticketsIssued: { type: Number, default: 0, min: 0 },
    ticketsReturned: { type: Number, default: 0, min: 0 },

    issuedRanges: { type: [IssuedRangeSchema], default: [] },

    cancelledCount: { type: Number, default: 0, min: 0 },
    cancelledCodes: { type: [String], default: [] },
    cancelledEntries: { type: [CancelEntrySchema], default: [] },
    cancelledGuestEntries: { type: [CancelGuestSchema], default: [] },
    rescheduledGuestEntries: { type: [RescheduleGuestSchema], default: [] },
    rescheduledCount: { type: Number, default: 0, min: 0 },
    rescheduled: { type: [RescheduledSchema], default: [] },
    rescheduledEntries: { type: [RescheduleEntrySchema], default: [] },

    diplomaticEntries: { type: [DiploEntrySchema], default: [] },
    diplomaticAmount: { type: Number, default: 0, min: 0 },


    flycam: { type: Number, default: 0, min: 0 },
    flycamCodes: { type: [String], default: [] },
    video360: { type: Number, default: 0, min: 0 },
    video360ServiceCodes: { type: [String], default: [] },
    redFlag: { type: Number, default: 0, min: 0 },
    redFlagCodes: { type: [String], default: [] },
    flagFlight: { type: Number, default: 0, min: 0 },
    flagFlightCodes: { type: [String], default: [] },

    diplomaticGuests: { type: Number, default: 0, min: 0 },
    diplomaticCodes: { type: [String], default: [] },

    cashReceived: { type: Number, default: 0, min: 0 },
    revenueEntries: {
      type: [
        new Schema(
          {
            content: { type: String, default: "" },
            method: { type: String, enum: ["cash", "transfer"], default: "cash" },
            amount: { type: Number, default: 0, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    transferReceived: { type: Number, default: 0, min: 0 },

    guestWaterCost: { type: Number, default: 0, min: 0 },
    mountainCarCost: { type: Number, default: 0, min: 0 },
    shuttleCarCost: { type: Number, default: 0, min: 0 },
    expenses: { type: [ExpenseSchema], default: [] },

    note: String,

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

DispatcherDailyReportSchema.index({ accountId: 1, date: 1, spot: 1 }, { unique: true });
DispatcherDailyReportSchema.index({ spot: 1, date: 1 });

export const DispatcherDailyReport =
  (mongoose.models.DispatcherDailyReport as mongoose.Model<IDispatcherDailyReport>) ||
  mongoose.model<IDispatcherDailyReport>("DispatcherDailyReport", DispatcherDailyReportSchema);
