"use client";

import { create } from "zustand";
import type { LocationKey, AddonKey } from "@/lib/booking/calculate-price";

export type Gender = "Nam" | "Nữ" | "Khác";
export type FlightTypeKey = "paragliding" | "paramotor";

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

  /**
   * Backward-compat:
   * web cũ đang đọc field này ở nhiều step.
   * Web mới sẽ ưu tiên services[key].inputText cho từng dịch vụ đón cụ thể.
   */
  pickupLocation?: string;

  specialRequest?: string;
  fullName?: string;
  contactName?: string;
}

export type AddonsBool = Partial<Record<AddonKey, boolean>>;
export type AddonsQty = Partial<Record<AddonKey, number>>;

export interface ServiceSelection {
  selected: boolean;
  qty?: number;
  inputText?: string;
}

export interface BookingData {
  location: LocationKey;
  guestsCount: number;

  /**
   * NEW:
   * - 1 điểm bay có thể có nhiều package
   * - package có thể có nhiều loại bay
   */
  packageKey?: string;
  flightTypeKey?: FlightTypeKey;

  /**
   * Backward-compat: vẫn giữ flag boolean để các file cũ chạy bình thường.
   * Flag này sẽ tự động = true nếu addonsQty[key] > 0.
   */
  addons: AddonsBool;

  /** số lượt chọn dịch vụ kiểu cũ (0..guestsCount) */
  addonsQty: AddonsQty;

  /**
   * NEW:
   * cấu trúc động cho web mới:
   * - checkbox/radio/counter theo từng service
   * - hỗ trợ inputText riêng (ví dụ địa chỉ đón)
   * - hỗ trợ nhiều dịch vụ đón khác nhau trong cùng 1 điểm bay
   */
  services: Record<string, ServiceSelection>;

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

  bookingResult?: any;

  next: () => void;
  back: () => void;
  reset: () => void;

  update: (partial: Partial<BookingData>) => void;
  setGuestsCount: (n: number) => void;
  setGuest: (idx: number, guest: Partial<Guest>) => void;
  setContact: (partial: Partial<ContactInfo>) => void;

  /**
   * Backward-compat: addon kiểu cũ
   */
  setAddonQty: (key: AddonKey, qty: number) => void;
  setAddonSelected: (key: AddonKey, selected: boolean) => void;

  /**
   * NEW: selection theo service động
   */
  setLocation: (location: LocationKey) => void;
  setPackageKey: (packageKey?: string) => void;
  setFlightTypeKey: (flightTypeKey?: FlightTypeKey) => void;

  setServiceSelected: (key: string, selected: boolean) => void;
  toggleService: (key: string) => void;
  setServiceQty: (key: string, qty: number) => void;
  setServiceInput: (key: string, inputText: string) => void;
  clearService: (key: string) => void;

  setBookingResult: (booking: any) => void;
  clearBookingResult: () => void;
}

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

const emptyGuest = (): Guest => ({
  fullName: "",
  dob: "",
  gender: "Nam",
  idNumber: "",
  weightKg: undefined,
  nationality: "",
});

const emptyContact: ContactInfo = {
  phone: "",
  email: "",
  pickupLocation: "",
  specialRequest: "",
  fullName: "",
  contactName: "",
};

const defaultData: BookingData = {
  location: "sapa",
  guestsCount: 1,
  packageKey: undefined,
  flightTypeKey: undefined,
  addons: {},
  addonsQty: {},
  services: {},
  dateISO: "",
  timeSlot: "",
  contact: { ...emptyContact },
  guests: [emptyGuest()],
  acceptedTerms: false,
};

