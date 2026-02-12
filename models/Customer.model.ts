// models/Customer.model.ts
import mongoose, { Schema } from "mongoose";

export interface ICustomer {
  phone: string; // required, unique, index
  email?: string; // optional, indexed
  fullName?: string; // optional
  lastBookingAt?: Date; // cập nhật mỗi lần đặt bay mới
  contactStatus?: "pending" | "contacted";
  contactedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    lastBookingAt: {
      type: Date,
      default: null,
    },
    contactStatus: {
      type: String,
      enum: ["pending", "contacted"],
      default: "pending",
      index: true,
    },
    contactedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes (avoid duplicating built-in indexes on phone/email)
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ contactStatus: 1 });

export const Customer =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
