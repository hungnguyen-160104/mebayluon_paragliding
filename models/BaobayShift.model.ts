// models/BaobayShift.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * Lịch bay của MỘT điểm bay trong MỘT tháng.
 *
 * Một bản ghi cho cả tháng, không phải mỗi phi công một bản: admin chấm lịch
 * trên một bảng dàn ngang (hàng = phi công, cột = ngày 1…31) và lưu một phát,
 * nên đọc/ghi cả bảng cùng lúc là đúng cách dùng thật. Cũng nhờ vậy mà "ngày
 * này có mấy người làm" chỉ là một phép đếm trong bộ nhớ, không phải truy vấn.
 *
 * Quy ước: `days` chỉ chứa NGÀY LÀM VIỆC. Ngày không có trong mảng là ngày
 * nghỉ — chấm thì làm, không chấm thì nghỉ, đúng như cách admin nhìn bảng.
 */

export type ShiftAssignment = {
  username: string;
  /** Chép lại tên lúc chấm lịch, để bảng cũ vẫn đọc được sau khi đổi tên. */
  pilotName: string;
  /** Số ngày trong tháng (1–31) người này ĐI LÀM. */
  days: number[];
};

export interface IBaobayShift {
  spot: string;
  /** "YYYY-MM". */
  month: string;
  assignments: ShiftAssignment[];
  /**
   * Số phi công cần có mặt mỗi ngày. Chỉ để bảng tô đỏ ngày thiếu/thừa người —
   * không chặn lưu, vì thực tế có hôm cần thêm người cho đoàn lớn.
   */
  neededPerDay: number;
  /**
   * Tăng 1 mỗi lần lưu. Email gửi phi công ghi rõ "bản cập nhật lần N" để không
   * ai nhầm lịch cũ với lịch mới.
   */
  version: number;
  updatedBy: string;
  /** Lần gần nhất gửi email báo lịch cho phi công. */
  notifiedAt?: Date;
  /** Bản lịch (version) đã gửi email — khác `version` nghĩa là có sửa mà chưa báo. */
  notifiedVersion: number;

  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<ShiftAssignment>(
  {
    username: { type: String, required: true },
    pilotName: { type: String, required: true },
    days: { type: [Number], default: [] },
  },
  { _id: false },
);

const BaobayShiftSchema = new Schema<IBaobayShift>(
  {
    spot: { type: String, default: DEFAULT_SPOT },
    month: { type: String, required: true },
    assignments: { type: [AssignmentSchema], default: [] },
    neededPerDay: { type: Number, default: 0, min: 0 },
    version: { type: Number, default: 1 },
    updatedBy: { type: String, default: "" },
    notifiedAt: Date,
    notifiedVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/** Mỗi điểm bay mỗi tháng đúng MỘT bảng lịch. */
BaobayShiftSchema.index({ spot: 1, month: 1 }, { unique: true });

export const BaobayShift =
  (mongoose.models.BaobayShift as mongoose.Model<IBaobayShift>) ||
  mongoose.model<IBaobayShift>("BaobayShift", BaobayShiftSchema);
