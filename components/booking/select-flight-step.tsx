"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import {
  useBookingStore,
  type ServiceSelection,
} from "@/store/booking-store";
import {
  LOCATIONS,
  computePriceByLang,
  type LocationKey,
  type AddonKey,
  type PackageKey,
  type FlightTypeKey,
} from "@/lib/booking/calculate-price";
import {
  useBookingText,
  useLangCode,
  type LangCode,
} from "@/lib/booking/translations-booking";
import {
  HOMESTAY_URL,
  getSelectFlightStepLocale,
  type BookingLang,
} from "@/lib/i18n/select-flight-step";

type ServiceConfig =
  NonNullable<(typeof LOCATIONS)[LocationKey]["services"]>[number];

type NormalizedPackage = {
  key: PackageKey;
  label: string;
  subtitle: string;
  priceVND: number | null;
  priceUSD: number | null;
};

type TextLine = {
  text: string;
  tone?: "white" | "red" | "green" | "dark";
  href?: string;
};

type ServiceMeta = {
  id:
    | "sapa_hotel_pickup"
    | "hanoi_fixed_pickup"
    | "hanoi_private_pickup"
    | "hanoi_mountain_shuttle"
    | "khau_pha_flag"
    | "khau_pha_paragliding_shuttle"
    | "khau_pha_paragliding_garrya_pickup"
    | "khau_pha_paramotor_tu_le_pickup"
    | "khau_pha_paramotor_garrya_pickup"
    | "da_nang_mountain_shuttle"
    | "da_nang_hotel_pickup"
    | "quan_ba_pickup"
    | "sunset"
    | "generic";
  exclusiveGroup?: string;
  defaultSelected?: boolean;
  requiresInput?: boolean;
  inputLabel?: string;
  showQty?: boolean;
  readonlyQty?: boolean;
  priceText: string;
  lines: TextLine[];
  activeNoteLines?: TextLine[];
  warningWhenUnchecked?: string;
  lineTotalVND: (
    basePriceVND: number,
    guestsCount: number,
    qty: number,
  ) => number;
  lineTotalUSD: (
    basePriceUSD: number,
    guestsCount: number,
    qty: number,
  ) => number;
  summaryText: (label: string, qty: number, guestsCount: number) => string;
};

type FooterLink = {
  label: string;
  url: string;
  tone?: "red" | "blue";
};

const LOCATION_ORDER: LocationKey[] = [
  "ha_noi",
  "khau_pha",
  "sapa",
  "quan_ba",
  "da_nang",
];

const KHAU_PHA_PACKAGES = {
  weekday: "khau_pha_pkg_1" as PackageKey,
  weekend: "khau_pha_pkg_2" as PackageKey,
  paramotor: "khau_pha_paramotor" as PackageKey,
};

const ADDON_KEYS: AddonKey[] = ["flycam", "camera360"];

const LOCATION_CARD_PRICE_META: Record<LocationKey, number> = {
  ha_noi: 1_690_000,
  khau_pha: 2_120_000,
  sapa: 2_090_000,
  quan_ba: 2_090_000,
  da_nang: 1_690_000,
};

function clampInt(value: unknown, min: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function getText(value: unknown, lang: BookingLang, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, string | undefined>;
    return obj[lang] || obj.en || obj.vi || fallback;
  }
  return fallback;
}

function safeLines(lines?: string[]) {
  return (lines || []).filter(Boolean);
}

function getOrderedLocations() {
  const available = new Set(
    Object.values(LOCATIONS).map((loc) => loc.key as LocationKey),
  );
  const ordered = LOCATION_ORDER.filter((key) => available.has(key));
  const rest = Object.values(LOCATIONS)
    .map((loc) => loc.key as LocationKey)
    .filter((key) => !ordered.includes(key));
  return [...ordered, ...rest];
}

function normalizePackages(
  rawPackages: unknown,
  lang: BookingLang,
): NormalizedPackage[] {
  const list = Array.isArray(rawPackages)
    ? rawPackages
    : rawPackages && typeof rawPackages === "object"
      ? Object.values(rawPackages as Record<string, unknown>)
      : [];

  return list
    .map((item) => {
      const pkg = item as Record<string, unknown>;
      const key = (pkg.key || pkg.id || pkg.packageKey) as
        | PackageKey
        | undefined;
      if (!key) return null;

      return {
        key,
        label: getText(pkg.label || pkg.name || pkg.title, lang, String(key)),
        subtitle: getText(pkg.subtitle || pkg.description, lang, ""),
        priceVND:
          typeof pkg.priceVND === "number"
            ? pkg.priceVND
            : typeof pkg.pricePerPersonVND === "number"
              ? pkg.pricePerPersonVND
              : null,
        priceUSD:
          typeof pkg.priceUSD === "number"
            ? pkg.priceUSD
            : typeof pkg.pricePerPersonUSD === "number"
              ? pkg.pricePerPersonUSD
              : null,
      };
    })
    .filter((item): item is NormalizedPackage => item !== null);
}

function formatVND(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function formatUsdTotal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "";
  return `($${value.toFixed(2)})`;
}

function formatCardFromPrice(value: number) {
  const thousands = Math.round(value / 1000);
  return `${thousands.toLocaleString("vi-VN")}k/pax`;
}

function getServiceState(data: any, key: string): ServiceSelection {
  const service = data?.services?.[key];
  return service ? (service as ServiceSelection) : { selected: false };
}

function getKhauPhaPackages(packages: NormalizedPackage[]) {
  return {
    weekday:
      packages.find((pkg) => pkg.key === KHAU_PHA_PACKAGES.weekday) || null,
    weekend:
      packages.find((pkg) => pkg.key === KHAU_PHA_PACKAGES.weekend) || null,
    paramotor:
      packages.find((pkg) => pkg.key === KHAU_PHA_PACKAGES.paramotor) || null,
  };
}

