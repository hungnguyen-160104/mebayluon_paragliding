// models/Booking.model.ts
import mongoose, { Schema } from "mongoose";

export type AddonKey = "pickup" | "flycam" | "camera360";
export type AddonsBool = Partial<Record<AddonKey, boolean>>;
export type AddonsQty = Partial<Record<AddonKey, number>>;

export interface IBooking {
  customerId: mongoose.Types.ObjectId; // reference Customer
  location: string; // key: "sapa", "da-nang", etc.
  locationName?: string; // display name
  packageKey?: string;
  flightTypeKey?: string;
  packageLabel?: string;
  flightTypeLabel?: string;
  holidayType?: string;
  dateISO?: string; // "2024-01-15" format
  timeSlot?: string; // "07:00", "09:00", etc.
  guestsCount?: number;

  // Contact info
  contact?: {
    phone?: string;
    email?: string;
    pickupLocation?: string;
    specialRequest?: string;
  };

  // Guests details
  guests?: Array<{
    fullName?: string;
    dob?: string; // yyyy-mm-dd
    gender?: string; // "Nam", "Nữ", "Khác"
    idNumber?: string;
    weightKg?: number;
    nationality?: string;
  }>;

  // Add-ons
  addons?: AddonsBool; // backward compat
  addonsQty?: AddonsQty; // qty per addon
  services?: Record<
    string,
    {
      selected?: boolean;
      qty?: number;
      inputText?: string;
    }
  >;
  selectedServices?: Array<{
    key?: string;
    label?: string;
    inputText?: string;
    fixedMapUrl?: string;
  }>;

  // Pricing
  price?: {
    currency?: string; // "VND", "USD"
    perPerson?: number; // backward
    basePerPerson?: number;
    discountPerPerson?: number;
    addonsUnitPrice?: Partial<Record<AddonKey, number>>;
    addonsTotal?: Partial<Record<AddonKey, number>>;
    total?: number;
  };

  // Status
  status?: "pending" | "confirmed" | "completed" | "cancelled"; // default "pending"

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    locationName: {
      type: String,
      trim: true,
    },
    packageKey: {
      type: String,
      trim: true,
    },
    flightTypeKey: {
      type: String,
      trim: true,
    },
    packageLabel: {
      type: String,
      trim: true,
    },
    flightTypeLabel: {
      type: String,
      trim: true,
    },
    holidayType: {
      type: String,
      trim: true,
    },
    dateISO: {
      type: String,
      trim: true,
    },
    timeSlot: {
      type: String,
      trim: true,
    },
    guestsCount: {
      type: Number,
      min: 1,
      default: 1,
    },

    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      pickupLocation: { type: String, trim: true },
      specialRequest: { type: String },
    },

    guests: [
      {
        fullName: { type: String, trim: true },
        dob: String, // "yyyy-mm-dd"
        gender: String,
        idNumber: { type: String, trim: true },
        weightKg: Number,
        nationality: String,
      },
    ],

    addons: {
      type: Map,
      of: Boolean,
    },

    addonsQty: {
      type: Map,
      of: Number,
    },

    services: {
      type: Map,
      of: {
        selected: Boolean,
        qty: Number,
        inputText: String,
      },
      default: {},
    },

    selectedServices: [
      {
        key: { type: String, trim: true },
        label: { type: String, trim: true },
        inputText: { type: String, trim: true },
        fixedMapUrl: { type: String, trim: true },
      },
    ],

    price: {
      currency: { type: String, default: "VND" },
      perPerson: Number,
      basePerPerson: Number,
      discountPerPerson: Number,
      addonsUnitPrice: {
        type: Map,
        of: Number,
      },
      addonsTotal: {
        type: Map,
        of: Number,
      },
      total: Number,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ location: 1, dateISO: 1 });
BookingSchema.index({ createdAt: -1 });

// Prevent model recompilation in Next.js
export const Booking =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
