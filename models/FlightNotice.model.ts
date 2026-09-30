import mongoose, { Schema, Types } from "mongoose";

import type { BaoBaySpot, FeeMode } from "@/lib/bao-bay";

/**
 * BÁO BAY của phi công bay đơn (trang /baobay) — cũng là nơi nhớ vé tháng/năm.
 *
 * Không có bảng "vé" riêng: báo bay nào MUA vé tháng/năm thì mang luôn
 * passFrom/passValidUntil, lần báo sau máy chủ tra ngược theo CCCD hoặc số
 * điện thoại đã chuẩn hoá (idNorm/phoneNorm) để miễn phí. Vé tính từ lúc báo
 * bay được lưu, đã trả tiền hay chưa — admin thấy dòng chưa trả để đòi.
 */
export interface IFlightNotice {
  noticeCode: string;
  spot: BaoBaySpot;
  /** Các ngày bay, "YYYY-MM-DD". */
  dates: string[];

  fullName: string;
  idNumber: string;
  phone: string;
  emergencyPhone: string;
  nationality?: string;
  /** Email phi công tự điền (không bắt buộc) — gửi thư xác nhận báo bay. */
  email?: string;
  /** Phi công nước ngoài — bắt buộc khai quốc tịch, số giấy tờ là hộ chiếu. */
  foreigner?: boolean;
  /** Cấp cánh dù (EN A…D, PPG) — cùng thang với /muavang. */
  wingClass?: string;
  /** Bằng phi công / cấp bay tự khai (P2, P3, IPPI…). */
  licence?: string;

  /** Khoá tra vé: CCCD và SĐT đã chuẩn hoá (lib/bao-bay normalize*). */
  idNorm: string;
  phoneNorm: string;

  /** Mã hội viên HNAA đã xác nhận đúng + bản ghi hội viên. */
  memberCode?: string;
  memberId?: Types.ObjectId;
  /**
   * Hội viên CHƯA có SĐT trong danh sách hội → không đối chiếu được, SĐT trên
   * báo bay là phi công tự khai (ALLOW_MEMBER_WITHOUT_PHONE). Admin thấy
   * "chưa đối chiếu SĐT".
   */
  memberPhoneUnverified?: boolean;
  /** Lúc phi công tích "chấp nhận tuân thủ Nội quy điểm bay" (bắt buộc ở Viên Nam). */
  rulesAcceptedAt?: Date;
  /**
   * NGÀY ĐÃ HUỶ (chủ 01/10): phi công tự huỷ trước 9h00 ngày bay. KHÔNG xoá báo
   * bay, không bớt `dates` — ngày huỷ nằm ở đây kèm giờ huỷ; danh sách "hôm nay"
   * và số liệu admin tự bỏ những ngày này. Vé tháng/năm đã mua vẫn giữ.
   */
  cancelledDates?: Array<{ date: string; at: Date }>;
  /** Ngày admin đánh dấu "Không đến bay (báo ảo)" — đếm cho luật hội viên báo ảo. */
  noShowDates?: Array<{ date: string; at: Date; by?: string }>;

  feeMode: FeeMode;
  /** Cách phi công chọn trả (day/month/year) — khác feeMode khi được miễn hết. */
  purchase?: string;
  feeLines?: Array<{ key: string; label: string; dates: string[]; amount: number }>;
  amount: number;

  /** Vé tháng/năm mua trong báo bay này. */
  passFrom?: string;
  passValidUntil?: string;
  /** Mã báo bay đã mua vé đang che các ngày này (khi feeMode = pass). */
  coveredByNotice?: string;

  transferNote?: string;
  submittedAt: Date;
  /**
   * Lúc phi công TỰ TÍCH "Tôi đã thanh toán phí báo bay" trước khi gửi — chỉ là
   * lời khai. `paid` bên dưới mới là admin đã đối chiếu sao kê và bấm "đã thu".
   */
  paidClaimedAt?: Date;
  paid: boolean;
  paidAt?: Date;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const FlightNoticeSchema = new Schema<IFlightNotice>(
  {
    noticeCode: { type: String, required: true, unique: true, index: true },
    spot: { type: String, required: true, enum: ["vien-nam", "khau-pha", "quan-ba"], index: true },
    dates: { type: [String], default: [], index: true },

    fullName: { type: String, required: true },
    idNumber: { type: String, default: "" },
    phone: { type: String, default: "" },
    emergencyPhone: { type: String, default: "" },
    nationality: String,
    email: String,
    foreigner: { type: Boolean, default: false },
    wingClass: String,
    licence: String,

    idNorm: { type: String, default: "", index: true },
    phoneNorm: { type: String, default: "", index: true },

    memberCode: { type: String, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "HnaaMember" },
    memberPhoneUnverified: { type: Boolean, default: false },
    rulesAcceptedAt: Date,
    cancelledDates: [{ _id: false, date: String, at: Date }],
    noShowDates: [{ _id: false, date: String, at: Date, by: String }],

    feeMode: {
      type: String,
      required: true,
      enum: ["hnaa_free", "pass", "day", "month", "year"],
    },
    purchase: String,
    feeLines: [
      {
        _id: false,
        key: String,
        label: String,
        dates: [String],
        amount: Number,
      },
    ],
    amount: { type: Number, default: 0 },

    passFrom: String,
    passValidUntil: String,
    coveredByNotice: String,

    transferNote: String,
    submittedAt: { type: Date, required: true },
    paidClaimedAt: Date,
    paid: { type: Boolean, default: false },
    paidAt: Date,
    note: String,
  },
  { timestamps: true },
);

// Tra vé còn hạn: cùng điểm bay + có hạn vé
FlightNoticeSchema.index({ spot: 1, passValidUntil: 1 });
FlightNoticeSchema.index({ spot: 1, dates: 1 });

export const FlightNotice =
  (mongoose.models.FlightNotice as mongoose.Model<IFlightNotice>) ||
  mongoose.model<IFlightNotice>("FlightNotice", FlightNoticeSchema, "flightnotices");

/** Xem chú thích ở ensureHnaaMemberIndexes — cùng lý do: mã báo bay phải duy nhất. */
let noticesIndexed: Promise<unknown> | null = null;
export function ensureFlightNoticeIndexes(): Promise<unknown> {
  if (!noticesIndexed) {
    noticesIndexed = FlightNotice.createIndexes().catch((e) => {
      noticesIndexed = null;
      console.warn("[FlightNotice] createIndexes failed:", e);
    });
  }
  return noticesIndexed;
}
