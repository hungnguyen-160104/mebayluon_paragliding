// models/AdminCredential.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * MẬT KHẨU KHU QUẢN TRỊ WEBSITE (/admin) sau khi chủ tự đổi.
 *
 * Vì sao phải có bảng này: mật khẩu gốc nằm ở BIẾN MÔI TRƯỜNG (SINGLE_PASSWORD,
 * OWNER_PASSWORD_HASH). Ứng dụng đang chạy không sửa được biến môi trường —
 * trên Vercel chúng là hằng số nạp lúc khởi động, ổ đĩa thì chỉ đọc. Muốn có
 * nút "Đổi mật khẩu" bấm phát ăn ngay thì chỗ lưu phải nằm trong cơ sở dữ liệu.
 *
 * LUẬT ƯU TIÊN: có bản ghi ở đây thì bản ghi này là NGUỒN SỰ THẬT, mật khẩu
 * trong biến môi trường HẾT hiệu lực với tài khoản đó. Không làm vậy thì đổi
 * mật khẩu chẳng khoá được ai — người biết mật khẩu cũ vẫn vào như thường,
 * đúng cái tình huống mà người ta bấm đổi mật khẩu để ngăn.
 *
 * QUÊN MẬT KHẨU MỚI thì mở CSDL xoá bản ghi của tài khoản đó, hệ thống tự rơi
 * về mật khẩu trong biến môi trường như trước.
 *
 * MỨC QUYỀN (owner/editor) KHÔNG lưu ở đây — nó vẫn do biến môi trường quyết
 * (xem services/auth.service.ts). Ai chiếm được CSDL cũng không tự phong mình
 * làm chủ được.
 */

export interface IAdminCredential {
  /** Tên đăng nhập, khớp với OWNER_USERNAME hoặc SINGLE_USER. */
  username: string;
  /**
   * Mật khẩu ĐANG dùng, băm bcrypt.
   *
   * Để TRỐNG cho tới khi đổi mật khẩu THÀNH CÔNG. Bản ghi sinh ra ngay từ lúc
   * xin mã (để giữ mã và mật khẩu mới đang treo), mà yêu cầu thì hay bỏ dở —
   * nếu lúc ấy đã ghi luôn passwordHash thì bản ghi dở dang này chiếm quyền
   * của biến môi trường, và về sau chủ sửa OWNER_PASSWORD_HASH trên Vercel sẽ
   * không ăn mà chẳng hiểu vì sao.
   */
  passwordHash?: string;

  /**
   * MẬT KHẨU MỚI đang chờ xác nhận qua thư — đã băm sẵn, chưa áp dụng.
   *
   * Băm ngay từ lúc yêu cầu chứ không giữ bản gõ thẳng: giữa lúc gửi thư và
   * lúc nhập mã có thể là hàng chục phút, không có lý do gì để một mật khẩu
   * đọc được nằm chờ trong cơ sở dữ liệu suốt quãng đó.
   */
  pendingHash?: string;
  /** Mã 6 số gửi qua thư, cũng băm — CSDL rò rỉ cũng không đọc ra mã. */
  codeHash?: string;
  codeExpiresAt?: Date;
  /** Số lần nhập mã sai; quá ngưỡng thì huỷ cả yêu cầu, bắt làm lại từ đầu. */
  codeTries?: number;
  /** Địa chỉ đã gửi mã tới — ghi lại để sau còn tra. */
  codeSentTo?: string;
  codeRequestedAt?: Date;

  /** Lần đổi gần nhất — hiện trên màn hình cho người dùng tự soát. */
  lastChangedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

const AdminCredentialSchema = new Schema<IAdminCredential>(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: String,

    pendingHash: String,
    codeHash: String,
    codeExpiresAt: Date,
    codeTries: { type: Number, default: 0 },
    codeSentTo: String,
    codeRequestedAt: Date,

    lastChangedAt: Date,
  },
  { timestamps: true },
);

export const AdminCredential =
  mongoose.models.AdminCredential ||
  mongoose.model<IAdminCredential>("AdminCredential", AdminCredentialSchema);
