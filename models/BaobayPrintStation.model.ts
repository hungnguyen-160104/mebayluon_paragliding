// models/BaobayPrintStation.model.ts
import mongoose, { Schema } from "mongoose";

/** Nhịp tim của TRẠM IN từng điểm bay — trạm còn "thở" trong 45 giây thì coi là đang trực. */
export interface IBaobayPrintStation {
  spot: string;
  lastSeenAt: Date;
  deviceName: string;
  username: string;
  /** Kênh máy in trạm đang ghép: bluetooth / usb. */
  kenh: string;
}

const PrintStationSchema = new Schema<IBaobayPrintStation>(
  {
    spot: { type: String, required: true, unique: true },
    lastSeenAt: { type: Date, required: true },
    deviceName: { type: String, default: "" },
    username: { type: String, default: "" },
    kenh: { type: String, default: "" },
  },
  { timestamps: true },
);

export const BaobayPrintStation =
  (mongoose.models.BaobayPrintStation as mongoose.Model<IBaobayPrintStation>) ||
  mongoose.model<IBaobayPrintStation>("BaobayPrintStation", PrintStationSchema);
