// models/CafeProduct.model.ts
import mongoose, { Schema } from "mongoose";

import { CAFE_SPOT } from "@/lib/baobay/cafe";

/**
 * MÓN QUẦY TỰ THÊM từ nút "＋ Thêm món" trên máy bán.
 *
 * Menu gốc nằm trong mã (CAFE_MENU) vì nó phải có mặt cả khi MẤT MẠNG. Nhưng
 * quầy hay phát sinh món ngay tại chỗ — mùa nào thức nấy, khách đòi thêm vị —
 * mà chờ sửa mã rồi deploy thì bán mất buổi. Nên: mã giữ menu nền, bảng này
 * giữ phần quầy thêm, máy bán gộp hai nguồn rồi CẤT VÀO MÁY để lần sau mất
 * mạng vẫn bấm được.
 *
 * Món đã bán rồi thì phiếu lưu tên + giá tại thời điểm bán (xem CafeSale), nên
 * đổi giá hay ẩn món về sau KHÔNG làm sai lịch sử.
 *
 * Ẩn món dùng `active: false` chứ không xoá: xoá hẳn là bảng thống kê theo món
 * mất chỗ tra tên, phiếu cũ thành mồ côi.
 */
export interface ICafeProduct {
  spot: string;
  /** Mã món, dạng slug — trùng với `id` trong CAFE_MENU thì bản này ĐÈ LÊN (đổi giá). */
  key: string;
  name: string;
  en: string;
  price: number;
  /** Khối nút: ca-phe · tra · do-uong · an-vat (xem CAFE_GROUPS). */
  group: string;
  /**
   * ĐỊNH MỨC: bán một phần món này rút những gì khỏi kho.
   * Bia: một dòng {bia-ha-noi, 1}. Cà phê sữa: {ca-phe-bot, 20} + {sua-dac, 30}.
   */
  uses: Array<{ key: string; qty: number }>;

  active: boolean;

  createdByUsername: string;
  createdByName: string;

  createdAt: Date;
  updatedAt: Date;
}

const CafeProductSchema = new Schema<ICafeProduct>(
  {
    spot: { type: String, default: CAFE_SPOT, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    en: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    group: { type: String, default: "do-uong" },
    uses: {
      type: [{ _id: false, key: { type: String, required: true }, qty: { type: Number, default: 0, min: 0 } }],
      default: [],
    },

    active: { type: Boolean, default: true },

    createdByUsername: { type: String, default: "" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true },
);

CafeProductSchema.index({ spot: 1, key: 1 }, { unique: true });

export const CafeProduct =
  (mongoose.models.CafeProduct as mongoose.Model<ICafeProduct>) ||
  mongoose.model<ICafeProduct>("CafeProduct", CafeProductSchema);
