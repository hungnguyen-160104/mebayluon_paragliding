// models/BaobayMerchItem.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * MẶT HÀNG BÁN THÊM tại quầy vé / điều phối — áo, khăn, cốm, móc khoá…
 *
 * Khác quầy cafe ở chỗ KHÔNG có máy bán riêng: người trực bán lẻ tẻ suốt ngày
 * rồi cuối ca khai "hôm nay bán 5 áo cờ đỏ". Vì vậy chỗ này chỉ cần DANH MỤC
 * (tên + đơn giá), còn số lượng bán nằm trong báo cáo ngày của từng người.
 *
 * NHÂN SỰ TỰ TẠO MẶT HÀNG, không phải chờ quản trị: hàng lưu niệm đổi theo
 * mùa và theo lô nhập, bắt chờ deploy thì hôm có hàng mới là không khai được.
 * Đổi giá cũng vậy — báo cáo đã lưu giữ nguyên đơn giá lúc bán nên sửa giá về
 * sau không làm sai số cũ.
 *
 * Ẩn bằng `active: false` chứ không xoá: báo cáo cũ còn tra tên theo mã này.
 */
export interface IBaobayMerchItem {
  spot: string;
  /** Mã hàng dạng slug, suy từ tên lúc tạo — báo cáo bám mã này. */
  key: string;
  name: string;
  price: number;
  /** Đơn vị đếm hiện trên nút: chiếc, cái, gói, hộp… */
  unit: string;

  active: boolean;

  createdByUsername: string;
  createdByName: string;

  createdAt: Date;
  updatedAt: Date;
}

const BaobayMerchItemSchema = new Schema<IBaobayMerchItem>(
  {
    spot: { type: String, default: DEFAULT_SPOT, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "chiếc" },

    active: { type: Boolean, default: true },

    createdByUsername: { type: String, default: "" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true },
);

BaobayMerchItemSchema.index({ spot: 1, key: 1 }, { unique: true });

export const BaobayMerchItem =
  (mongoose.models.BaobayMerchItem as mongoose.Model<IBaobayMerchItem>) ||
  mongoose.model<IBaobayMerchItem>("BaobayMerchItem", BaobayMerchItemSchema);
