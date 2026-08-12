// models/BaobayHandover.model.ts
import mongoose, { Schema } from "mongoose";

import { BAOBAY_ROLES, type BaobayRole } from "@/lib/baobay/roles";
import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * Một lần nhân sự ĐƯA TIỀN cho quản lý/giám đốc.
 *
 * Bảng RIÊNG, không nhét vào báo cáo ngày, vì ba lý do:
 *  - Mọi vai trò đều đưa tiền (phi công, điều phối, camera man), nếu nhúng thì
 *    phải chép cùng một khối vào ba model.
 *  - Việc đưa tiền không gắn với "báo cáo của ngày": một ngày có thể đưa nhiều
 *    lần, và đưa tiền của ngày hôm trước cũng là chuyện thường.
 *  - Giám đốc xác nhận nhận tiền KHÔNG phải sửa số liệu, nên không bị khoá theo
 *    ngày đã chốt.
 *
 * Vòng đời: nhân sự bấm "Xác nhận đã đưa" -> bản ghi ở trạng thái chờ ->
 * admin thấy số đỏ ở /baocao/admin và bấm "Xác nhận" -> `confirmed: true`.
 * Không xoá bản ghi nào: đã khai là còn dấu vết, sai thì admin từ chối kèm lý do.
 */
/**
 * Hai loại lệnh tiền đi qua bảng này, cùng một vòng đời "gửi → người kia bấm
 * đồng ý/từ chối" nên dùng chung một chỗ lưu:
 *
 *  - `handover`: nhân sự ĐƯA tiền cho quản lý/kế toán/điều phối.
 *  - `advance` : nhân sự XIN ỨNG tiền, kế toán hoặc quản trị duyệt.
 */
export type BaobayMoneyKind = "handover" | "advance";

export interface IBaobayHandover {
  kind: BaobayMoneyKind;
  spot: string;
  /** Ngày đưa tiền, "YYYY-MM-DD" giờ Việt Nam — mặc định là hôm nay. */
  date: string;

  accountId: mongoose.Types.ObjectId;
  username: string;
  staffName: string;
  role: BaobayRole;

  /**
   * NGƯỜI NHẬN tiền (lệnh giao tiền) hoặc NGƯỜI DUYỆT (lệnh ứng tiền) — nhân sự tự chọn khi khai: giám đốc, kế toán hay điều phối.
   * Lệnh giao tiền chạy về đúng tài khoản này; chỉ người đó (hoặc quản trị) mới
   * xác nhận/từ chối được. Bản ghi cũ chưa có người nhận thì mặc định là quản trị.
   */
  recipientId?: mongoose.Types.ObjectId;
  recipientUsername?: string;
  recipientName: string;
  recipientRole: BaobayRole;

  amount: number;
  method: "cash" | "transfer";
  content?: string;

  confirmed: boolean;
  confirmedAt?: Date;
  confirmedBy?: string;

  /** Admin từ chối (số sai, chưa nhận được) kèm lý do — vẫn giữ bản ghi. */
  rejected: boolean;
  rejectedReason?: string;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BaobayHandoverSchema = new Schema<IBaobayHandover>(
  {
    kind: { type: String, enum: ["handover", "advance"], default: "handover", index: true },
    spot: { type: String, default: DEFAULT_SPOT, index: true },
    date: { type: String, required: true, index: true },

    accountId: { type: Schema.Types.ObjectId, ref: "BaobayAccount", required: true },
    username: { type: String, required: true },
    staffName: { type: String, required: true },
    role: { type: String, enum: BAOBAY_ROLES, required: true },

    recipientId: { type: Schema.Types.ObjectId, ref: "BaobayAccount" },
    recipientUsername: { type: String, index: true },
    recipientName: { type: String, default: "Quản lý/giám đốc" },
    recipientRole: { type: String, enum: BAOBAY_ROLES, default: "admin" },

    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["cash", "transfer"], default: "cash" },
    content: String,

    confirmed: { type: Boolean, default: false, index: true },
    confirmedAt: Date,
    confirmedBy: String,

    rejected: { type: Boolean, default: false },
    rejectedReason: String,

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

/** Admin mở trang là hỏi ngay "điểm này còn khoản nào chờ" — chỉ mục đúng câu hỏi đó. */
BaobayHandoverSchema.index({ spot: 1, confirmed: 1, date: -1 });

/** Người nhận mở trang là hỏi "ai đang giao tiền cho tôi" — hộp thư đến. */
BaobayHandoverSchema.index({ recipientUsername: 1, confirmed: 1, date: -1 });

export const BaobayHandover =
  (mongoose.models.BaobayHandover as mongoose.Model<IBaobayHandover>) ||
  mongoose.model<IBaobayHandover>("BaobayHandover", BaobayHandoverSchema);
