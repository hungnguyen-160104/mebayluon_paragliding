import mongoose, { Schema } from "mongoose";

/**
 * Hội viên Hội dù lượn Hà Nội (HNAA) — danh sách để miễn phí báo bay Viên Nam.
 *
 * Admin dán bảng từ Excel/Google Sheets ở /admin/baobay, ghi đè theo mã hội
 * viên. Trang /baobay công khai CHỈ được trả về họ tên và vài số cuối — CCCD và
 * số điện thoại đầy đủ không bao giờ rời máy chủ.
 */
export interface IHnaaMember {
  /** Mã hội viên đúng như bảng hội ("HNAA-01"), chữ hoa, không khoảng trắng — để HIỂN THỊ. */
  code: string;
  /**
   * Khoá tra mã (lib/bao-bay memberCodeKey): "HNAA-01", "hnaa 1", "01" đều ra
   * "HNAA1". Tra và ghi đè đều theo khoá này, không theo `code`.
   */
  codeKey?: string;
  fullName: string;
  /** Quốc tịch như bảng hội ghi ("Việt Nam", "Vietnam", "United States"…). */
  nationality?: string;
  /** Email trong bảng hội — chỉ admin xem, KHÔNG BAO GIỜ trả ra trang công khai. */
  email?: string;
  /** Lần nhập gần nhất lấy từ đâu (vd. "Danh sach HNAA cap nhat 01/10/26"). */
  importSource?: string;
  /**
   * Đếm SĐT xác nhận nhập SAI cho mã này + hạn của cửa sổ đếm. Lưu ngay trên
   * bản ghi (không để trong bộ nhớ) vì trên Vercel mỗi cửa API là một tiến
   * trình riêng — khoá ở cửa tra mã thì cửa báo giá/gửi cũng phải thấy.
   */
  phoneFailCount?: number;
  phoneFailUntil?: Date;
  idNumber?: string;
  phone?: string;
  emergencyPhone?: string;
  /** Các cột khác trong bảng dán vào (năm vào hội, cấp bằng…) giữ nguyên tên cột. */
  extra?: Record<string, string>;
  /** Tắt = hết là hội viên / tạm khoá; mã nhập vào sẽ báo "không đúng". */
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const HnaaMemberSchema = new Schema<IHnaaMember>(
  {
    code: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    // sparse: bản ghi cũ chưa có khoá vẫn nằm yên, không đụng chỉ mục duy nhất
    codeKey: { type: String, unique: true, sparse: true, index: true },
    fullName: { type: String, required: true, trim: true },
    nationality: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    importSource: { type: String, default: "" },
    phoneFailCount: { type: Number, default: 0 },
    phoneFailUntil: Date,
    idNumber: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    emergencyPhone: { type: String, default: "", trim: true },
    extra: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, minimize: false },
);

export const HnaaMember =
  (mongoose.models.HnaaMember as mongoose.Model<IHnaaMember>) ||
  mongoose.model<IHnaaMember>("HnaaMember", HnaaMemberSchema, "hnaamembers");

/**
 * Bản chạy thật TẮT tự tạo chỉ mục (lib/mongodb.ts), mà bảng này mới tinh —
 * không tự dựng thì chỉ mục duy nhất theo mã không bao giờ có và dán bảng hai
 * lần sẽ ra hai hội viên cùng mã. Dựng MỘT lần mỗi tiến trình, lỗi thì bỏ qua
 * (lần sau thử lại) chứ không làm hỏng việc đang làm.
 */
let membersIndexed: Promise<unknown> | null = null;
export function ensureHnaaMemberIndexes(): Promise<unknown> {
  if (!membersIndexed) {
    membersIndexed = HnaaMember.createIndexes().catch((e) => {
      membersIndexed = null;
      console.warn("[HnaaMember] createIndexes failed:", e);
    });
  }
  return membersIndexed;
}
