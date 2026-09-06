// models/PilotDailyReport.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/roles";
import type { ExpenseDTO, MerchSaleDTO } from "@/lib/baobay/types";
import { ExpenseSchema, MerchSaleSchema } from "@/models/DispatcherDailyReport.model";

/**
 * Báo cáo cuối ngày của MỘT phi công.
 *
 * Mỗi phi công mỗi ngày đúng một bản ghi (chỉ mục duy nhất accountId + date):
 * bay xong mới ngồi nhập, nhập thiếu thì mở lại sửa. Nếu cho tạo nhiều bản ghi
 * cùng ngày thì kế toán sẽ cộng trùng số chuyến mà không ai phát hiện.
 *
 * Phi công khai CẢ dịch vụ gia tăng mình đã bay (flycam, 360, cờ đỏ, kéo cờ) —
 * nhưng chỉ SỐ LƯỢNG là bắt buộc, mã vé để trống được. Số này dùng để đối soát
 * chéo: 360/cờ đỏ/kéo cờ so trực tiếp với điều phối, riêng flycam thì cặp chính
 * là điều phối ↔ camera man, số của phi công chỉ mang ra khi hai bên kia lệch.
 *
 * `pilotName` là bản chụp tên lúc nhập, cố ý lặp lại dữ liệu của tài khoản: sau
 * này đổi tên hiển thị thì báo cáo cũ vẫn giữ đúng tên người đã bay.
 */
export interface IPilotDailyReport {
  accountId: mongoose.Types.ObjectId;
  username: string;
  pilotName: string;
  spot: string;

  /** Ngày bay, "YYYY-MM-DD" theo giờ Việt Nam (xem lib/baobay/date.ts). */
  date: string;

  /** Số chuyến phi công tự khai — phải bằng số mã vé mới chốt được. */
  flightCount: number;
  /** Mã vé đã bay, đã chuẩn hoá in hoa và bỏ trùng. */
  ticketCodes: string[];

  /**
   * Dịch vụ gia tăng phi công khai. Mã vé KHÔNG bắt buộc: đối soát bình thường
   * chỉ so SỐ LƯỢNG giữa các bên; mã vé chỉ dùng khi số lệch, lúc đó kế toán
   * mới yêu cầu các bên bổ sung mã để dò ra vé nào sai.
   */
  flycam: number;
  flycamCodes: string[];
  video360: number;
  video360Codes: string[];
  redFlag: number;
  redFlagCodes: string[];
  /** Bay hoàng hôn — Hà Nội & Khau Phạ (Mù Cang Chải). */
  sunset: number;
  sunsetCodes: string[];
  /** Số chuyến bay kéo cờ. */
  flagFlight: number;
  flagFlightCodes: string[];

  /** Khách ngoại giao (không thu tiền) nhưng vẫn xuất vé. */
  diplomaticGuests: number;
  diplomaticCodes: string[];
  /** Khách ngoại giao KHÔNG xuất vé (vẫn bay) — ghi chú có vé / không vé. */
  diplomaticNoTicket: number;
  /** Ghi chú khách ngoại giao — đoàn nào, có vé hay không vé, ai duyệt. */
  diplomaticNote?: string;

  /** Tiền phi công đã bỏ ra trong ngày — để trống nếu không có. */
  /**
   * Phí bãi bay tính THEO ĐẦU KHÁCH — khai số khách, kế toán nhân đơn giá bên
   * ngoài (trước đây là số tiền; đổi theo lệnh chủ hệ thống 12/08/2026).
   */
  siteFeeGuests: number;
  waterCost: number;
  guestCarCost: number;
  /**
   * Ba khoản đi lại PHI CÔNG TỰ TRẢ TIỀN khi đi bay, khai theo SỐ LƯỢT — đơn
   * giá do kế toán nhân bên ngoài (app không giữ đơn giá), cuối kỳ hoàn lại.
   */
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;

