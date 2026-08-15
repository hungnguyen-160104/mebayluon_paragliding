// models/BaobayAccount.model.ts
import mongoose, { Schema } from "mongoose";

import { BAOBAY_ROLES, DEFAULT_SPOT, type BaobayRole } from "@/lib/baobay/roles";

/**
 * Tài khoản đăng nhập trang báo bay (/baocao).
 *
 * Không dùng chung với models/User.model.ts: User là tài khoản quản trị
 * website (đăng bài, xem booking), còn đây là nhân sự vận hành điểm bay —
 * 15 phi công và mấy nhân viên quầy vé, chỉ có quyền nhập báo cáo của chính
 * mình. Trộn hai loại vào một bảng thì sớm muộn cũng có người được quyền
 * nhiều hơn cần thiết.
 *
 * Mật khẩu do quản trị đặt rồi đưa cho từng người, nên có
 * `mustChangePassword` để lần đăng nhập đầu tiên buộc đổi.
 */
export interface IBaobayAccount {
  username: string;
  passwordHash: string;
  /**
   * Mật khẩu dạng ĐỌC ĐƯỢC — chủ điểm bay yêu cầu rõ: nhân viên tự đổi mật
   * khẩu thoải mái nhưng admin phải xem lại được để quản lý toàn bộ info.
   *
   * Đây là quyết định nghiệp vụ có đánh đổi an toàn (lộ database là lộ mật
   * khẩu, nhân viên có thể dùng lại mật khẩu cá nhân) — đã nêu rủi ro và chủ
   * hệ thống chấp nhận. Trường này CHỈ được trả ra ở API quản trị
   * (/api/admin/baocao/*), tuyệt đối không đi qua các API /api/baocao/*.
   */
  passwordPlain?: string;
  displayName: string;
  role: BaobayRole;
  /**
   * Cấp quản trị (chỉ dùng khi role = "admin"):
   *   1 = toàn quyền — đổi cấu hình điểm bay và lập được tài khoản quản trị khác
   *   2 = quản trị hạn chế — quản nhân sự thường, không đụng hai việc trên
   * Mặc định 2: tài khoản quản trị mới sinh ra luôn là cấp 2, muốn nâng cấp 1
   * phải sửa thẳng trong cơ sở dữ liệu.
   */
  adminLevel: 1 | 2;
  email?: string;
  phone?: string;
  /**
   * Các điểm bay được ADMIN CHỈ ĐỊNH cho người này. Một phi công có thể bay cả
   * Khau Phạ lẫn Sa Pa, một kế toán có thể quản cả ba — lúc làm việc thì chọn
   * đúng điểm của ngày hôm đó.
   */
  spots: string[];
  /** Loại phi công: PG / PPG / cả hai — chỉ dùng khi role = "pilot". */
  pilotKind?: "pg" | "ppg" | "both";
  /**
   * VAI TRÒ KIÊM NHIỆM: người làm hai việc trong cùng một ngày (phi công hôm
   * nay bay, hôm khác cầm flycam) — khai ở đây để họ dùng MỘT tài khoản, khỏi
   * đăng xuất đăng nhập hai lần mỗi ngày. Vai chính vẫn là `role`.
   */
  extraRoles?: BaobayRole[];
  isActive: boolean;
  /** Số lần nhập sai mật khẩu LIÊN TIẾP; đăng nhập đúng là về 0. */
  failedLogins: number;
  /** Khoá tạm tới thời điểm này vì sai quá nhiều lần (chống dò mật khẩu). */
  lockedUntil?: Date;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BaobayAccountSchema = new Schema<IBaobayAccount>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
    },
    passwordHash: { type: String, required: true },
    passwordPlain: String,
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: BAOBAY_ROLES, required: true, index: true },
    adminLevel: { type: Number, enum: [1, 2], default: 2 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    spots: { type: [String], default: [DEFAULT_SPOT] },
    pilotKind: { type: String, enum: ["pg", "ppg", "both"], default: "pg" },
    extraRoles: { type: [String], enum: BAOBAY_ROLES, default: [] },
    isActive: { type: Boolean, default: true, index: true },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    mustChangePassword: { type: Boolean, default: true },
    lastLoginAt: Date,
    note: String,
  },
  { timestamps: true },
);

export const BaobayAccount =
  (mongoose.models.BaobayAccount as mongoose.Model<IBaobayAccount>) ||
  mongoose.model<IBaobayAccount>("BaobayAccount", BaobayAccountSchema);
