// models/PilotRegistration.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * Đăng ký bay của PHI CÔNG (khác hẳn Booking — đó là khách bay đôi).
 *
 * Vẫn lưu vào cơ sở dữ liệu dù dữ liệu cũng được đẩy sang Google Sheets:
 * bảng tính là chỗ ban tổ chức theo dõi hằng ngày, còn đây là bản gốc không
 * ai lỡ tay sửa hay xoá dòng.
 */
export interface IPilotRegistration {
  code: string;
  fullName: string;
  idNumber: string;
  nationality: string;
  phone: string;
  email?: string;
  address?: string;
  /** Câu lạc bộ / hội dù lượn mà phi công sinh hoạt. */
  club?: string;
  /** Yêu cầu riêng phi công tự viết khi đăng ký. */
  specialRequest?: string;

  flyingKind: string;
  motorType?: string;
  wingClass?: string;

  period: string;
  dates: string[];
  siteFeeMode?: string;
  /** Người nhà đi kèm (chỉ đợt Mùa Vàng). */
  companionCount?: number;

  feeLines?: Array<{ label: string; amount: number; free?: boolean }>;
  feeTotal: number;

  /** Đã ghi được sang Google Sheets chưa — để còn biết dòng nào cần bù. */
  sheetSynced: boolean;
  sheetError?: string;

  /** Thời điểm phi công tự bấm "Tôi đã chuyển khoản cọc". */
  paymentDeclaredAt?: Date;
  transferNote?: string;

  note?: string;
  status: "pending" | "confirmed" | "cancelled";
}

const PilotRegistrationSchema = new Schema<IPilotRegistration>(
  {
    code: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    idNumber: { type: String, required: true },
    nationality: { type: String, default: "Việt Nam" },
    phone: { type: String, required: true, index: true },
    email: String,
    address: String,
    club: String,
    specialRequest: String,

    flyingKind: { type: String, required: true },
    motorType: String,
    wingClass: String,

    period: { type: String, required: true, index: true },
    dates: [String],
    siteFeeMode: String,
    companionCount: { type: Number, default: 0 },

    feeLines: [
      {
        _id: false,
        label: String,
        amount: Number,
        free: Boolean,
      },
    ],
    feeTotal: { type: Number, default: 0 },

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,

    paymentDeclaredAt: Date,
    transferNote: String,

    note: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

PilotRegistrationSchema.index({ period: 1, createdAt: -1 });
PilotRegistrationSchema.index({ createdAt: -1 });

export const PilotRegistration =
  mongoose.models.PilotRegistration ||
  mongoose.model<IPilotRegistration>(
    "PilotRegistration",
    PilotRegistrationSchema,
  );