  /**
   * Chuyến PPG (dù lượn có động cơ) — mặc định mọi chuyến ở trên là PG.
   * Vé KHÔNG bắt buộc, nhưng đã bay có vé thì phải khai mã; chuyến không vé
   * khai vào `ppgNoTicket`. Ràng buộc: ppgCodes.length + ppgNoTicket = ppgFlights.
   */
  ppgFlights: number;
  ppgCodes: string[];
  /**
   * SUẤT ĂN & XE trong ngày làm — phi công tự khai để cuối ngày/tháng công ty
   * thanh toán với nhà bếp và đội xe (lệnh chủ 31/08/2026: "5 xe ôm 3 ô tô").
   * Suất ăn đếm THEO BỮA của chính phi công; xe đếm theo LƯỢT đi lên núi.
   */
  mealBreakfast: number;
  mealLunch: number;
  mealDinner: number;
  motorbikeRides: number;
  carRides: number;
  ppgNoTicket: number;
  /** Các khoản chi khác: nội dung – số tiền – ghi chú. */
  /** Khách huỷ / dời lịch PHI CÔNG báo (kèm mã vé ở điểm có vé) — kênh phụ, điều phối vẫn là nguồn chính. */
  cancelledGuestEntries?: Array<{ name: string; bookingCode: string; guests: number; source: string; refund: number; note?: string; codes?: string[] }>;
  rescheduledGuestEntries?: Array<{ name: string; guests: number; toDate: string; note?: string; phone?: string; pickup?: string; pickupNote?: string; expectedTime?: string; codes?: string[]; bookedId?: string }>;
  expenses: ExpenseDTO[];
  /** Hàng bán thêm tại bãi (áo, khăn, cốm…) — xem models/BaobayMerchItem.model.ts. */
  merchSales: MerchSaleDTO[];

  note?: string;

