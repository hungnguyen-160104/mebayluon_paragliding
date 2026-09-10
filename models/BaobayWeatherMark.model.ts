// models/BaobayWeatherMark.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * MỘT NGÀY ĐÃ ĐƯỢC CHẤM — chỗ máy học kinh nghiệm của chủ điểm bay.
 *
 * Mỗi bản ghi ghép hai nửa của cùng một ngày: SỐ của mô hình khí tượng (gió,
 * giật, mưa lúc ấy dự báo bao nhiêu) và NGƯỜI quyết thế nào (bay tốt · hạn chế
 * · nghỉ). Có đủ cặp ấy thì `hocNguong()` mới dò được mốc gió nào là mốc chủ
 * thật sự dừng bay — khác hẳn con số trong sách hướng dẫn.
 *
 * CHỤP LẠI SỐ NGAY LÚC CHẤM chứ không tra lại sau: dự báo cũ không truy hồi
 * được (mô hình chạy lại mỗi 6 tiếng, số hôm qua đã bị đè), mà số đúng phải là
 * số người ta NHÌN THẤY lúc quyết định, không phải số đúng nhất về sau.
 *
 * Một điểm bay một ngày một bản ghi: chấm lại thì đè lên, không cộng thêm dòng.
 */
export interface IBaobayWeatherMark {
  /** Mã điểm bay: "ha-noi" | "khau-pha" | "sapa". */
  spot: string;
  /** "YYYY-MM-DD" giờ Việt Nam. */
  date: string;
  /** Chủ chấm THỰC TẾ sau khi qua ngày: bay tốt · hạn chế · nghỉ bay. */
  verdict?: "tot" | "han-che" | "nghi";
  /**
   * DỰ BÁO CỦA CHỦ, ghi TRƯỚC khi ngày tới.
   *
   * Đây là chỗ máy học nghề nhanh nhất. Chấm thực tế chỉ nói "hôm ấy bay hay
   * nghỉ"; còn dự báo trước nói CHỦ ĐỌC TRỜI THẾ NÀO khi mới có mỗi con số —
   * đúng việc mà máy đang phải làm. So dự báo của chủ với dự báo của máy trên
   * cùng một ngày là biết máy lệch ở đâu, lệch bao nhiêu, lệch về phía nào.
   */
  forecast?: "tot" | "han-che" | "nghi";
  /** Khung giờ chủ nghĩ là đẹp, ví dụ "07:00-10:00" — để đối chiếu với khung máy đoán. */
  forecastWindow?: string;
  /** Lý do chủ dự báo như vậy: "gió đông nam, mây cao, chiều thường lên". */
  forecastNote?: string;
  forecastBy?: string;
  forecastAt?: Date;
  /** Máy chấm ngày đó ra màu gì lúc chủ dự báo — để tính xem ai đúng hơn. */
  machineVerdict?: "xanh" | "vang" | "do";
  /** Ghi chú tay: "gió xuôi sườn cả chiều", "mây thấp không thấy bãi đáp"… */
  note?: string;
  /** Số của mô hình trong khung giờ bay, chụp lúc chấm. */
  windMax?: number;
  gustMax?: number;
  rainTotal?: number;
  /** Hướng gió trội trong khung giờ bay (độ). */
  windDir?: number;
  markedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const BaobayWeatherMarkSchema = new Schema<IBaobayWeatherMark>(
  {
    spot: { type: String, required: true, index: true },
    date: { type: String, required: true },
    verdict: { type: String, enum: ["tot", "han-che", "nghi"], default: undefined },
    forecast: { type: String, enum: ["tot", "han-che", "nghi"], default: undefined },
    forecastWindow: String,
    forecastNote: String,
    forecastBy: String,
    forecastAt: Date,
    machineVerdict: { type: String, enum: ["xanh", "vang", "do"], default: undefined },
    note: { type: String, default: "" },
    windMax: Number,
    gustMax: Number,
    rainTotal: Number,
    windDir: Number,
    markedBy: { type: String, default: "" },
  },
  { timestamps: true, collection: "baobayweathermarks" },
);

/** Một điểm bay + một ngày = một bản ghi: dự báo trước và chấm sau nằm cùng dòng. */
BaobayWeatherMarkSchema.index({ spot: 1, date: 1 }, { unique: true });

export const BaobayWeatherMark =
  (mongoose.models.BaobayWeatherMark as mongoose.Model<IBaobayWeatherMark>) ||
  mongoose.model<IBaobayWeatherMark>("BaobayWeatherMark", BaobayWeatherMarkSchema);
