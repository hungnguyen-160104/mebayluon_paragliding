// models/CafeDailyReport.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/roles";
import type { CafeStockRequestDTO, ExpenseDTO } from "@/lib/baobay/types";
import { ExpenseSchema } from "@/models/DispatcherDailyReport.model";

/**
 * Báo cáo cuối ngày của MỘT người trực quầy cafe — cùng lối với điều phối bay.
 *
 * Máy bán hàng (CafeSale) đã ghi từng phiếu rồi, nhưng vẫn cần bản báo cáo này
 * vì ba việc máy bán không làm được:
 *
 *  1. NGƯỜI TRỰC KHẲNG ĐỊNH SỐ. Máy bán có thể sót phiếu (bán vội, mất mạng
 *     rồi xoá nhầm hàng đợi); cuối ca người trực đếm tiền thật rồi chốt. Hai ô
 *     tiền mặt / CK tự điền theo phiếu đã bán, gõ đè được — gõ khác là kế toán
 *     nhìn thấy chênh và hỏi lại.
 *  2. THU CHI TẠI QUẦY. Mua đá, mua sữa, trả tiền ship… đều là tiền rút từ
 *     đúng túi tiền bán hàng, phải trừ vào phần người trực đang giữ hộ.
 *  3. YÊU CẦU NHẬP HÀNG. Hết hàng thì ghi vào đây (tên hàng – số lượng – ghi
 *     chú), kế toán/quản lý mở bảng ngày là thấy, nhập xong bấm "đã nhập".
 *
 * Mỗi người mỗi ngày một bản ghi (chỉ mục duy nhất accountId + date + spot) để
 * kế toán không cộng trùng — y như phi công và camera man.
 */
export interface ICafeDailyReport {
  accountId: mongoose.Types.ObjectId;
  username: string;
  staffName: string;
  spot: string;

  /** Ngày trực, "YYYY-MM-DD" giờ Việt Nam. */
  date: string;
  /** Quầy trực hôm đó — "bai-ha" (bãi hạ) / "bai-cat" (bãi cất), xem lib/baobay/cafe.ts. */
  counter: string;

  /**
   * Tiền bán hàng thu được trong ca. Tự điền theo phiếu máy bán của đúng quầy
   * + đúng ngày, người trực gõ đè được khi đếm tiền thật ra số khác.
   */
  cashReceived: number;
  transferReceived: number;

  /**
   * Thu / chi tại quầy — mỗi dòng: nội dung – số tiền – thu hay chi – tiền mặt
   * hay CK – ghi chú. Giống hệt khối THU CHI của điều phối bay.
   */
  expenses: ExpenseDTO[];

  /** Yêu cầu nhập hàng: tên hàng – số lượng – ghi chú, kèm dấu "đã nhập". */
  stockRequests: CafeStockRequestDTO[];

  note?: string;

  /** Đã CHỐT hay còn NHÁP — người trực nhập rải rác suốt ca như quầy vé. */
  submitted: boolean;
  submittedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Một dòng yêu cầu nhập hàng.
 *
 * `id` do MÁY CHỦ sinh và giữ nguyên qua các lần lưu: người nhập hàng bấm "đã
 * nhập" theo id chứ không theo vị trí dòng — người trực thêm/bớt dòng khác
 * trong lúc đó thì đánh dấu theo vị trí sẽ trúng nhầm hàng.
 */
const CafeStockRequestSchema = new Schema<CafeStockRequestDTO>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: String, default: "" },
    note: { type: String, default: "" },
    sent: { type: Boolean, default: false },
    sentAt: Date,
    done: { type: Boolean, default: false },
    doneBy: String,
    doneAt: Date,
  },
  { _id: false },
);

const CafeDailyReportSchema = new Schema<ICafeDailyReport>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "BaobayAccount", required: true },
    username: { type: String, required: true },
    staffName: { type: String, required: true },
    spot: { type: String, default: DEFAULT_SPOT },

    date: { type: String, required: true, index: true },
    counter: { type: String, default: "bai-ha" },

    cashReceived: { type: Number, default: 0, min: 0 },
    transferReceived: { type: Number, default: 0, min: 0 },

    expenses: { type: [ExpenseSchema], default: [] },
    stockRequests: { type: [CafeStockRequestSchema], default: [] },

    note: String,

    submitted: { type: Boolean, default: false },
    submittedAt: Date,
  },
  { timestamps: true },
);

CafeDailyReportSchema.index({ accountId: 1, date: 1, spot: 1 }, { unique: true });
CafeDailyReportSchema.index({ spot: 1, date: 1 });
/** Kế toán hỏi "còn yêu cầu nhập hàng nào chưa làm" — chỉ mục đúng câu đó. */
CafeDailyReportSchema.index({ spot: 1, "stockRequests.done": 1, date: -1 });

export const CafeDailyReport =
  (mongoose.models.CafeDailyReport as mongoose.Model<ICafeDailyReport>) ||
  mongoose.model<ICafeDailyReport>("CafeDailyReport", CafeDailyReportSchema);
