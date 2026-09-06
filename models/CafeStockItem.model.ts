// models/CafeStockItem.model.ts
import mongoose, { Schema } from "mongoose";

import { CAFE_SPOT } from "@/lib/baobay/cafe";

/**
 * MẶT HÀNG KHO do quầy tự thêm — cùng lối với món tự thêm (CafeProduct).
 *
 * Danh mục nền nằm trong mã (CAFE_STOCK_ITEMS) vì máy bán phải đọc được lúc
 * mất mạng, nhưng nguyên liệu thì mỗi mùa một khác: thêm siro đào, đổi sang
 * sữa hạt, nhập thêm loại trà mới. Bắt sửa mã rồi deploy cho mỗi lần như thế
 * là không dùng được.
 *
 * Trùng `key` với mặt hàng trong mã thì bản ghi này ĐÈ LÊN — đó là đường sửa
 * quy cách đóng gói khi nhà cung cấp đổi thùng 24 lon thành 20 lon.
 */
export interface ICafeStockItemDoc {
  spot: string;
  key: string;
  name: string;
  /** "packaged" (đếm cái) hoặc "ingredient" (đong theo g/ml). */
  kind: string;
  /** Đơn vị gốc: lon · chai · gói · g · ml. */
  unit: string;
  /** Tên kiện nhập: thùng · bao · can · hộp. */
  packName: string;
  /** Một kiện bằng bao nhiêu đơn vị gốc. */
  packSize: number;

  active: boolean;

  createdByUsername: string;
  createdByName: string;

  createdAt: Date;
  updatedAt: Date;
}

const CafeStockItemSchema = new Schema<ICafeStockItemDoc>(
  {
    spot: { type: String, default: CAFE_SPOT, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    kind: { type: String, enum: ["packaged", "ingredient"], default: "packaged" },
    unit: { type: String, default: "cái" },
    packName: { type: String, default: "thùng" },
    packSize: { type: Number, default: 1, min: 1 },

    active: { type: Boolean, default: true },

    createdByUsername: { type: String, default: "" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true },
);

CafeStockItemSchema.index({ spot: 1, key: 1 }, { unique: true });

export const CafeStockItemDoc =
  (mongoose.models.CafeStockItemDoc as mongoose.Model<ICafeStockItemDoc>) ||
  mongoose.model<ICafeStockItemDoc>("CafeStockItemDoc", CafeStockItemSchema, "cafestockitems");
