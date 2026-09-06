// models/CafeStockEntry.model.ts
import mongoose, { Schema } from "mongoose";

import { CAFE_SPOT } from "@/lib/baobay/cafe";

/**
 * MỘT LẦN NHẬP HÀNG VÀO QUẦY — vế "nhập" của phép kiểm kê.
 *
 * Chủ hỏi đúng một câu: "tháng 9 nhập 30 thùng bia = 720 lon thì phải bán được
 * tương ứng". Muốn trả lời được thì phải có hai con số cùng đơn vị, nên bản ghi
 * này quy MỌI thứ về ĐƠN VỊ LẺ (`units`): khai 30 thùng bia thì máy nhân
 * packSize (24) ra 720 lon rồi mới lưu. Vế "bán" đếm từ phiếu CafeSale, cũng
 * theo lon. Nhập một đằng bán một nẻo là chuyện của đơn vị đo, không phải của
 * người kiểm kê.
 *
 * `packs` và `packSize` vẫn giữ lại nguyên văn lời khai để còn truy: nửa năm
 * sau nhà cung cấp đổi thùng 24 lon thành 20 lon, con số cũ vẫn đọc đúng.
 */
export interface ICafeStockEntry {
  spot: string;
  /** Ngày nhập, "YYYY-MM-DD" giờ Việt Nam. */
  date: string;
  /** Mã hàng trong CAFE_STOCK_ITEMS — "bia-ha-noi", "cocacola"… */
  stockKey: string;

  /** Lời khai gốc: bao nhiêu kiện, mỗi kiện mấy đơn vị, cộng thêm mấy cái lẻ. */
  packs: number;
  packSize: number;
  looseUnits: number;
  /** Tổng quy về đơn vị lẻ = packs × packSize + looseUnits. Mọi phép cộng dùng cột này. */
  units: number;

  /** Tiền mua lô hàng này, nếu có ghi — để tính giá vốn sau này. */
  cost: number;
  note: string;

  byUsername: string;
  byName: string;

  createdAt: Date;
  updatedAt: Date;
}

const CafeStockEntrySchema = new Schema<ICafeStockEntry>(
  {
    spot: { type: String, default: CAFE_SPOT, index: true },
    date: { type: String, required: true, index: true },
    stockKey: { type: String, required: true, index: true },

    packs: { type: Number, default: 0, min: 0 },
    packSize: { type: Number, default: 1, min: 1 },
    looseUnits: { type: Number, default: 0, min: 0 },
    units: { type: Number, required: true, min: 0 },

    cost: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "" },

    byUsername: { type: String, default: "" },
    byName: { type: String, default: "" },
  },
  { timestamps: true },
);

/** Câu hỏi thường trực: "kỳ này nhập những gì" — lọc theo điểm + khoảng ngày. */
CafeStockEntrySchema.index({ spot: 1, date: -1 });

export const CafeStockEntry =
  (mongoose.models.CafeStockEntry as mongoose.Model<ICafeStockEntry>) ||
  mongoose.model<ICafeStockEntry>("CafeStockEntry", CafeStockEntrySchema);
