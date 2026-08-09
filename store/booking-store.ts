"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  LocationKey,
  AddonKey,
  PackageKey,
  FlightTypeKey,
} from "@/lib/booking/calculate-price";

/**
 * "" = khách CHƯA chọn.
 *
 * Trước đây mặc định là "Nam", nên ô giới tính trông như đã điền và phần lớn
 * khách lướt qua — đoàn toàn nữ vẫn về hệ thống là nam. Giới tính quyết định
 * việc ghép phi công và cỡ đai ngồi nên phải là lựa chọn có ý thức.
 */
export type Gender = "Nam" | "Nữ" | "Khác";

export interface Guest {
  fullName: string;
  dob: string;
  gender: Gender | "";
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
  /**
   * false = điểm bay hiện tại chỉ là giá trị mặc định, khách CHƯA chọn.
   * Dùng khi mở /booking từ điểm bay chưa mở đặt online: giao diện hiện
   * lời nhắc chọn điểm thay vì tự chọn sẵn một điểm không liên quan.
   */
  locationChosen?: boolean;
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
  /**
   * Áp điểm bay theo tham số ?spot= trên URL (nút "Đặt bay ngay tại ..."
   * ở trang điểm bay). null = điểm bay chưa mở đặt online -> để trống.
   */
  applySpotFromUrl: (location: LocationKey | null) => void;
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
  gender: "",
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
  // Điểm bay chọn sẵn khi khách mở trang đặt bay. Đổi theo mùa cao điểm —
  // hiện tập trung cho Mù Cang Chải (đèo Khau Phạ).
  location: "khau_pha",
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
      // Xe Garrya: qty là SỐ CHIỀU (tối đa 2), không phụ thuộc số khách
      const maxQty = key === "khau_pha_garrya_pickup" ? 2 : guestsCount;
      item.qty = clampInt(item.qty, 0, maxQty);
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

  if (location === "sapa") {
    // Xe đón trả khách sạn đã gộp vào giá vé — tích sẵn cho khách
    services["sapa_hotel_pickup"] = { selected: true };
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

/**
 * Giữ lại những gì khách đã chọn/điền trong suốt phiên làm việc.
 *
 * Store nằm trong bộ nhớ nên trước đây mọi lần trang tải lại đều xoá sạch:
 * đổi ngôn ngữ website (điều hướng sang /en/booking...), lỡ tay F5, bấm quay
 * lại rồi vào lại — khách phải nhập lại từ đầu tên, số điện thoại, hộ chiếu
 * của từng người bay.
 *
 * Dùng sessionStorage chứ không phải localStorage: dữ liệu chỉ sống trong
 * tab đang đặt, đóng tab là hết. Đây là thông tin cá nhân (họ tên, ngày sinh,
 * số CCCD/hộ chiếu) nên không nên nằm lại trên máy khách sau khi họ đóng
 * trình duyệt, nhất là máy dùng chung ở khách sạn.
 *
 * skipHydration: nạp lại ở useEffect thay vì ngay lúc import. Nếu nạp sớm,
 * lần render đầu phía client sẽ khác HTML server dựng ra và React báo lỗi
 * hydrate. Đổi lại, khung sườn hiện ra với giá trị mặc định trong chớp mắt
 * rồi mới điền dữ liệu cũ vào.
 */
export const useBookingStore = create<StoreState>()(persist((set) => ({
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

  applySpotFromUrl: (location) =>
    set((s) => {
      // Khách đã đi sang bước sau thì không ghi đè lựa chọn của họ
      if (s.step > 1) return {};

      if (!location) {
        return { data: { ...s.data, locationChosen: false } };
      }

      const defaults = applyLocationDefaults(location, s.data.guestsCount || 1);
      return {
        data: {
          ...s.data,
          location,
          locationChosen: true,
          ...defaults,
          contact: {
            ...(s.data.contact ?? emptyContact),
            pickupLocation: "",
          },
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
          locationChosen: true,
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
      // Xe Garrya: qty là SỐ CHIỀU (tối đa 2), không khoá theo số khách
      const max =
        key === "khau_pha_garrya_pickup"
          ? 2
          : Math.max(1, s.data.guestsCount || 1);
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

  setBookingResult: (booking) => {
    set({ bookingResult: booking });

    // Đặt xong thì xoá bản lưu: không giữ họ tên, ngày sinh, số CCCD/hộ chiếu
    // của khách trong sessionStorage lâu hơn mức cần thiết. Phải xoá SAU khi
    // set, vì mỗi lần set là một lần ghi lại vào sessionStorage.
    if (booking) useBookingStore.persist.clearStorage();
  },
  clearBookingResult: () => set({ bookingResult: undefined }),
}), {
  name: "mbl-booking",
  version: 1,
  skipHydration: true,
  storage: createJSONStorage(() =>
    typeof window === "undefined"
      ? // Không có sessionStorage lúc render phía máy chủ.
        {
          getItem: () => null,
          setItem: () => undefined,
          removeItem: () => undefined,
        }
      : window.sessionStorage,
  ),

  /**
   * Chỉ lưu bước và dữ liệu khách nhập; `bookingResult` (kết quả trả về từ
   * máy chủ sau khi đặt xong) thì không. Vì thế bước 5 cũng không được lưu —
   * tải lại trang mà nhảy vào màn hình "đặt thành công" nhưng không có mã vé
   * thì màn hình đó rỗng. Quay về bước 4 để khách bấm xác nhận lại.
   */
  partialize: (s) => ({
    step: s.step >= 5 ? 4 : s.step,
    data: s.data,
  }),
}));