const clampStep = (n: number): Step => (n < 1 ? 1 : n > 5 ? 5 : (n as Step));

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function ensureGuestsLength(guests: Guest[] | undefined, count: number): Guest[] {
  const safeCount = clampInt(count, 1, 100);
  const current = Array.isArray(guests) ? [...guests] : [];

  if (current.length < safeCount) {
    while (current.length < safeCount) current.push(emptyGuest());
    return current;
  }

  return current.slice(0, safeCount);
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

    // backward-compat:
    // nếu trước đây chỉ có boolean checked mà chưa có qty
    if ((qty == null || qty === 0) && nextAddons[k]) {
      qty = guestsCount;
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

function normalizeServicesForGuestsCount(
  guestsCount: number,
  services: Record<string, ServiceSelection>
): Record<string, ServiceSelection> {
  const next: Record<string, ServiceSelection> = {};

  Object.entries(services || {}).forEach(([key, value]) => {
    if (!value) return;

    const item: ServiceSelection = { ...value };

    if (typeof item.qty === "number") {
      item.qty = clampInt(item.qty, 0, guestsCount);
      if (item.qty <= 0 && item.selected) {
        // giữ selected cho checkbox/radio không có qty
        // còn nếu service kiểu counter giảm về 0 thì vẫn giữ selected=false hợp lý hơn
        item.selected = false;
      }
    }

    if (item.selected || item.qty || item.inputText) {
      next[key] = item;
    }
  });

  return next;
}

export const useBookingStore = create<StoreState>()((set) => ({
  step: 1,
  data: { ...defaultData },
  bookingResult: undefined,

  next: () => set((s) => ({ step: clampStep(s.step + 1) })),
  back: () => set((s) => ({ step: clampStep(s.step - 1) })),

  reset: () =>
    set({
      step: 1,
      data: {
        ...defaultData,
        contact: { ...emptyContact },
        guests: [emptyGuest()],
        services: {},
        addons: {},
        addonsQty: {},
      },
      bookingResult: undefined,
    }),

  update: (partial) =>
    set((s) => {
      const merged: BookingData = {
        ...s.data,
        ...partial,
        contact: partial.contact
          ? { ...(s.data.contact ?? emptyContact), ...partial.contact }
          : s.data.contact,
      };

      const guestsCount = clampInt(merged.guestsCount || 1, 1, 100);
      const guests = ensureGuestsLength(merged.guests, guestsCount);
      const { addons, addonsQty } = normalizeAddonsForGuestsCount(
        guestsCount,
        merged.addons || {},
        merged.addonsQty || {}
      );
      const services = normalizeServicesForGuestsCount(
        guestsCount,
        merged.services || {}
      );

      return {
        data: {
          ...merged,
          guestsCount,
          guests,
          addons,
          addonsQty,
          services,
        },
      };
    }),

  setGuestsCount: (n) =>
    set((s) => {
      const count = clampInt(n || 1, 1, 100);

      const guests = ensureGuestsLength(s.data.guests, count);

      const { addons, addonsQty } = normalizeAddonsForGuestsCount(
        count,
        s.data.addons,
        s.data.addonsQty
      );

      const services = normalizeServicesForGuestsCount(count, s.data.services || {});

      return {
        data: {
          ...s.data,
          guestsCount: count,
          guests,
          addons,
          addonsQty,
          services,
        },
      };
    }),

  setGuest: (idx, guest) =>
    set((s) => {
      const guests = ensureGuestsLength(s.data.guests, s.data.guestsCount || 1);
      const current = guests[idx] ?? emptyGuest();
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

      return {
        data: {
          ...s.data,
          addonsQty: nextQty,
          addons: nextAddons,
        },
      };
    }),

  setAddonSelected: (key, selected) =>
    set((s) => {
      const nextQty: AddonsQty = { ...(s.data.addonsQty || {}) };
      const nextAddons: AddonsBool = { ...(s.data.addons || {}) };
      const max = Math.max(1, s.data.guestsCount || 1);

      if (!selected) {
        delete nextQty[key];
        delete nextAddons[key];
      } else {
        nextAddons[key] = true;
        if (!nextQty[key] || nextQty[key]! <= 0) nextQty[key] = max;
      }

      return {
        data: {
          ...s.data,
          addonsQty: nextQty,
          addons: nextAddons,
        },
      };
    }),

  setLocation: (location) =>
    set((s) => ({
      data: {
        ...s.data,
        location,
        packageKey: undefined,
        flightTypeKey: undefined,
        addons: {},
        addonsQty: {},
        services: {},
        contact: {
          ...(s.data.contact ?? emptyContact),
          pickupLocation: "",
        },
      },
    })),

  setPackageKey: (packageKey) =>
    set((s) => ({
      data: {
        ...s.data,
        packageKey,
        flightTypeKey: undefined,
        services: {},
      },
    })),

  setFlightTypeKey: (flightTypeKey) =>
    set((s) => ({
      data: {
        ...s.data,
        flightTypeKey,
      },
    })),

  setServiceSelected: (key, selected) =>
    set((s) => {
      const current = s.data.services?.[key] || { selected: false };
      const nextServices = {
        ...(s.data.services || {}),
        [key]: {
          ...current,
          selected,
          qty:
            typeof current.qty === "number"
              ? clampInt(current.qty, 0, Math.max(1, s.data.guestsCount || 1))
              : current.qty,
        },
      };

      if (!selected && !nextServices[key].qty && !nextServices[key].inputText) {
        delete nextServices[key];
      }

      return {
        data: {
          ...s.data,
          services: nextServices,
        },
      };
    }),

  toggleService: (key) =>
    set((s) => {
      const current = s.data.services?.[key] || { selected: false };
      const nextSelected = !current.selected;

      const nextServices = {
        ...(s.data.services || {}),
        [key]: {
          ...current,
          selected: nextSelected,
        },
      };

      if (!nextSelected && !nextServices[key].qty && !nextServices[key].inputText) {
        delete nextServices[key];
      }

      return {
        data: {
          ...s.data,
          services: nextServices,
        },
      };
    }),

  setServiceQty: (key, qty) =>
    set((s) => {
      const max = Math.max(1, s.data.guestsCount || 1);
      const q = clampInt(qty ?? 0, 0, max);
      const current = s.data.services?.[key] || { selected: false };

      const nextServices = { ...(s.data.services || {}) };

      if (q <= 0) {
        if (current.inputText) {
          nextServices[key] = {
            ...current,
            selected: false,
            qty: 0,
          };
        } else if (current.selected) {
          nextServices[key] = {
            ...current,
            selected: false,
            qty: 0,
          };
        } else {
          delete nextServices[key];
        }
      } else {
        nextServices[key] = {
          ...current,
          selected: true,
          qty: q,
        };
      }

      return {
        data: {
          ...s.data,
          services: nextServices,
        },
      };
    }),

  setServiceInput: (key, inputText) =>
    set((s) => {
      const current = s.data.services?.[key] || { selected: false };
      return {
        data: {
          ...s.data,
          services: {
            ...(s.data.services || {}),
            [key]: {
              ...current,
              inputText,
            },
          },
        },
      };
    }),

  clearService: (key) =>
    set((s) => {
      const nextServices = { ...(s.data.services || {}) };
      delete nextServices[key];
      return {
        data: {
          ...s.data,
          services: nextServices,
        },
      };
    }),

  setBookingResult: (booking) => set({ bookingResult: booking }),
  clearBookingResult: () => set({ bookingResult: undefined }),
}));