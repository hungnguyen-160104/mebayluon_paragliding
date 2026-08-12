// models/BaobayReviewRequest.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * Lệnh "YÊU CẦU SOÁT LẠI" của kế toán gửi xuống nhân sự.
 *
 * Sinh ra khi kế toán thấy số liệu hai nguồn lệch nhau (flycam giữa camera man
 * và điều phối, 360/cờ đỏ/kéo cờ giữa phi công và điều phối) và muốn các bên
 * kiểm tra lại thay vì kế toán tự chọn một nguồn. Lệnh hiện thành băng rôn trên
 * trang của ĐÚNG vai trò liên quan cho tới khi kế toán đánh dấu đã xử lý —
 * hoặc tự tan khi ngày được chốt (chốt nghĩa là đã soát xong).
 */

export type ReviewTopic = "flycam" | "video360" | "redFlag" | "flagFlight" | "general";

/** Vai trò phải soát lại theo từng chủ đề — trùng với cặp đối chiếu của từng dịch vụ. */
export const REVIEW_TARGET_ROLES: Record<ReviewTopic, string[]> = {
  flycam: ["dispatcher", "cameraman"],
  video360: ["dispatcher", "pilot"],
  redFlag: ["dispatcher", "pilot"],
  flagFlight: ["dispatcher", "pilot"],
  general: ["dispatcher", "pilot", "cameraman"],
};

export const REVIEW_TOPIC_LABEL: Record<ReviewTopic, string> = {
  flycam: "Flycam",
  video360: "Camera 360",
  redFlag: "Dù cờ đỏ",
  flagFlight: "Bay kéo cờ",
  general: "Số liệu chung",
};

export interface IBaobayReviewRequest {
  spot: string;
  date: string;
  topic: ReviewTopic;
  note: string;
  requestedBy: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BaobayReviewRequestSchema = new Schema<IBaobayReviewRequest>(
  {
    spot: { type: String, default: DEFAULT_SPOT, index: true },
    date: { type: String, required: true, index: true },
    topic: {
      type: String,
      enum: ["flycam", "video360", "redFlag", "flagFlight", "general"],
      default: "general",
    },
    note: { type: String, default: "" },
    requestedBy: { type: String, required: true },
    resolvedAt: Date,
    resolvedBy: String,
  },
  { timestamps: true },
);

/** Trang nhân sự hỏi "hôm nay có lệnh nào cho tôi không" mỗi lần mở ngày. */
BaobayReviewRequestSchema.index({ spot: 1, date: 1, resolvedAt: 1 });

export const BaobayReviewRequest =
  (mongoose.models.BaobayReviewRequest as mongoose.Model<IBaobayReviewRequest>) ||
  mongoose.model<IBaobayReviewRequest>("BaobayReviewRequest", BaobayReviewRequestSchema);