function getFooterConfig(
  location: LocationKey | undefined,
  flightType: FlightTypeKey | undefined,
  ui: ReturnType<typeof getSelectFlightStepLocale>["ui"],
) {
  if (!location) {
    return {
      inlineLinks: [] as FooterLink[],
      note: "",
    };
  }

  if (location === "ha_noi") {
    return {
      inlineLinks: [
        {
          label: ui.mapDoiBuLabel,
          url: "https://maps.app.goo.gl/G6qiswNYP3dyVzUf7",
          tone: "red",
        },
        {
          label: ui.mapVienNamLabel,
          url: "https://maps.app.goo.gl/mSpHDeqJ919AVJdn7",
          tone: "red",
        },
        {
          label: ui.mapGoThangLongLabel,
          url: "https://maps.app.goo.gl/3vB2qYuThwBASQZj8",
          tone: "blue",
        },
      ],
      note: "",
    };
  }

  if (location === "khau_pha") {
    if (flightType === "paramotor") {
      return {
        inlineLinks: [
          {
            label: ui.mapKhauPhaClubhouseLabel,
            url: "https://maps.app.goo.gl/QJWD6Em4b9RYYQMc8",
            tone: "blue",
          },
        ],
        note: "",
      };
    }

    return {
      inlineLinks: [
        {
          label: ui.mapKhauPhaTakeoffLabel,
          url: "https://maps.app.goo.gl/Z9X6BnNV4eaUKTE29",
          tone: "red",
        },
        {
          label: ui.mapKhauPhaLandingLabel,
          url: "https://maps.app.goo.gl/QJWD6Em4b9RYYQMc8",
          tone: "blue",
        },
      ],
      note: "",
    };
  }

  if (location === "da_nang") {
    return {
      inlineLinks: [
        {
          label: ui.mapDaNangTakeoffLabel,
          url: "https://maps.app.goo.gl/6NDgTSg8PZb5BtGX8",
          tone: "red",
        },
        {
          label: ui.mapDaNangLandingLabel,
          url: "https://maps.app.goo.gl/ETF9PiL4ijd5hYKQ6",
          tone: "blue",
        },
      ],
      note: "",
    };
  }

  if (location === "sapa") {
    return {
      inlineLinks: [
        {
          label: ui.mapSapaTakeoffLabel,
          url: "https://maps.app.goo.gl/bGtKFTuxyZvJhsJZ9",
          tone: "red",
        },
        {
          label: ui.mapSapaLandingLabel,
          url: "https://maps.app.goo.gl/mYnh4KJVk3aQZLYC6",
          tone: "blue",
        },
      ],
      note: "",
    };
  }

  if (location === "quan_ba") {
    return {
      inlineLinks: [],
      note: ui.noMapInfo,
    };
  }

  return {
    inlineLinks: [] as FooterLink[],
    note: "",
  };
}

function ToggleIndicator({
  checked,
  variant = "checkbox",
}: {
  checked: boolean;
  variant?: "checkbox" | "radio";
}) {
  const rounded =
    variant === "radio" ? "rounded-full" : "rounded-[4px]";

  return (
    <span
      className={[
        "mt-0.5 inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center border-[3px] bg-white",
        rounded,
        checked ? "border-[#3137c9]" : "border-[#413fb8]",
      ].join(" ")}
    >
      {checked ? (
        variant === "radio" ? (
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff3b1d]" />
        ) : (
          <span className="text-[18px] leading-none text-[#ff3b1d]">✔</span>
        )
      ) : null}
    </span>
  );
}

function QtyButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[20px] font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function QuantityBox({
  value,
  onMinus,
  onPlus,
  disableMinus,
  disablePlus,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  disableMinus?: boolean;
  disablePlus?: boolean;
}) {
  return (
    <div className="flex h-10 items-center rounded-[10px] border border-slate-300 bg-white px-2 shadow-sm">
      <QtyButton onClick={onMinus} disabled={disableMinus}>
        −
      </QtyButton>
      <span className="min-w-[20px] text-center text-[18px] font-bold text-[#d92727]">
        {value}
      </span>
      <QtyButton onClick={onPlus} disabled={disablePlus}>
        +
      </QtyButton>
    </div>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0d78b8] px-3 py-2.5 text-[16px] font-bold text-white md:px-4 md:text-[19px]">
      * {children}:
    </div>
  );
}

function InlineAddressInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 border-[3px] border-[#f03a17] bg-white px-3 py-2 text-[15px] font-bold text-black sm:ml-11 sm:border-4 sm:text-[16px]">
      <label className="flex flex-wrap items-center gap-2">
        <span>{label}:</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 sm:min-w-56 sm:text-[16px]"
          placeholder={placeholder}
        />
      </label>
    </div>
  );
}

function PackageDayCard({
  active,
  title,
  price,
  onClick,
}: {
  active: boolean;
  title: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full border px-3 py-2 text-left sm:min-w-[240px] sm:flex-1",
        active
          ? "border-[#87db3c] bg-[#94f243]"
          : "border-[#87db3c] bg-[#a4f567]",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <ToggleIndicator checked={active} variant="radio" />
        <div>
          <div className="text-[14px] font-bold leading-5 text-black">
            {title}
          </div>
          <div className="text-[13px] font-bold text-[#e53935]">{price}</div>
        </div>
      </div>
    </button>
  );
}

function toneClass(tone?: TextLine["tone"]) {
  if (tone === "red") return "text-[#ef2f1e]";
  if (tone === "green") return "text-[#188f25]";
  if (tone === "dark") return "text-[#0b3a61]";
  return "text-white";
}

