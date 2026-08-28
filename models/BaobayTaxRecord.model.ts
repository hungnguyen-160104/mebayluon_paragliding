// models/BaobayTaxRecord.model.ts
import mongoose, { Schema } from "mongoose";

/**
 * HỒ SƠ XUẤT HOÁ ĐƠN VAT của MỘT booking — kế toán thuế nhặt booking nào thì
 * booking đó có một bản ghi ở đây.
 *
 * Vì sao là BẢNG RIÊNG chứ không phải mấy trường thêm trên booking:
 *
 *  1. BẢO MẬT. Bảng này mang CCCD, số hộ chiếu, mã số thuế, địa chỉ của khách
 *     — thứ chỉ kế toán thuế cần. Đặt trên booking là mọi DTO booking (quầy,
 *     điều phối, phi công) đều cõng theo, muốn giấu phải nhớ cắt ở từng chỗ
 *     một và sót một chỗ là lộ. Bảng riêng thì chỉ đúng một đường API đọc tới.
 *
 *  2. SỐ ĐÃ CHỐT VỚI THUẾ PHẢI ĐỨNG YÊN. Booking còn sống — sửa giá, huỷ bớt
 *     khách, hoàn tiền. Hoá đơn đã xuất thì không chạy theo được. Nên đây là
 *     BẢN CHỤP tại lúc kế toán thuế nhặt: sổ vận hành đổi sau đó thì bản chụp
 *     giữ nguyên, ai cần thì đối chiếu bằng mắt chứ máy không tự ghi đè.
 *
 * KHÔNG phải 100% khách đều xuất thuế — có bản ghi = đã được nhặt. Bỏ nhặt
 * là xoá bản ghi.
 */

export interface IBaobayTaxRecord {
  /** Booking gốc — mỗi booking nhiều nhất một hồ sơ thuế. */
  bookingId: mongoose.Types.ObjectId;
  spot: string;

  /** ---- Bản chụp + phần kế toán thuế gõ thêm, khớp từng cột bảng xuất ---- */
  /** Ngày khách trả tiền "YYYY-MM-DD" — cột "Ngày thu tiền". */
  collectDate: string;
  flightDate: string;
  /** Ngày huỷ, nếu booking đã huỷ. */
  cancelDate: string;
  customerName: string;
  /** Khách là CÔNG TY thì hai ô này mới có. */
  companyName: string;
  taxCode: string;
  /** Địa chỉ khách — khách nước ngoài thường ghi tên nước. */
  address: string;
  /** "TM" | "CK" | "TM/CK". */
  payMethod: string;
  guests: number;
  /**
   * TIỀN ĐÃ THU CỦA KHÁCH (VND) — số GỘP, có thuế trong đó.
   *
   * Bảng xuất cho phần mềm thuế lại cần giá CHƯA thuế ("Thành tiền" 476.852
   * trên mẫu chính là 515.000 ÷ 1,08). App giữ số gộp + thuế suất rồi TỰ TÁCH
   * lúc xuất — bắt kế toán bấm máy tính từng dòng là kiểu gì cũng có dòng lệch
   * một đồng.
   */
  amount: number;
  /**
   * Thuế suất VAT (%) của hoá đơn này. Mặc định 8 — dịch vụ đang trong diện
   * giảm 10% → 8% (Nghị quyết giảm VAT gia hạn tới hết 2026). Hết hạn giảm thì
   * kế toán đổi sang 10 ngay trên từng hồ sơ, không phải sửa app.
   */
  vatRate: number;
  currency: string;
  /** Khách cá nhân trong nước. */
  idNumber: string;
  /** Khách nước ngoài. */
  passportNo: string;
  bookingCode: string;
  agency: string;
  note: string;

  /** Ai nhặt / sửa lần cuối — để hỏi lại khi số trên hoá đơn vênh. */
  pickedBy: string;
  /**
   * LẦN XUẤT FILE GẦN NHẤT chứa hồ sơ này. Chống XUẤT TRÙNG giữa hai kỳ: một
   * booking lọt vào hai file là thành hai hoá đơn cho một khoản thu — lỗi thuế
   * thật sự, phải lập hoá đơn điều chỉnh mới gỡ được. Trang soát in rõ "đã
   * xuất file ngày …" trên những hồ sơ như vậy.
   */
  exportedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const BaobayTaxRecordSchema = new Schema<IBaobayTaxRecord>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "BaobayBooking", required: true, unique: true },
    spot: { type: String, required: true, index: true },

    collectDate: { type: String, default: "", index: true },
    flightDate: { type: String, default: "", index: true },
    cancelDate: { type: String, default: "" },
    customerName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    taxCode: { type: String, default: "" },
    address: { type: String, default: "" },
    payMethod: { type: String, default: "" },
    guests: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    vatRate: { type: Number, default: 8 },
    currency: { type: String, default: "VND" },
    idNumber: { type: String, default: "" },
    passportNo: { type: String, default: "" },
    bookingCode: { type: String, default: "" },
    agency: { type: String, default: "" },
    note: { type: String, default: "" },

    pickedBy: { type: String, default: "" },
    exportedAt: Date,
  },
  { timestamps: true },
);

export const BaobayTaxRecord =
  mongoose.models.BaobayTaxRecord ||
  mongoose.model<IBaobayTaxRecord>("BaobayTaxRecord", BaobayTaxRecordSchema);
