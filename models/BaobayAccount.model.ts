// models/BaobayAccount.model.ts
import mongoose, { Schema } from "mongoose";

import { BAOBAY_ROLES, DEFAULT_SPOT, type BaobayRole } from "@/lib/baobay/roles";

/**
 * Tài khoản đăng nhập trang báo bay (/baobay).
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
   * (/api/admin/baobay/*), tuyệt đối không đi qua các API /api/baobay/*.
   */
  passwordPlain?: string;
  displayName: string;
  role: BaobayRole;
  email?: string;
  phone?: string;
  /**
   * Các điểm bay được ADMIN CHỈ ĐỊNH cho người này. Một phi công có thể bay cả
   * Khau Phạ lẫn Sa Pa, một kế toán có thể quản cả ba — lúc làm việc thì chọn
   * đúng điểm của ngày hôm đó.
   */
  spots: string[];
  isActive: boolean;
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
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    spots: { type: [String], default: [DEFAULT_SPOT] },
    isActive: { type: Boolean, default: true, index: true },
    mustChangePassword: { type: Boolean, default: true },
    lastLoginAt: Date,
    note: String,
  },
  { timestamps: true },
);

export const BaobayAccount =
  (mongoose.models.BaobayAccount as mongoose.Model<IBaobayAccount>) ||
  mongoose.model<IBaobayAccount>("BaobayAccount", BaobayAccountSchema);