function getServiceMeta(
  svc: ServiceConfig,
  lang: BookingLang,
  ui: ReturnType<typeof getSelectFlightStepLocale>["ui"],
): ServiceMeta {
  const key = String(svc.key || "");
  const descriptionLines = safeLines(
    getText(svc.description, lang, "").split("\n"),
  );
  const noteLines = safeLines(getText(svc.note, lang, "").split("\n"));
  const priceVND = Number(svc.priceVND || 0);

  if (key === "sapa_hotel_pickup") {
    return {
      id: "sapa_hotel_pickup",
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      showQty: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      lineTotalVND: (base, _guests, qty) => base * qty,
      lineTotalUSD: (base, _guests, qty) => base * qty,
      summaryText: (name, qty) => `${name}${qty > 1 ? ` x${qty}` : ""}`,
    };
  }

  if (key === "ha_noi_fixed_pickup") {
    return {
      id: "hanoi_fixed_pickup",
      exclusiveGroup: "ha_noi_pickup_group",
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: [],
      activeNoteLines: [
        {
          text: ui.optionalServicesFixedPickupLocation,
          tone: "white",
          href: "https://maps.app.goo.gl/3vB2qYuThwBASQZj8",
        },
        {
          text: ui.optionalServicesFixedPickupDeparture,
          tone: "white",
        }
      ],
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "ha_noi_private_hotel_pickup") {
    return {
      id: "hanoi_private_pickup",
      exclusiveGroup: "ha_noi_pickup_group",
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      priceText: "1.500.000 đ / xe 4 chỗ",
      lines: [],
      activeNoteLines: [
        { text: ui.optionalServicesPrivatePickupNote1, tone: "white" },
        { text: ui.optionalServicesPrivatePickupNote2, tone: "white" },
        { text: ui.optionalServicesPrivatePickupNote3, tone: "white" },
      ],
      lineTotalVND: (_base, guests) =>
        1_500_000 + Math.max(0, guests - 3) * 350_000,
      lineTotalUSD: (_base, guests) =>
        60 + Math.max(0, guests - 3) * 14,
      summaryText: (name) => name,
    };
  }

  if (key === "ha_noi_mountain_shuttle") {
    return {
      id: "hanoi_mountain_shuttle",
      defaultSelected: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: [],
      activeNoteLines: [
        { text: ui.optionalServicesMountainShuttleDesc, tone: "white" }
      ],
      warningWhenUnchecked: ui.hanoiMountainWarning,
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "khau_pha_flag") {
    return {
      id: "khau_pha_flag",
      showQty: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: [],
      lineTotalVND: (base, _guests, qty) => base * qty,
      lineTotalUSD: (base, _guests, qty) => base * qty,
      summaryText: (name, qty) => `${name}${qty > 1 ? ` x${qty}` : ""}`,
    };
  }

  if (key === "khau_pha_paragliding_shuttle") {
    return {
      id: "khau_pha_paragliding_shuttle",
      exclusiveGroup: "khau_pha_paragliding_pickup",
      defaultSelected: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "khau_pha_paragliding_garrya_pickup") {
    return {
      id: "khau_pha_paragliding_garrya_pickup",
      exclusiveGroup: "khau_pha_paragliding_pickup",
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      showQty: true,
      readonlyQty: true,
      priceText: "700.000 đ/xe 4 chỗ/1 chiều",
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      activeNoteLines: noteLines.map((text) => ({
        text: `• ${text}`,
        tone: "red",
      })),
      lineTotalVND: (_base, guests) => Math.ceil(guests / 4) * 700_000,
      lineTotalUSD: (_base, guests) => Math.ceil(guests / 4) * 28,
      summaryText: (name, qty) => `${name} (${qty} ${ui.carUnit})`,
    };
  }

  if (key === "khau_pha_paramotor_tu_le_pickup") {
    return {
      id: "khau_pha_paramotor_tu_le_pickup",
      exclusiveGroup: "khau_pha_paramotor_pickup",
      defaultSelected: true,
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "khau_pha_paramotor_garrya_pickup") {
    return {
      id: "khau_pha_paramotor_garrya_pickup",
      exclusiveGroup: "khau_pha_paramotor_pickup",
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      showQty: true,
      readonlyQty: true,
      priceText: "700.000 đ/xe 4 chỗ/1 chiều",
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      activeNoteLines: noteLines.map((text) => ({
        text: `• ${text}`,
        tone: "red",
      })),
      lineTotalVND: (_base, guests) => Math.ceil(guests / 4) * 700_000,
      lineTotalUSD: (_base, guests) => Math.ceil(guests / 4) * 28,
      summaryText: (name, qty) => `${name} (${qty} ${ui.carUnit})`,
    };
  }

  if (key === "da_nang_mountain_shuttle") {
    return {
      id: "da_nang_mountain_shuttle",
      defaultSelected: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      warningWhenUnchecked: ui.daNangMountainWarning,
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "da_nang_hotel_pickup") {
    return {
      id: "da_nang_hotel_pickup",
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "quan_ba_pickup") {
    return {
      id: "quan_ba_pickup",
      requiresInput: true,
      inputLabel: ui.pickupPointLabel,
      showQty: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "white" })),
      warningWhenUnchecked: ui.quanBaPickupWarning,
      lineTotalVND: (base, _guests, qty) => base * qty,
      lineTotalUSD: (base, _guests, qty) => base * qty,
      summaryText: (name, qty) => `${name}${qty > 1 ? ` x${qty}` : ""}`,
    };
  }

  if (key === "ha_noi_sunset") {
    return {
      id: "sunset",
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: [],
      activeNoteLines: [{ text: ui.optionalServicesSunsetDesc, tone: "white" }],
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  return {
    id: "generic",
    exclusiveGroup: svc.exclusiveGroup,
    defaultSelected: !!svc.defaultSelected,
    requiresInput: !!svc.requiresPickupInput,
    inputLabel: ui.pickupLocationLabel,
    showQty: svc.controlType === "counter",
    readonlyQty: false,
    priceText: priceVND ? `${formatVND(priceVND)}/${ui.pax}` : "",
    lines: descriptionLines.map((text) => ({ text, tone: "white" })),
    activeNoteLines: noteLines.map((text) => ({ text, tone: "red" })),
    lineTotalVND: (base, guests, qty) =>
      svc.controlType === "counter" ? base * qty : base * guests,
    lineTotalUSD: (base, guests, qty) =>
      svc.controlType === "counter" ? base * qty : base * guests,
    summaryText: (name, qty) =>
      svc.controlType === "counter" && qty > 1 ? `${name} x${qty}` : name,
  };
}

function getAddonPriceText(
  addon: { pricePerPersonVND: number | null },
  ui: ReturnType<typeof getSelectFlightStepLocale>["ui"],
) {
  if (addon.pricePerPersonVND == null) return "";
  return `${formatVND(addon.pricePerPersonVND)}/${ui.pax}`;
}

export default function SelectFlightStep() {
  const t = useBookingText();
  const lang = (useLangCode() || "vi") as BookingLang;
  const { ui, locationCards } = getSelectFlightStepLocale(lang);

  const data = useBookingStore((s) => s.data);
  const setGuestsCount = useBookingStore((s) => s.setGuestsCount);
  const setAddonQty = useBookingStore((s) => s.setAddonQty);
  const update = useBookingStore((s) => s.update);
  const next = useBookingStore((s) => s.next);
  const setLocation = useBookingStore((s) => s.setLocation);

  const orderedLocations = useMemo(() => getOrderedLocations(), []);
  const selected = data.location as LocationKey | undefined;
  const selectedCfg = selected ? LOCATIONS[selected] : null;
  const guestsCount = Math.max(1, data.guestsCount || 1);

  const buttons: Record<string, string | undefined> =
    (t?.buttons as Record<string, string | undefined>) || {};

  const allPackages = useMemo(
    () =>
      normalizePackages(
        (selectedCfg as { packages?: unknown } | null)?.packages,
        lang,
      ),
    [selectedCfg, lang],
  );

  const isKhauPha = selected === "khau_pha";
  const isParagliding = data.flightTypeKey === "paragliding";
  const isParamotor = data.flightTypeKey === "paramotor";
  const khauPhaPackages = useMemo(
    () => getKhauPhaPackages(allPackages),
    [allPackages],
  );

  const visibleServices = useMemo(() => {
    const services = (selectedCfg?.services || []) as ServiceConfig[];

    return services.filter((svc) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return false;
        if (!svc.visibleForPackages.includes(data.packageKey as PackageKey)) {
          return false;
        }
      }

      if (svc.visibleForFlightTypes?.length) {
        if (!data.flightTypeKey) return false;
        if (
          !svc.visibleForFlightTypes.includes(
            data.flightTypeKey as FlightTypeKey,
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCfg, data.packageKey, data.flightTypeKey]);

  const servicesWithMeta = useMemo(() => {
    return visibleServices.map((svc) => ({
      svc,
      meta: getServiceMeta(svc, lang, ui),
      label: getText(svc.label, lang, String(svc.key)),
    }));
  }, [visibleServices, lang, ui]);

  useEffect(() => {
    if (!selectedCfg) return;

    if (
      selected !== "khau_pha" &&
      allPackages.length === 1 &&
      data.packageKey !== allPackages[0]?.key
    ) {
      update({ packageKey: allPackages[0]?.key });
      return;
    }

    if (selected === "khau_pha") {
      if (
        data.flightTypeKey === "paramotor" &&
        data.packageKey !== KHAU_PHA_PACKAGES.paramotor
      ) {
        update({
          packageKey: KHAU_PHA_PACKAGES.paramotor,
          services: {},
        });
        return;
      }

      if (
        data.flightTypeKey === "paragliding" &&
        data.packageKey === KHAU_PHA_PACKAGES.paramotor
      ) {
        update({
          packageKey: undefined,
          services: {},
        });
      }
    }
  }, [
    selected,
    selectedCfg,
    allPackages,
    data.packageKey,
    data.flightTypeKey,
    update,
  ]);

  useEffect(() => {
    if (!servicesWithMeta.length) return;

    const nextServices = {
      ...((data.services as Record<string, ServiceSelection> | undefined) || {}),
    };
    let changed = false;

    servicesWithMeta.forEach(({ svc, meta }) => {
      if (!meta.defaultSelected) return;
      if (nextServices[svc.key] !== undefined) return;

      nextServices[svc.key] = {
        selected: true,
        qty: 1,
        inputText: "",
      };
      changed = true;
    });

    if (changed) {
      update({ services: nextServices });
    }
  }, [servicesWithMeta, data.services, update]);

  const priceParams = useMemo(
    () => ({
      location: (selected || "ha_noi") as LocationKey,
      guestsCount,
      dateISO: data.dateISO,
      packageKey: data.packageKey as PackageKey | undefined,
      flightTypeKey: data.flightTypeKey as FlightTypeKey | undefined,
      addons: data.addons,
      addonsQty: data.addonsQty,
    }),
    [
      selected,
      guestsCount,
      data.dateISO,
      data.packageKey,
      data.flightTypeKey,
      data.addons,
      data.addonsQty,
    ],
  );

  const totalsVND = useMemo(
    () => computePriceByLang(priceParams, "vi"),
    [priceParams],
  );
  const totalsUSD = useMemo(
    () => computePriceByLang(priceParams, "en"),
    [priceParams],
  );

  const locationIntroLines = safeLines(
    ui.locationDescription[selected as LocationKey],
  );

  const footerConfig = getFooterConfig(
    selected,
    data.flightTypeKey as FlightTypeKey | undefined,
    ui,
  );

  const getServiceQty = useCallback(
    (svc: ServiceConfig, meta: ServiceMeta) => {
      const state = getServiceState(data, svc.key);
      if (meta.readonlyQty) {
        return Math.max(1, Math.ceil(guestsCount / 4));
      }
      return Math.max(1, state.qty || 1);
    },
    [data, guestsCount],
  );

  const setServiceState = (key: string, patch: Partial<ServiceSelection>) => {
    const currentServices =
      (data.services as Record<string, ServiceSelection> | undefined) || {};

    update({
      services: {
        ...currentServices,
        [key]: {
          ...(currentServices[key] || { selected: false }),
          ...patch,
        },
      },
    });
  };

  const handleSelectLocation = (key: LocationKey) => {
    setLocation(key);
    update({
      addons: {},
      addonsQty: {},
      services: {},
      packageKey: undefined,
      flightTypeKey: undefined,
      contact: {
        ...(data.contact || { phone: "", email: "" }),
        pickupLocation: "",
      },
    });
  };

  const handleToggleService = (svc: ServiceConfig, meta: ServiceMeta) => {
    const currentServices =
      (data.services as Record<string, ServiceSelection> | undefined) || {};
    const nextServices = { ...currentServices };
    const current = getServiceState(data, svc.key);
    const nextSelected = !current.selected;

    if (meta.exclusiveGroup && nextSelected) {
      servicesWithMeta
        .filter(
          (item) =>
            item.meta.exclusiveGroup === meta.exclusiveGroup &&
            item.svc.key !== svc.key,
        )
        .forEach((item) => {
          const prev = currentServices[item.svc.key] || { selected: false };
          nextServices[item.svc.key] = {
            ...prev,
            selected: false,
            inputText: "",
          };
        });
    }

    nextServices[svc.key] = {
      ...(currentServices[svc.key] || { selected: false }),
      selected: nextSelected,
      qty: getServiceQty(svc, meta),
      inputText: nextSelected ? current.inputText || "" : "",
    };

    update({ services: nextServices });
  };

  const handleServiceQty = (
    svc: ServiceConfig,
    meta: ServiceMeta,
    nextQty: number,
  ) => {
    const qty = clampInt(nextQty, 1, guestsCount);
    const currentServices =
      (data.services as Record<string, ServiceSelection> | undefined) || {};
    const nextServices = { ...currentServices };

    if (meta.exclusiveGroup) {
      servicesWithMeta
        .filter(
          (item) =>
            item.meta.exclusiveGroup === meta.exclusiveGroup &&
            item.svc.key !== svc.key,
        )
        .forEach((item) => {
          const prev = currentServices[item.svc.key] || { selected: false };
          nextServices[item.svc.key] = {
            ...prev,
            selected: false,
            inputText: "",
          };
        });
    }

    nextServices[svc.key] = {
      ...(currentServices[svc.key] || { selected: false }),
      selected: true,
      qty,
    };

    update({ services: nextServices });
  };

  const selectedServicesTotalVND = useMemo(
    () =>
      servicesWithMeta.reduce<number>((sum, { svc, meta }) => {
        const state = getServiceState(data, svc.key);
        if (!state.selected) return sum;

        const qty = getServiceQty(svc, meta);
        const basePriceVND = Number(svc.priceVND || 0);
        return sum + meta.lineTotalVND(basePriceVND, guestsCount, qty);
      }, 0),
    [servicesWithMeta, data, guestsCount, getServiceQty],
  );

  const selectedServicesTotalUSD = useMemo(
    () =>
      servicesWithMeta.reduce<number>((sum, { svc, meta }) => {
        const state = getServiceState(data, svc.key);
        if (!state.selected) return sum;

        const qty = getServiceQty(svc, meta);
        const basePriceUSD = Number(svc.priceUSD || 0);
        return sum + meta.lineTotalUSD(basePriceUSD, guestsCount, qty);
      }, 0),
    [servicesWithMeta, data, guestsCount, getServiceQty],
  );

  const addonTotalVND = Object.values(totalsVND.addonsTotal || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  const optionalTotalVND = addonTotalVND + selectedServicesTotalVND;
  const grandTotalVND =
    Number(totalsVND.totalAfterDiscount || 0) + selectedServicesTotalVND;
  const grandTotalUSD =
    Number(totalsUSD.totalAfterDiscount || 0) + selectedServicesTotalUSD;

  const requiredPickupInputsMissing = servicesWithMeta.some(({ svc, meta }) => {
    if (!meta.requiresInput) return false;
    const state = getServiceState(data, svc.key);
    if (!state.selected) return false;
    return !String(state.inputText || "").trim();
  });

  const needsFlightType = isKhauPha && !data.flightTypeKey;
  const needsPackage =
    (isKhauPha && isParagliding && !data.packageKey) ||
    (!isKhauPha && allPackages.length > 1 && !data.packageKey);

  const canGoNext =
    !!selected &&
    !needsFlightType &&
    !needsPackage &&
    !requiredPickupInputsMissing;

  const activeKhauPhaPickupGroup =
    isKhauPha && isParamotor
      ? "khau_pha_paramotor_pickup"
      : isKhauPha && isParagliding
        ? "khau_pha_paragliding_pickup"
        : undefined;

  const hasVisiblePickupServices =
    !!activeKhauPhaPickupGroup &&
    servicesWithMeta.some(
      ({ meta }) => meta.exclusiveGroup === activeKhauPhaPickupGroup,
    );

  const hasSelectedPickupService =
    !!activeKhauPhaPickupGroup &&
    servicesWithMeta.some(
      ({ svc, meta }) =>
        meta.exclusiveGroup === activeKhauPhaPickupGroup &&
        getServiceState(data, svc.key).selected,
    );

  const activePickupWarning =
    hasVisiblePickupServices && !hasSelectedPickupService
      ? isParamotor
        ? ui.paramotorNoPickupWarning
        : ui.paraglidingNoPickupWarning
      : "";

  const selectedFlightSummary = useMemo(() => {
    if (!selectedCfg || !selected) return "";

    if (selected === "khau_pha") {
      if (isParamotor) {
        return `${ui.paramotorTitle} - ${formatVND(2_390_000)}/${ui.pax}`;
      }

      if (isParagliding) {
        if (data.packageKey === khauPhaPackages.weekday?.key) {
          return `${ui.paraglidingTitle} - ${ui.weekdayFlightTitle}`;
        }
        if (data.packageKey === khauPhaPackages.weekend?.key) {
          return `${ui.paraglidingTitle} - ${ui.weekendFlightTitle}`;
        }
        return ui.paraglidingTitle;
      }
    }

    const packageText =
      allPackages.find((pkg) => pkg.key === data.packageKey)?.label || "";

    return packageText
      ? `${getText(selectedCfg.name, lang, selected)} - ${packageText}`
      : getText(selectedCfg.name, lang, selected);
  }, [
    selectedCfg,
    selected,
    isParamotor,
    isParagliding,
    data.packageKey,
    khauPhaPackages.weekday?.key,
    khauPhaPackages.weekend?.key,
    ui,
    allPackages,
    lang,
  ]);

  const selectedOptionRows = useMemo(() => {
    const rows: Array<{ label: string; amount: number | null }> = [];

    servicesWithMeta.forEach(({ svc, meta, label }) => {
      const state = getServiceState(data, svc.key);
      if (!state.selected) return;

      const qty = getServiceQty(svc, meta);
      const amount = meta.lineTotalVND(
        Number(svc.priceVND || 0),
        guestsCount,
        qty,
      );

      rows.push({
        label: meta.summaryText(label, qty, guestsCount),
        amount,
      });
    });

    ADDON_KEYS.forEach((key) => {
      if (!selectedCfg?.addons?.[key]) return;

      const qty = totalsVND.addonsQty[key] ?? 0;
      if (qty <= 0) return;

      const addonLabel = getText(selectedCfg.addons[key].label, lang, key);
      rows.push({
        label: qty > 1 ? `${addonLabel} x${qty}` : addonLabel,
        amount: totalsVND.addonsTotal[key] ?? 0,
      });
    });

    return rows;
  }, [
    servicesWithMeta,
    data,
    guestsCount,
    selectedCfg,
    totalsVND,
    lang,
    getServiceQty,
  ]);

  const renderServiceDescription = (svc: ServiceConfig, meta: ServiceMeta) => {
    const lines = [...meta.lines];
    if (!lines.length) return null;

    return (
      <div className="mt-1 space-y-1">
        {lines.map((line, idx) => (
          <p
            key={`${svc.key}-${idx}`}
            className={[
              "text-[12px] italic leading-5 md:text-[14px]",
              toneClass(line.tone),
            ].join(" ")}
          >
            {line.href ? (
              <a
                href={line.href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {line.text}
              </a>
            ) : (
              line.text
            )}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-slate-800 bg-[#efefef] text-slate-900">
      <div className="space-y-4 px-3 py-4 sm:p-4 md:p-6">
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {orderedLocations.map((locKey) => {
              const active = selected === locKey;
              const cardCopy = locationCards[locKey];
              const fromPrice = LOCATION_CARD_PRICE_META[locKey];

              return (
                <button
                  key={locKey}
                  type="button"
                  onClick={() => handleSelectLocation(locKey)}
                  className={[
                    "group relative flex min-h-[100px] flex-col justify-center rounded-2xl border px-2 py-2 text-center transition-all sm:min-h-[130px] sm:px-3 sm:py-3",
                    active
                      ? "scale-[1.02] border-sky-300 bg-[#efaf05] opacity-100 shadow-[0_12px_30px_rgba(0,0,0,0.22)] ring-2 ring-white/70"
                      : "border-[#d98a00] bg-[#f4b200] opacity-80 hover:opacity-100",
                  ].join(" ")}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent" />

                  <div className="relative">
                    <div className="text-[17px] font-black uppercase leading-tight tracking-[0.02em] text-[#ef2f1e] sm:text-[21px] sm:leading-6">
                      {cardCopy.title}
                    </div>
                  </div>

                  <div className="relative mt-1 text-[14px] font-semibold italic leading-snug text-white sm:mt-2 sm:text-[16px]">
                    {cardCopy.subtitle}
                  </div>

                  <div className="relative mt-2 text-[15px] font-bold italic text-[#ef2f1e] sm:mt-3 sm:text-[17px]">
                    {ui.fromLabel} {formatCardFromPrice(fromPrice)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {!selectedCfg ? (
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] italic text-slate-600">
            {ui.chooseLocationPrompt}
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <div className="text-[20px] font-bold text-[#0d5a8d] sm:text-[22px]">
                {ui.selectedLocationTitle}:{" "}
                <span className="text-[#ef2f1e]">
                  {getText(selectedCfg.name, lang, selected)}
                </span>
              </div>

              {locationIntroLines.length > 0 ? (
                <div className="space-y-1 text-[15px] italic leading-7 text-[#ef3a2b] sm:text-[18px] sm:leading-8">
                  {locationIntroLines.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              ) : null}
            </section>

            {isKhauPha ? (
              <section className="space-y-3">
                <SectionBar>{ui.selectFlightType}</SectionBar>

                <div className="space-y-[2px]">
                  {[
                    {
                      key: "paragliding" as FlightTypeKey,
                      title: ui.paraglidingTitle,
                      lines: ui.paraglidingDescription,
                    },
                    {
                      key: "paramotor" as FlightTypeKey,
                      title: ui.paramotorTitle,
                      lines: ui.paramotorDescription,
                    },
                  ].map((item) => {
                    const active = data.flightTypeKey === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          update({
                            flightTypeKey: item.key,
                            packageKey:
                              item.key === "paramotor"
                                ? KHAU_PHA_PACKAGES.paramotor
                                : undefined,
                            services: {},
                            addons: {},
                            addonsQty: {},
                          })
                        }
                        className="block w-full bg-[#57b6eb] px-3 py-3 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <ToggleIndicator checked={active} variant="radio" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[16px] font-semibold text-black sm:text-[18px]">
                              {item.title}
                            </div>

                            {active ? (
                              <div className="mt-2 space-y-1">
                                {item.lines.map((line: string, idx: number) => (
                                  <p
                                    key={idx}
                                    className="text-[13px] italic leading-6 text-[#ef2f1e] sm:text-[15px]"
                                  >
                                    {line}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!data.flightTypeKey ? (
                  <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] italic text-slate-600">
                    {ui.chooseFlightTypePrompt}
                  </div>
                ) : null}

                <a
                  href={HOMESTAY_URL}
                  className="mx-auto block max-w-[680px] border-[4px] border-[#f33b1b] bg-[#fff160] px-4 py-3 text-center shadow-sm transition hover:brightness-[1.03]"
                >
                  <div className="text-[15px] font-bold uppercase text-[#ef2f1e] sm:text-[16px]">
                    ✩ {ui.khauPhaPromoTitle}
                  </div>
                  <div className="text-[13px] font-semibold italic text-[#074a95] sm:text-[14px]">
                    {ui.khauPhaPromoSub}
                  </div>
                </a>
              </section>
            ) : null}

            <section className="space-y-4">
              <SectionBar>{ui.serviceSectionTitle}</SectionBar>

              <div className="flex flex-col gap-4 px-1 sm:px-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 text-[16px] text-slate-700">
                    <span className="text-[#e53a35]">👥</span>
                    <span className="font-semibold">{ui.guestsLabel}</span>

                    <QuantityBox
                      value={guestsCount}
                      onMinus={() =>
                        setGuestsCount(clampInt(guestsCount - 1, 1, 100))
                      }
                      onPlus={() =>
                        setGuestsCount(clampInt(guestsCount + 1, 1, 100))
                      }
                      disableMinus={guestsCount <= 1}
                    />
                  </div>

                  {isKhauPha && isParagliding ? (
                    <div className="flex w-full flex-col gap-3 sm:flex-row">
                      {khauPhaPackages.weekday ? (
                        <PackageDayCard
                          active={data.packageKey === khauPhaPackages.weekday.key}
                          title={ui.weekdayFlightTitle}
                          price={`${ui.fromLabel} ${formatVND(
                            khauPhaPackages.weekday.priceVND ?? 2_120_000,
                          )}`}
                          onClick={() =>
                            update({
                              packageKey: khauPhaPackages.weekday?.key,
                              services: {},
                            })
                          }
                        />
                      ) : null}

                      {khauPhaPackages.weekend ? (
                        <PackageDayCard
                          active={data.packageKey === khauPhaPackages.weekend.key}
                          title={ui.weekendFlightTitle}
                          price={`${ui.fromLabel} ${formatVND(
                            khauPhaPackages.weekend.priceVND ?? 2_520_000,
                          )}`}
                          onClick={() =>
                            update({
                              packageKey: khauPhaPackages.weekend?.key,
                              services: {},
                            })
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {isKhauPha && isParamotor ? (
                    <div className="border-[4px] border-[#f33b1b] bg-[#fff160] px-4 py-2 text-[16px] font-bold text-[#111] sm:text-[18px]">
                      <span>{ui.paramotorDiscountBefore}</span>
                      <span className="text-[#ef2f1e] line-through">
                        2.690.000 đ
                      </span>
                      <span>{ui.paramotorDiscountAfter}</span>
                    </div>
                  ) : null}

                  {!isKhauPha && allPackages.length > 1 ? (
                    <div className="flex w-full flex-col gap-3 sm:flex-row">
                      {allPackages.map((pkg) => (
                        <PackageDayCard
                          key={pkg.key}
                          active={data.packageKey === pkg.key}
                          title={pkg.label}
                          price={pkg.priceVND ? formatVND(pkg.priceVND) : ""}
                          onClick={() =>
                            update({ packageKey: pkg.key, services: {} })
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {needsPackage ? (
                <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] italic text-slate-600">
                  {ui.choosePackagePrompt}
                </div>
              ) : null}

              <div className="rounded-[14px] border border-[#f0b8b8] bg-[#fff8f6]">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="px-4 py-4">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      {ui.flightPrice}
                    </div>
                    <div className="mt-2 inline-block bg-[#ececec] px-3 py-2 text-[18px] font-bold text-black md:text-[20px]">
                      {formatVND(Number(totalsVND.basePricePerPerson || 0))}
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      {ui.optionalPrice}
                    </div>
                    <div className="mt-2 text-[20px] font-bold text-[#374151]">
                      +{formatVND(optionalTotalVND)}
                    </div>
                  </div>

                  <div className="px-4 py-4 text-center">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      {ui.totalPrice}:
                    </div>
                    <div className="mt-2 text-[26px] font-bold text-[#e5362a]">
                      {formatVND(grandTotalVND)}
                    </div>
                    <div className="text-[14px] font-semibold text-slate-500">
                      {formatUsdTotal(grandTotalUSD)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#f0b8b8] px-4 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        {ui.selectedFlightLabel}
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-slate-800">
                        {selectedFlightSummary || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        {ui.selectedOptionsLabel}
                      </div>

                      {!selectedOptionRows.length ? (
                        <div className="mt-2 text-[14px] italic text-slate-500">
                          {ui.noOptionalSelected}
                        </div>
                      ) : null}

                      <ul className="mt-2 space-y-1">
                        {selectedOptionRows.map((row, idx) => (
                          <li
                            key={`${row.label}-${idx}`}
                            className="flex items-start justify-between gap-4 text-[14px] text-slate-700"
                          >
                            <span>{row.label}</span>
                            <span className="whitespace-nowrap font-semibold text-slate-900">
                              +{formatVND(row.amount || 0)}
                            </span>
                          </li>
                        ))}

                        <li className="flex items-start justify-between gap-4 text-[14px] text-slate-700">
                          <span>{ui.freeGopro}</span>
                          <span className="whitespace-nowrap font-semibold text-slate-900">
                            FREE
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[18px] font-bold text-black sm:text-[20px]">
                  <span className="mr-2 text-[#e53935]">✚</span>
                  {ui.optionalServiceTitle}:
                </div>

                {servicesWithMeta.length === 0 &&
                ADDON_KEYS.every((key) => !selectedCfg?.addons?.[key]) ? (
                  <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] italic text-slate-600">
                    {ui.noVisibleServices}
                  </div>
                ) : null}

                <div className="space-y-[3px]">
                  {servicesWithMeta.map(({ svc, meta, label }) => {
                    const state = getServiceState(data, svc.key);
                    const active = !!state.selected;
                    const qty = getServiceQty(svc, meta);

                    return (
                      <div key={svc.key} className="bg-[#57b6eb] px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <button
                            type="button"
                            onClick={() => handleToggleService(svc, meta)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <ToggleIndicator checked={active} />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[16px] font-semibold leading-6 text-black sm:text-[18px]">
                                    {label}:
                                  </div>
                                  {renderServiceDescription(svc, meta)}
                                </div>

                                <div className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-[#ef2f1e] sm:text-[16px]">
                                  {meta.priceText}
                                </div>
                              </div>
                            </div>
                          </button>

                          {meta.showQty ? (
                            <div className="sm:ml-auto">
                              <QuantityBox
                                value={qty}
                                onMinus={() => {
                                  if (meta.readonlyQty) return;
                                  const current = Math.max(
                                    1,
                                    getServiceQty(svc, meta),
                                  );
                                  if (!active) return;
                                  if (current <= 1) {
                                    setServiceState(svc.key, {
                                      selected: false,
                                      qty: 1,
                                    });
                                    return;
                                  }
                                  handleServiceQty(svc, meta, current - 1);
                                }}
                                onPlus={() => {
                                  if (meta.readonlyQty) return;
                                  handleServiceQty(
                                    svc,
                                    meta,
                                    Math.max(1, getServiceQty(svc, meta)) + 1,
                                  );
                                }}
                                disableMinus={
                                  meta.readonlyQty || !active || qty <= 1
                                }
                                disablePlus={
                                  meta.readonlyQty || qty >= guestsCount
                                }
                              />
                            </div>
                          ) : null}
                        </div>

                        {meta.requiresInput && active ? (
                          <InlineAddressInput
                            label={meta.inputLabel || ui.pickupLocationLabel}
                            value={String(state.inputText || "")}
                            placeholder={ui.pickupPlaceholder}
                            onChange={(value) =>
                              setServiceState(svc.key, { inputText: value })
                            }
                          />
                        ) : null}

                        {active && meta.activeNoteLines?.length ? (
                          <div className="mt-2 space-y-1 sm:ml-11">
                            {meta.activeNoteLines.map((line, idx) => (
                              <p
                                key={`${svc.key}-note-${idx}`}
                                className={[
                                  "text-[13px] italic leading-5 sm:text-[14px]",
                                  toneClass(line.tone),
                                ].join(" ")}
                              >
                                {line.text}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {meta.warningWhenUnchecked && !active ? (
                          <div className="mt-2 text-[13px] italic leading-6 text-[#ef2f1e] sm:ml-11 sm:text-[14px]">
                            {meta.warningWhenUnchecked}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {activePickupWarning ? (
                    <div className="bg-white px-4 py-3 text-[14px] italic leading-6 text-[#ef2f1e]">
                      {activePickupWarning}
                    </div>
                  ) : null}

                  {ADDON_KEYS.map((key) => {
                    if (!selectedCfg?.addons?.[key]) return null;

                    const addon = selectedCfg.addons[key];
                    const qty = data.addonsQty?.[key] ?? 0;
                    const active = qty > 0;
                    const displayQty = Math.max(1, qty || 1);
                    const title = getText(addon.label, lang, key);
                    const priceText = getAddonPriceText(addon, ui);
                    const isFlycam = key === "flycam";
                    const is360 = key === "camera360";

                    return (
                      <div key={key} className="bg-[#57b6eb] px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <button
                            type="button"
                            onClick={() => setAddonQty(key, active ? 0 : 1)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <ToggleIndicator checked={active} />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[16px] font-semibold leading-6 text-black sm:text-[18px]">
                                    {title}:
                                  </div>
                                </div>

                                <div className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-[#ef2f1e] sm:text-[16px]">
                                  {priceText}
                                </div>
                              </div>
                            </div>
                          </button>

                          <div className="sm:ml-auto">
                            <QuantityBox
                              value={displayQty}
                              onMinus={() => {
                                if (!active) return;
                                if (qty <= 1) {
                                  setAddonQty(key, 0);
                                  return;
                                }
                                setAddonQty(key, Math.max(0, qty - 1));
                              }}
                              onPlus={() =>
                                setAddonQty(
                                  key,
                                  clampInt(displayQty + 1, 1, guestsCount),
                                )
                              }
                              disableMinus={!active || qty <= 1}
                              disablePlus={displayQty >= guestsCount}
                            />
                          </div>
                        </div>

                        {active && (isFlycam || is360) ? (
                          <div className="mt-2 space-y-2 sm:ml-11">
                            {isFlycam ? (
                              <>
                                <p className="text-[13px] italic leading-5 text-white sm:text-[14px]">
                                  {ui.flycamDescription}
                                </p>
                                {selected === "ha_noi" ? (
                                  <p className="text-[13px] italic leading-5 text-[#ffc107] sm:text-[14px]">
                                    {ui.optionalServicesFlycamNotice}
                                  </p>
                                ) : null}
                              </>
                            ) : null}

                            {is360 ? (
                              <p className="text-[13px] italic leading-5 text-white sm:text-[14px]">
                                {ui.camera360Description}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  <div className="bg-[#57b6eb] px-3 py-3 sm:px-4">
                    <div className="flex items-start gap-3">
                      <ToggleIndicator checked />
                      <div className="text-[16px] font-semibold leading-6 text-black sm:text-[18px]">
                        {ui.freeGopro}: FREE
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <details className="rounded-[14px] border border-slate-300 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[16px] font-semibold text-slate-800 sm:text-[18px] [&::-webkit-details-marker]:hidden">
                    <span>✅ {ui.includedLabel}:</span>
                    <span>▾</span>
                  </summary>

                  <div className="border-t border-slate-200 px-4 py-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {(
                        selectedCfg.included?.[lang as LangCode] ??
                        selectedCfg.included?.en ??
                        selectedCfg.included?.vi ??
                        []
                      ).map((item: string, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-full bg-[#4c8d39] px-4 py-2 text-[13px] font-medium text-white sm:text-[14px]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                <details className="rounded-[14px] border border-slate-300 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[16px] font-semibold text-slate-800 sm:text-[18px] [&::-webkit-details-marker]:hidden">
                    <span>🟧 {ui.groupDiscountTitle}</span>
                    <span>▾</span>
                  </summary>

                  <div className="border-t border-slate-200 px-4 py-3 text-[14px] text-slate-700">
                    <div className="space-y-2">
                      {[
                        { min: 2, vnd: 50_000 },
                        { min: 3, vnd: 70_000 },
                        { min: 4, vnd: 100_000 },
                        { min: 6, vnd: 150_000 },
                      ].map((tier) => (
                        <div
                          key={tier.min}
                          className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
                        >
                          <span>
                            {tier.min}+ {ui.groupGuestsSuffix}
                          </span>
                          <span className="font-semibold text-[#e53935]">
                            -{formatVND(tier.vnd)}/{ui.perPersonWord}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>

              <div className="space-y-2">
                {footerConfig.inlineLinks.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] sm:px-2 sm:text-[14px]">
                    {footerConfig.inlineLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className={[
                          "underline underline-offset-2",
                          item.tone === "red"
                            ? "text-[#ef2f1e]"
                            : "text-[#2a62ff]",
                        ].join(" ")}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : null}

                {footerConfig.note ? (
                  <div className="px-1 text-[13px] italic text-[#ef2f1e] sm:px-2 sm:text-[14px]">
                    {footerConfig.note}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={next}
                    disabled={!canGoNext}
                    className="inline-flex min-h-[56px] min-w-[170px] items-center justify-center bg-[#ea2424] px-6 text-[16px] font-bold uppercase text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[62px] sm:min-w-[190px] sm:px-8 sm:text-[18px]"
                    style={{
                      clipPath:
                        "polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%, 0 0)",
                    }}
                  >
                    {buttons.next || ui.continue} →
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}