// models/CameramanDailyReport.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/roles";
import type { ExpenseDTO } from "@/lib/baobay/types";
import { ExpenseSchema } from "@/models/DispatcherDailyReport.model";

/**
 * Báo cáo cuối ngày của MỘT camera man.
 *
 * Chỉ một con số chính: số chuyến bay có quay flycam. Con số này phải khớp với
 * số điều phối bay báo — nhưng KHÔNG chặn cứng: khách hay phát sinh dịch vụ gia
 * tăng ngay tại bãi cất cánh, quầy chưa kịp ghi. Lệch thì kế toán xem rồi bấm
 * "chấp nhận lệch" khi chốt ngày (xem AccountantDailyClose.flycamVarianceNote).
 *
 * Mã vé để trống được: camera man không giữ liên bay dù. Nếu ghi được thì càng
 * tốt, kế toán đối chiếu tới từng vé.
 */
export interface ICameramanDailyReport {
  accountId: mongoose.Types.ObjectId;
  username: string;
  cameramanName: string;
  spot: string;

  date: string;

  /** Nội dung quay 1: FLYCAM — số chuyến đã quay trong ngày. */
  flycamFlights: number;
  /** Mã vé đã quay flycam, nếu ghi được. */
  flycamCodes: string[];
  /** Nội dung quay 2: QUAY DÙ LƯỢN — số lượng + mã vé. */
  paraglidingFlights: number;
  paraglidingCodes: string[];

  expenses: ExpenseDTO[];
  note?: string;

  submitted: boolean;
  submittedAt?: Date;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CameramanDailyReportSchema = new Schema<ICameramanDailyReport>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "BaobayAccount", required: true },
    username: { type: String, required: true },
    cameramanName: { type: String, required: true },
    spot: { type: String, default: DEFAULT_SPOT },

    date: { type: String, required: true, index: true },

    flycamFlights: { type: Number, default: 0, min: 0 },
    flycamCodes: { type: [String], default: [] },
    paraglidingFlights: { type: Number, default: 0, min: 0 },
    paraglidingCodes: { type: [String], default: [] },

    expenses: { type: [ExpenseSchema], default: [] },
    note: String,

    submitted: { type: Boolean, default: false },
    submittedAt: Date,

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

CameramanDailyReportSchema.index({ accountId: 1, date: 1, spot: 1 }, { unique: true });
CameramanDailyReportSchema.index({ spot: 1, date: 1 });

export const CameramanDailyReport =
  (mongoose.models.CameramanDailyReport as mongoose.Model<ICameramanDailyReport>) ||
  mongoose.model<ICameramanDailyReport>("CameramanDailyReport", CameramanDailyReportSchema);
