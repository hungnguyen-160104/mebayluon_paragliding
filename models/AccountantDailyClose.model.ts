// models/AccountantDailyClose.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/roles";
/**
 * Kiểu dùng chung định nghĩa ở lib/baobay/types.ts, không định nghĩa lại ở đây:
 * các trang trong app/baocao là client component nên không được import model
 * (kéo cả driver MongoDB vào bundle), mà vẫn cần đúng những kiểu này.
 */
import type { IssuedRangeDTO, RescheduledDTO } from "@/lib/baobay/types";
import { ExpenseSchema } from "@/models/DispatcherDailyReport.model";

export type IssuedRange = IssuedRangeDTO;
export type RescheduledTicket = RescheduledDTO;

/**
 * Số CHỐT NGÀY do kế toán tổng hợp tự nhập — mỗi ngày một bản ghi cho cả điểm bay.
 *
 * Đây là nguồn số ĐỘC LẬP, không phải bản tổng do app cộng từ báo cáo nhân viên:
 * cả cơ chế đối chiếu dựa vào việc hai bên nhập riêng rồi so nhau. App vẫn hiện
 * số cộng sẵn bên cạnh cho kế toán đỡ phải nhẩm, nhưng con số lưu ở đây là con
 * số kế toán tự khai.
 *
 * `status`:
 *  - "draft"  : đang nhập, ngày CHƯA tính vào bảng tổng, nhân viên vẫn sửa được
 *  - "closed" : đã chốt, ngày vào tổng và KHOÁ — không ai sửa được nữa cho tới
 *               khi kế toán gỡ khoá (mở lại ngày)
 *
 * Chỉ chốt được khi bộ đối chiếu (lib/baobay/reconcile.ts) không còn lỗi đỏ.
 * Riêng lệch dịch vụ gia tăng (flycam/360) giữa camera man, điều phối và phi
 * công thì kế toán có thể DUYỆT bằng `varianceApproved` — khách hay phát sinh
 * dịch vụ ngay tại bãi cất cánh nên lệch là chuyện có thật, chặn cứng thì không
 * ngày nào chốt được.
 */
export interface IAccountantDailyClose {
  date: string;
  spot: string;

  accountantId: mongoose.Types.ObjectId;
  accountantName: string;

  /** Số khách bay trong ngày. */
  guestCount: number;
  /** Số vé được xuất ra. */
  ticketsIssued: number;
  /** Số vé thu hồi (huỷ + dời lịch). */
  ticketsReturned: number;

  cancelledCount: number;
  rescheduledCount: number;

  /** Các dải mã vé đã xuất, có thể nhiều cuốn khác tiền tố trong một ngày. */
  issuedRanges: IssuedRange[];
  cancelledCodes: string[];
  /** Vé dời lịch kèm ngày dời tới (vé cũ huỷ, ngày mới xuất vé khác). */
  rescheduled: RescheduledTicket[];

  /** Số tiền mặt thu về. */
  cashTotal: number;
  /** Chuyển khoản — giữ lại vì kỳ trước vẫn có khách chuyển khoản tại quầy. */
  transferTotal: number;

  flycam: number;
  video360: number;
  /** Số dù cờ đỏ — nguồn chuẩn là PHI CÔNG, đối chiếu với điều phối. */
  redFlag: number;
  /** Số chuyến bay kéo cờ. */
  flagFlight: number;

  /** Kế toán đã xác nhận các khoản chi tiêu của nhân viên. */
  /** Sổ THU/CHI riêng của kế toán: nội dung – số tiền – tick thu/chi. */
  ledger: Array<{ content: string; amount: number; kind?: "thu" | "chi"; note?: string }>;
  expensesApproved: boolean;
  expensesApprovedNote?: string;

  /** Kế toán duyệt lệch dịch vụ gia tăng (flycam/360) giữa các bên. */
  varianceApproved: boolean;
  varianceNote?: string;

  status: "draft" | "closed";
  closedAt?: Date;
  closedBy?: string;

  note?: string;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const IssuedRangeSchema = new Schema<IssuedRange>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const RescheduledSchema = new Schema<RescheduledTicket>(
  {
    code: { type: String, required: true },
    toDate: { type: String, required: true },
    note: String,
  },
  { _id: false },
);

const AccountantDailyCloseSchema = new Schema<IAccountantDailyClose>(
  {
    // Một ngày một bản chốt cho MỖI ĐIỂM BAY — chỉ mục duy nhất (spot, date)
    // khai ở cuối file, không đặt unique lẻ trên `date` nữa.
    date: { type: String, required: true, index: true },
    spot: { type: String, default: DEFAULT_SPOT },

    accountantId: { type: Schema.Types.ObjectId, ref: "BaobayAccount", required: true },
    accountantName: { type: String, required: true },

    guestCount: { type: Number, default: 0, min: 0 },
    ticketsIssued: { type: Number, default: 0, min: 0 },
    ticketsReturned: { type: Number, default: 0, min: 0 },

    cancelledCount: { type: Number, default: 0, min: 0 },
    rescheduledCount: { type: Number, default: 0, min: 0 },

    issuedRanges: { type: [IssuedRangeSchema], default: [] },
    cancelledCodes: { type: [String], default: [] },
    rescheduled: { type: [RescheduledSchema], default: [] },

    cashTotal: { type: Number, default: 0, min: 0 },
    transferTotal: { type: Number, default: 0, min: 0 },

    flycam: { type: Number, default: 0, min: 0 },
    video360: { type: Number, default: 0, min: 0 },
    redFlag: { type: Number, default: 0, min: 0 },
    flagFlight: { type: Number, default: 0, min: 0 },

    ledger: { type: [ExpenseSchema], default: [] },
    expensesApproved: { type: Boolean, default: false },
    expensesApprovedNote: String,

    varianceApproved: { type: Boolean, default: false },
    varianceNote: String,

    status: { type: String, enum: ["draft", "closed"], default: "draft", index: true },
    closedAt: Date,
    closedBy: String,

    note: String,

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

/** Dùng cho danh sách chi tiêu kế toán duyệt — giữ cùng một định nghĩa với nơi khác. */
export { ExpenseSchema };

/** Mỗi điểm bay chốt riêng: cùng một ngày, ba điểm có ba bản chốt độc lập. */
AccountantDailyCloseSchema.index({ spot: 1, date: 1 }, { unique: true });

export const AccountantDailyClose =
  (mongoose.models.AccountantDailyClose as mongoose.Model<IAccountantDailyClose>) ||
  mongoose.model<IAccountantDailyClose>("AccountantDailyClose", AccountantDailyCloseSchema);