  /**
   * Phi công đã bấm "Chốt báo cáo" chưa.
   *
   * Lưu nháp thì lúc nào cũng được (bay xong nhập tạm giữa buổi), nhưng kế toán
   * chỉ chốt được ngày khi MỌI phi công đã chốt và mã vé không còn lỗi — chốt là
   * lời khẳng định "số của tôi xong rồi, soát được".
   */
  submitted: boolean;
  submittedAt?: Date;
  /**
   * Thời điểm bấm chốt LẦN ĐẦU — ghi một lần, không bao giờ đổi. Phạt nộp muộn
   * tính theo mốc này: đã chốt kịp giờ một lần thì sửa + chốt lại sau đó không
   * bị phạt oan ("không tính giờ sửa báo cáo").
   */
  firstSubmittedAt?: Date;
  /** Chốt lần đầu sau giờ quy định (và có chuyến bay) — bị phạt. */
  lateSubmit: boolean;
  /**
   * Tiền phạt nộp muộn THỰC THU, hiện là 200.000đ/lần; 0 nếu đúng giờ, 0 chuyến,
   * hoặc kế toán đã huỷ lệnh phạt. Mọi bảng lương/báo cáo đọc thẳng số này.
   */
  latePenalty: number;
  /**
   * Kế toán huỷ lệnh phạt (nhập bù hộ, phi công mất sóng, lý do chính đáng…).
   * Giữ nguyên `lateSubmit: true` để còn dấu vết là hôm đó có nộp muộn —
   * chỉ số tiền về 0.
   */
  latePenaltyWaived: boolean;
  latePenaltyWaivedBy?: string;
  latePenaltyWaivedAt?: Date;
  latePenaltyWaiveReason?: string;
  /**
   * PHẠT LỖI BÁO CÁO (luật chủ 04/09): kế toán gắn cờ 200k khi báo cáo sai
   * (khai trùng mã, sai mã, khai thiếu/dư chuyến…). Khác phạt nộp muộn — hai
   * khoản độc lập, cùng trừ vào bảng lương.
   */
  errorPenalty?: number;
  errorPenaltyReason?: string;
  errorPenaltyBy?: string;
  errorPenaltyAt?: Date;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PilotDailyReportSchema = new Schema<IPilotDailyReport>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "BaobayAccount", required: true },
    username: { type: String, required: true },
    pilotName: { type: String, required: true },
    spot: { type: String, default: DEFAULT_SPOT },

    date: { type: String, required: true, index: true },

    flightCount: { type: Number, default: 0, min: 0 },
    ticketCodes: { type: [String], default: [] },

    flycam: { type: Number, default: 0, min: 0 },
    flycamCodes: { type: [String], default: [] },
    video360: { type: Number, default: 0, min: 0 },
    video360Codes: { type: [String], default: [] },
    redFlag: { type: Number, default: 0, min: 0 },
    redFlagCodes: { type: [String], default: [] },
    sunset: { type: Number, default: 0, min: 0 },
    sunsetCodes: { type: [String], default: [] },
    flagFlight: { type: Number, default: 0, min: 0 },
    flagFlightCodes: { type: [String], default: [] },

    diplomaticGuests: { type: Number, default: 0, min: 0 },
    diplomaticCodes: { type: [String], default: [] },
    diplomaticNoTicket: { type: Number, default: 0, min: 0 },
    diplomaticNote: { type: String, default: "" },

    siteFeeGuests: { type: Number, default: 0, min: 0 },
    waterCost: { type: Number, default: 0, min: 0 },
    guestCarCost: { type: Number, default: 0, min: 0 },
    pickupBigC: { type: Number, default: 0, min: 0 },
    pickupHotel: { type: Number, default: 0, min: 0 },
    mountainTrips: { type: Number, default: 0, min: 0 },
    ppgFlights: { type: Number, default: 0, min: 0 },
    ppgCodes: { type: [String], default: [] },
    ppgNoTicket: { type: Number, default: 0, min: 0 },
    mealBreakfast: { type: Number, default: 0, min: 0 },
    mealLunch: { type: Number, default: 0, min: 0 },
    mealDinner: { type: Number, default: 0, min: 0 },
    motorbikeRides: { type: Number, default: 0, min: 0 },
    carRides: { type: Number, default: 0, min: 0 },
    cancelledGuestEntries: {
      type: [
        new Schema(
          {
            name: { type: String, default: "" },
            bookingCode: { type: String, default: "" },
            guests: { type: Number, default: 0, min: 0 },
            source: { type: String, default: "" },
            refund: { type: Number, default: 0, min: 0 },
            note: { type: String, default: "" },
            codes: { type: [String], default: [] },
            noTicket: { type: Boolean, default: false },
            paid: { type: Number, default: 0, min: 0 },
            refundMethod: { type: String, enum: ["cash", "transfer"], default: "transfer" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    rescheduledGuestEntries: {
      type: [
        new Schema(
          {
            name: { type: String, default: "" },
            guests: { type: Number, default: 0, min: 0 },
            toDate: { type: String, default: "" },
            note: { type: String, default: "" },
            phone: { type: String, default: "" },
            pickup: { type: String, enum: ["self", "other"], default: "self" },
            pickupNote: { type: String, default: "" },
            expectedTime: { type: String, default: "" },
            codes: { type: [String], default: [] },
            bookedId: { type: String, default: "" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    expenses: { type: [ExpenseSchema], default: [] },
    merchSales: { type: [MerchSaleSchema], default: [] },

    note: String,

    submitted: { type: Boolean, default: false },
    submittedAt: Date,
    firstSubmittedAt: Date,
    lateSubmit: { type: Boolean, default: false },
    latePenalty: { type: Number, default: 0, min: 0 },
    latePenaltyWaived: { type: Boolean, default: false },
    latePenaltyWaivedBy: String,
    latePenaltyWaivedAt: Date,
    latePenaltyWaiveReason: String,
    errorPenalty: { type: Number, default: 0, min: 0 },
    errorPenaltyReason: String,
    errorPenaltyBy: String,
    errorPenaltyAt: Date,

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

/**
 * Một người – một ngày – một ĐIỂM BAY là một bản ghi. Có điểm bay trong khoá vì
 * mỗi điểm là một hệ thống riêng; cùng ngày mà người đó làm ở điểm khác thì đó
 * là báo cáo khác, không phải bản ghi đè.
 */
PilotDailyReportSchema.index({ accountId: 1, date: 1, spot: 1 }, { unique: true });
PilotDailyReportSchema.index({ spot: 1, date: 1 });

export const PilotDailyReport =
  (mongoose.models.PilotDailyReport as mongoose.Model<IPilotDailyReport>) ||
  mongoose.model<IPilotDailyReport>("PilotDailyReport", PilotDailyReportSchema);
