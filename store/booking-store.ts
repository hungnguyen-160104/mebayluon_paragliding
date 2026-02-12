"use client";

import { create } from "zustand";
import type { LocationKey, AddonKey } from "@/lib/booking/calculate-price";

export type Gender = "Nam" | "Nữ" | "Khác";

export interface Guest {
  fullName: string;
  dob: string; // yyyy-mm-dd
  gender: Gender;
  idNumber?: string;
  weightKg?: number;
  nationality?: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  pickupLocation?: string;
  specialRequest?: string;
}

export type AddonsBool = Partial<Record<AddonKey, boolean>>;
export type AddonsQty = Partial<Record<AddonKey, number>>;

export interface BookingData {
  location: LocationKey;
  guestsCount: number;

  /**
   * Backward-compat: vẫn giữ flag boolean để các step khác (contact-info-step...) chạy bình thường.
   * Flag này sẽ tự động = true nếu addonsQty[key] > 0.
   */
  addons: AddonsBool;

  /** NEW: số lượt chọn dịch vụ (0..guestsCount) */
  addonsQty: AddonsQty;

  dateISO?: string;
  timeSlot?: string; // "07:00" .. "18:00"
  contact?: ContactInfo;
  guests: Guest[];
  acceptedTerms: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface StoreState {
  step: Step;
  data: BookingData;

  /** NEW: lưu booking trả về từ server (để in vé PDF) */
  bookingResult?: any;

  next: () => void;
  back: () => void;
  reset: () => void;

  update: (partial: Partial<BookingData>) => void;
  setGuestsCount: (n: number) => void;
  setGuest: (idx: number, guest: Partial<Guest>) => void;
  setContact: (partial: Partial<ContactInfo>) => void;

  /** NEW: set qty cho addon và tự clamp theo guestsCount */
  setAddonQty: (key: AddonKey, qty: number) => void;

  /** NEW: lưu booking server */
  setBookingResult: (booking: any) => void;
  clearBookingResult: () => void;
}

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

const defaultData: BookingData = {
  location: "sapa",
  guestsCount: 1,
  addons: {},
  addonsQty: {},
  dateISO: "",
  timeSlot: "",
  contact: { phone: "", email: "", pickupLocation: "", specialRequest: "" },
  guests: [],
  acceptedTerms: false,
};

const emptyContact: ContactInfo = {
  phone: "",
  email: "",
  pickupLocation: "",
  specialRequest: "",
};

const clampStep = (n: number): Step => (n < 1 ? 1 : n > 5 ? 5 : (n as Step));

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function normalizeAddonsForGuestsCount(
  guestsCount: number,
  addons: AddonsBool,
  addonsQty: AddonsQty
): { addons: AddonsBool; addonsQty: AddonsQty } {
  const nextQty: AddonsQty = { ...(addonsQty || {}) };
  const nextAddons: AddonsBool = { ...(addons || {}) };

  for (const k of ADDON_KEYS) {
    let qty = nextQty[k];

    // Backward-compat: nếu trước đây chỉ chọn checkbox boolean mà chưa có qty
    if ((qty == null || qty === 0) && nextAddons[k]) {
      qty = guestsCount; // mặc định apply cho tất cả khách
    }

    qty = clampInt(qty ?? 0, 0, guestsCount);

    if (qty <= 0) {
      delete nextQty[k];
      delete nextAddons[k];
    } else {
      nextQty[k] = qty;
      nextAddons[k] = true;
    }
  }

  return { addons: nextAddons, addonsQty: nextQty };
}

export const useBookingStore = create<StoreState>()((set, _get) => ({
  step: 1,
  data: defaultData,
  bookingResult: undefined,

  next: () => set((s) => ({ step: clampStep(s.step + 1) })),
  back: () => set((s) => ({ step: clampStep(s.step - 1) })),

  reset: () =>
    set({
      step: 1,
      data: { ...defaultData },
      bookingResult: undefined,
    }),

  update: (partial) =>
    set((s) => ({
      data: { ...s.data, ...partial },
    })),

  setGuestsCount: (n) =>
    set((s) => {
      const count = clampInt(n || 1, 1, 100);

      const guests = Array.from({ length: count }).map(
        (_, i): Guest =>
          s.data.guests[i] || {
            fullName: "",
            dob: "",
            gender: "Nam",
            idNumber: "",
            weightKg: undefined,
            nationality: "",
          }
      );

      const { addons, addonsQty } = normalizeAddonsForGuestsCount(
        count,
        s.data.addons,
        s.data.addonsQty
      );

      return { data: { ...s.data, guestsCount: count, guests, addons, addonsQty } };
    }),

  setGuest: (idx, guest) =>
    set((s) => {
      const guests = [...(s.data.guests || [])];
      const current = guests[idx] ?? {
        fullName: "",
        dob: "",
        gender: "Nam" as const,
      };
      guests[idx] = { ...current, ...guest };
      return { data: { ...s.data, guests } };
    }),

  setContact: (partial) =>
    set((s) => ({
      data: {
        ...s.data,
        contact: { ...(s.data.contact ?? emptyContact), ...partial },
      },
    })),

  setAddonQty: (key, qty) =>
    set((s) => {
      const max = Math.max(1, s.data.guestsCount || 1);
      const q = clampInt(qty ?? 0, 0, max);

      const nextQty: AddonsQty = { ...(s.data.addonsQty || {}) };
      const nextAddons: AddonsBool = { ...(s.data.addons || {}) };

      if (q <= 0) {
        delete nextQty[key];
        delete nextAddons[key];
      } else {
        nextQty[key] = q;
        nextAddons[key] = true;
      }

      return { data: { ...s.data, addonsQty: nextQty, addons: nextAddons } };
    }),

  setBookingResult: (booking) => set({ bookingResult: booking }),
  clearBookingResult: () => set({ bookingResult: undefined }),
}));
