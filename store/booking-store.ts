"use client";

import { create } from "zustand";
import type {
  LocationKey,
  AddonKey,
  PackageKey,
  FlightTypeKey,
} from "@/lib/booking/calculate-price";

export type Gender = "Nam" | "Nữ" | "Khác";

export interface Guest {
  fullName: string;
  dob: string;
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
  packageKey?: PackageKey;
  flightTypeKey?: FlightTypeKey;

  addons: AddonsBool;
  addonsQty: AddonsQty;

  services: Record<string, ServiceSelection>;

  dateISO?: string;
  timeSlot?: string;
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
  goToStep: (step: Step) => void;
  reset: () => void;

  update: (partial: Partial<BookingData>) => void;
  setGuestsCount: (n: number) => void;
  setGuest: (idx: number, guest: Partial<Guest>) => void;
  setContact: (partial: Partial<ContactInfo>) => void;

  setAddonQty: (key: AddonKey, qty: number) => void;
  setAddonSelected: (key: AddonKey, selected: boolean) => void;

  setLocation: (location: LocationKey) => void;
  setPackageKey: (packageKey?: PackageKey) => void;
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

const clampStep = (n: number): Step => {
  if (n < 1) return 1;
  if (n > 5) return 5;
  return n as Step;
};

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
        item.selected = false;
      }
    }

    if (item.selected || item.qty || item.inputText) {
      next[key] = item;
    }
  });

  return next;
}

function applyLocationDefaults(
  location: LocationKey,
  guestsCount: number
): Pick<BookingData, "addons" | "addonsQty" | "services" | "packageKey" | "flightTypeKey"> {
  const services: Record<string, ServiceSelection> = {};

  if (location === "ha_noi") {
    services["ha_noi_mountain_shuttle"] = { selected: true };
  }

  if (location === "khau_pha") {
    services["khau_pha_pkg_1_shuttle"] = { selected: true };
  }

  if (location === "da_nang") {
    services["da_nang_mountain_shuttle"] = { selected: true };
  }

  return {
    addons: {},
    addonsQty: {},
    services: normalizeServicesForGuestsCount(guestsCount, services),
    packageKey: undefined,
    flightTypeKey: undefined,
  };
}

export const useBookingStore = create<StoreState>()((set) => ({
  step: 1,
  data: {
    ...defaultData,
    ...applyLocationDefaults(defaultData.location, defaultData.guestsCount),
  },
  bookingResult: undefined,

  next: () => set((s) => ({ step: clampStep(s.step + 1) })),
  back: () => set((s) => ({ step: clampStep(s.step - 1) })),
  goToStep: (step) => set({ step: clampStep(step) }),

  reset: () =>
    set(() => {
      const nextData = {
        ...defaultData,
        contact: { ...emptyContact },
        guests: [emptyGuest()],
        ...applyLocationDefaults(defaultData.location, defaultData.guestsCount),
      };

      return {
        step: 1,
        data: nextData,
        bookingResult: undefined,
      };
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

      const services = normalizeServicesForGuestsCount(
        count,
        s.data.services || {}
      );

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
        contact: {
          ...(s.data.contact ?? emptyContact),
          ...partial,
        },
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
    set((s) => {
      const defaults = applyLocationDefaults(location, s.data.guestsCount || 1);

      return {
        data: {
          ...s.data,
          location,
          ...defaults,
          contact: {
            ...(s.data.contact ?? emptyContact),
            pickupLocation: "",
          },
        },
      };
    }),

  setPackageKey: (packageKey) =>
    set((s) => {
      const nextServices = { ...(s.data.services || {}) };

      if (s.data.location === "khau_pha") {
        delete nextServices["khau_pha_pkg_1_shuttle"];
        delete nextServices["khau_pha_pkg_1_garrya_pickup"];
        delete nextServices["khau_pha_pkg_1_flag"];
        delete nextServices["khau_pha_pkg_2_tu_le_pickup"];
        delete nextServices["khau_pha_pkg_2_garrya_pickup"];

        if (packageKey === "khau_pha_pkg_1") {
          nextServices["khau_pha_pkg_1_shuttle"] = { selected: true };
        }
      }

      return {
        data: {
          ...s.data,
          packageKey,
          flightTypeKey: undefined,
          services: normalizeServicesForGuestsCount(
            s.data.guestsCount || 1,
            nextServices
          ),
        },
      };
    }),

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
        if (current.inputText || current.selected) {
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