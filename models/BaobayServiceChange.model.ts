// models/BaobayServiceChange.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * SỔ GHI mỗi lần THÊM hoặc HUỶ dịch vụ tuỳ chọn của một booking.
 *
 * Vì sao phải có sổ riêng: trước đây thao tác này chỉ sửa thẳng số trên booking
 * rồi nối một dòng vào ghi chú. Bấm nhầm dịch vụ, nhầm số lượng, nhầm tiền là
 * không có đường lùi — người nhập phải tự tính ngược rồi sửa tay, mà tính ngược
 * thì hỏng cả combo lẫn tiền còn thu.
 *
 * Mỗi bản ghi giữ ẢNH CHỤP booking TRƯỚC khi sửa (`before`). Muốn sửa lại thì
 * khôi phục đúng ảnh chụp đó rồi nhập lại từ đầu — không cộng trừ chắp vá, nên
 * sửa bao nhiêu lần sổ vẫn khớp.
 *
 * Bản ghi KHÔNG xoá: hoàn tác thì đánh dấu `undoneAt`, để còn biết ai sửa gì.
 */
export interface IBaobayServiceChange {
  spot: string;
  /** Ngày BAY của booking — thao tác thuộc về ngày đó, không phải ngày bấm. */
  date: string;
  bookingId: mongoose.Types.ObjectId;
  /** Nhãn đọc được: "#3 chị Chung · 0912…" — giữ lại phòng khi booking đổi tên. */
  bookingLabel: string;
  kind: "add" | "remove";
  /** Số lượng từng dịch vụ của LẦN NÀY (không phải tổng của booking). */
  items: {
    flycam: number;
    video360: number;
    redFlag: number;
    sunset: number;
    flagFlight: number;
  };
  /** THÊM: giảm trừ riêng của lần này và số tiền phải thu thêm. */
  discount: number;
  charge: number;
  /** HUỶ: số lùi lại cho khách, và trong đó hoàn thật bao nhiêu. */
  back: number;
  refunded: number;
  /** "credit" = trừ vào tiền còn thu · "refund" = trả lại tiền khách. */
  mode?: "credit" | "refund";
  refundMethod?: "cash" | "transfer";
  reason?: string;

  /** Ảnh chụp booking TRƯỚC khi sửa — nguồn duy nhất để hoàn tác. */
  before: {
    flycam: number;
    video360: number;
    redFlag: number;
    sunset: number;
    flagFlight: number;
    comboDiscount: number;
    discount: number;
    totalAmount: number;
    deposit: number;
    remaining: number;
    note: string;
    /** Vệt thu tiền in trên booking — khôi phục luôn, không thì lần thu của
        thao tác đã hoàn tác vẫn nằm lại trên dòng khách. */
    collectedLog: unknown[];
  };

  /** Lệnh thu / lệnh hoàn sinh ra kèm lần này — hoàn tác thì gỡ luôn. */
  collectIds: mongoose.Types.ObjectId[];
  refundId?: mongoose.Types.ObjectId;

  createdByUsername: string;
  createdByName: string;
  undoneAt?: Date;
  undoneBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ServiceChangeSchema = new Schema<IBaobayServiceChange>(
  {
    spot: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking", required: true, index: true },
    bookingLabel: { type: String, default: "" },
    kind: { type: String, enum: ["add", "remove"], required: true },
    items: {
      flycam: { type: Number, default: 0 },
      video360: { type: Number, default: 0 },
      redFlag: { type: Number, default: 0 },
      sunset: { type: Number, default: 0 },
      flagFlight: { type: Number, default: 0 },
    },
    discount: { type: Number, default: 0 },
    charge: { type: Number, default: 0 },
    back: { type: Number, default: 0 },
    refunded: { type: Number, default: 0 },
    mode: { type: String, enum: ["credit", "refund"] },
    refundMethod: { type: String, enum: ["cash", "transfer"] },
    reason: String,
    before: {
      flycam: { type: Number, default: 0 },
      video360: { type: Number, default: 0 },
      redFlag: { type: Number, default: 0 },
      sunset: { type: Number, default: 0 },
      flagFlight: { type: Number, default: 0 },
      comboDiscount: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      deposit: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      note: { type: String, default: "" },
      collectedLog: { type: Array, default: [] },
    },
    collectIds: { type: [Schema.Types.ObjectId], default: [] },
    refundId: { type: Schema.Types.ObjectId, ref: "BaobayRefund" },
    createdByUsername: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    undoneAt: Date,
    undoneBy: String,
  },
  { timestamps: true },
);

ServiceChangeSchema.index({ spot: 1, date: 1, createdAt: -1 });

export const BaobayServiceChange =
  (mongoose.models.BaobayServiceChange as mongoose.Model<IBaobayServiceChange>) ||
  mongoose.model<IBaobayServiceChange>("BaobayServiceChange", ServiceChangeSchema);
