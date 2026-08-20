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
  /** SĐT người thân/bạn bay — gọi khi có sự cố. Bắt buộc với mọi phi công. */
  emergencyPhone?: string;
  /** Phi công/HLV local nhận hỗ trợ (phi công mới / diện giám sát bay). */
  supportPilotName?: string;
  supportPilotPhone?: string;
  email?: string;
  address?: string;
  /** Câu lạc bộ / hội dù lượn mà phi công sinh hoạt. */
  club?: string;
  /** Yêu cầu riêng phi công tự viết khi đăng ký. */
  specialRequest?: string;
  /** Cỡ áo sự kiện (S–XXL) — chỉ hỏi ở đợt Mùa Vàng. */
  shirtSize?: string;
  /** Nhận bay PPG kéo cờ trong lễ khai mạc Mùa Vàng. */
  openingFlagFlight?: boolean;

  flyingKind: string;
  motorType?: string;
  wingClass?: string;

  period: string;
  dates: string[];
  siteFeeMode?: string;
  /** Người nhà đi kèm FULL lịch trình (chỉ đợt Mùa Vàng). */
  companionCount?: number;
  /** Người nhà CHỈ tham dự Gala dinner (chỉ đợt Mùa Vàng). */
  galaCompanionCount?: number;

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

  /** Biên bản miễn trừ trách nhiệm — ký điện tử tại /muavang/mien-tru. */
  waiverSignedAt?: Date;
  waiverEmail?: string;
  /** Chữ ký vẽ tay, data URL PNG (nhỏ, vài chục KB). */
  waiverSignature?: string;
  /** Bản điều khoản phi công đã ký (WAIVER_VERSION lúc ký). */
  waiverVersion?: string;
}

const PilotRegistrationSchema = new Schema<IPilotRegistration>(
  {
    code: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    idNumber: { type: String, required: true },
    nationality: { type: String, default: "Việt Nam" },
    phone: { type: String, required: true, index: true },
    emergencyPhone: { type: String, default: "" },
    supportPilotName: { type: String, default: "" },
    supportPilotPhone: { type: String, default: "" },
    waiverSignedAt: Date,
    waiverEmail: String,
    waiverSignature: String,
    waiverVersion: String,
    email: String,
    address: String,
    club: String,
    specialRequest: String,
    shirtSize: String,
    openingFlagFlight: { type: Boolean, default: false },

    flyingKind: { type: String, required: true },
    motorType: String,
    wingClass: String,

    period: { type: String, required: true, index: true },
    dates: [String],
    siteFeeMode: String,
    companionCount: { type: Number, default: 0 },
    galaCompanionCount: { type: Number, default: 0 },

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
