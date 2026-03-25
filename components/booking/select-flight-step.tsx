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
    | "khau_pha_flycam"
    | "khau_pha_camera360"
    | "khau_pha_gopro"
    | "khau_pha_shuttle"
    | "khau_pha_garrya_pickup"
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
  khau_pha: 2_190_000,
  sapa: 2_090_000,
  quan_ba: 2_190_000,
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
      note: "",
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
        checked ? "border-[#0194F3]" : "border-[#B9DDFB]",
      ].join(" ")}
    >
      {checked ? (
        variant === "radio" ? (
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5E1F]" />
        ) : (
          <span className="text-[18px] leading-none text-[#FF5E1F]">✔</span>
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
      className="flex h-8 w-8 items-center justify-center rounded-md text-[20px] font-bold text-[#5B6B7A] transition hover:bg-[#EAF4FE] disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="flex h-10 items-center rounded-lg border border-[#DCE7F3] bg-white px-2 shadow-sm">
      <QtyButton onClick={onMinus} disabled={disableMinus}>
        −
      </QtyButton>
      <span className="min-w-[20px] text-center text-[18px] font-bold text-[#0194F3]">
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
    <div className="rounded-lg bg-[#0194F3] px-4 py-3 text-[16px] font-bold text-white md:px-5 md:text-[18px]">
      {children}:
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
    <div className="mt-3 rounded-lg border-2 border-[#0194F3] bg-white px-4 py-3 text-[15px] font-medium text-[#1C2930] sm:ml-11 sm:text-[16px]">
      <label className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{label}:</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-medium text-[#1C2930] outline-none placeholder:text-[#94A3B8] focus:ring-0 sm:min-w-56 sm:text-[16px]"
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
        "w-full rounded-xl border-2 px-4 py-3 text-left transition-all sm:min-w-[240px] sm:flex-1",
        active
          ? "border-[#0194F3] bg-[#EAF4FE] shadow-md"
          : "border-[#DCE7F3] bg-white hover:border-[#B9DDFB] hover:shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <ToggleIndicator checked={active} variant="radio" />
        <div>
          <div className="text-[14px] font-bold leading-5 text-[#1C2930] sm:text-[15px]">
            {title}
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[#FF5E1F] sm:text-[14px]">{price}</div>
        </div>
      </div>
    </button>
  );
}

function toneClass(tone?: TextLine["tone"]) {
  if (tone === "red") return "text-[#FF5E1F]";
  if (tone === "green") return "text-[#16A34A]";
  if (tone === "dark") return "text-[#1C2930]";
  return "text-[#355166]";
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
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
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
          tone: "dark",
          href: "https://www.google.com/maps/place/Highlands+Coffee+BigC,+BigC,+222+%C4%90.+Tr%E1%BA%A7n+Duy+H%C6%B0ng,+Trung+Ho%C3%A0,+C%E1%BA%A7u+Gi%E1%BA%A5y,+H%C3%A0+N%E1%BB%99i+100000/data=!4m2!3m1!1s0x3135ade3b3f8cc73:0xe5dc4fb635ecfc01?utm_source=mstt_1&entry=gps&g_ep=CAESBzExLjUzLjQYACD___________8BKgA%3D",
        },
        {
          text: ui.optionalServicesFixedPickupDeparture,
          tone: "dark",
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
        { text: ui.optionalServicesPrivatePickupNote1, tone: "dark" },
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
        { text: ui.optionalServicesMountainShuttleDesc, tone: "dark" }
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

  if (key === "khau_pha_flycam") {
    return {
      id: "khau_pha_flycam",
      showQty: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
      lineTotalVND: (base, _guests, qty) => base * qty,
      lineTotalUSD: (base, _guests, qty) => base * qty,
      summaryText: (name, qty) => `${name}${qty > 1 ? ` x${qty}` : ""}`,
    };
  }

  if (key === "khau_pha_camera360") {
    return {
      id: "khau_pha_camera360",
      showQty: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
      lineTotalVND: (base, _guests, qty) => base * qty,
      lineTotalUSD: (base, _guests, qty) => base * qty,
      summaryText: (name, qty) => `${name}${qty > 1 ? ` x${qty}` : ""}`,
    };
  }

  if (key === "khau_pha_gopro") {
    return {
      id: "khau_pha_gopro",
      defaultSelected: true,
      priceText: "FREE",
      lines: [],
      lineTotalVND: () => 0,
      lineTotalUSD: () => 0,
      summaryText: (name) => name,
    };
  }

  if (key === "khau_pha_shuttle") {
    return {
      id: "khau_pha_shuttle",
      exclusiveGroup: "khau_pha_pickup",
      defaultSelected: true,
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
      lineTotalVND: (base, guests) => base * guests,
      lineTotalUSD: (base, guests) => base * guests,
      summaryText: (name) => name,
    };
  }

  if (key === "khau_pha_garrya_pickup") {
    return {
      id: "khau_pha_garrya_pickup",
      exclusiveGroup: "khau_pha_pickup",
      requiresInput: true,
      inputLabel: ui.pickupLocationLabel,
      showQty: true,
      readonlyQty: true,
      priceText: "600.000 đ/xe 4 chỗ/1 chiều",
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
      activeNoteLines: noteLines.map((text) => ({
        text: `• ${text}`,
        tone: "red",
      })),
      lineTotalVND: (_base, guests) => Math.ceil(guests / 4) * 600_000,
      lineTotalUSD: (_base, guests) => Math.ceil(guests / 4) * 24,
      summaryText: (name, qty) => `${name} (${qty} ${ui.carUnit})`,
    };
  }

  if (key === "da_nang_mountain_shuttle") {
    return {
      id: "da_nang_mountain_shuttle",
      defaultSelected: true,
      priceText: `${formatVND(priceVND)}/${ui.pax}`,
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
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
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
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
      lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
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
      activeNoteLines: [{ text: ui.optionalServicesSunsetDesc, tone: "dark" }],
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
    lines: descriptionLines.map((text) => ({ text, tone: "dark" })),
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
    <div className="border border-[#DCE7F3] bg-[#F5F7FA] text-[#1C2930]">
      <div className="space-y-4 px-3 py-4 sm:p-4 md:p-6">
        {/* Location Cards */}
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
                    "group relative flex min-h-[100px] flex-col justify-center rounded-xl border-2 px-3 py-3 text-center transition-all sm:min-h-[130px] sm:px-4 sm:py-4",
                    active
                      ? "border-[#0194F3] bg-[#EAF4FE] shadow-lg ring-2 ring-[#B9DDFB]"
                      : "border-[#DCE7F3] bg-white hover:border-[#B9DDFB] hover:shadow-md hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <div className="relative">
                    <div className={[
                      "text-[17px] font-bold uppercase leading-tight tracking-[0.02em] sm:text-[20px] sm:leading-6",
                      active ? "text-[#0194F3]" : "text-[#1C2930]"
                    ].join(" ")}>
                      {cardCopy.title}
                    </div>
                  </div>

                  <div className="relative mt-1 text-[13px] font-medium leading-snug text-[#5B6B7A] sm:mt-2 sm:text-[15px]">
                    {cardCopy.subtitle}
                  </div>

                  <div className="relative mt-2 text-[14px] font-bold text-[#FF5E1F] sm:mt-3 sm:text-[16px]">
                    {ui.fromLabel} {formatCardFromPrice(fromPrice)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {!selectedCfg ? (
          <div className="rounded-xl border border-[#DCE7F3] bg-white px-4 py-3 text-[14px] italic text-[#5B6B7A]">
            {ui.chooseLocationPrompt}
          </div>
        ) : (
          <>
            {/* Selected Location Info */}
            <section className="space-y-2">
              <div className="text-[20px] font-bold text-[#1C2930] sm:text-[22px]">
                {ui.selectedLocationTitle}:{" "}
                <span className="text-[#0194F3]">
                  {getText(selectedCfg.name, lang, selected)}
                </span>
              </div>

              {locationIntroLines.length > 0 ? (
                <div className="space-y-1 text-[15px] italic leading-7 text-[#5B6B7A] sm:text-[17px] sm:leading-8">
                  {locationIntroLines.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Khau Pha Flight Type Selection */}
            {isKhauPha ? (
              <section className="space-y-3">
                <SectionBar>{ui.selectFlightType}</SectionBar>

                <div className="space-y-2 rounded-xl border border-[#DCE7F3] bg-white p-2">
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
                        className={[
                          "block w-full rounded-lg border-2 px-4 py-3 text-left transition-all",
                          active
                            ? "border-[#0194F3] bg-[#EAF4FE]"
                            : "border-[#DCE7F3] bg-white hover:border-[#B9DDFB]"
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <ToggleIndicator checked={active} variant="radio" />
                          <div className="min-w-0 flex-1">
                            <div className={[
                              "text-[16px] font-semibold sm:text-[18px]",
                              active ? "text-[#0194F3]" : "text-[#1C2930]"
                            ].join(" ")}>
                              {item.title}
                            </div>

                            {active ? (
                              <div className="mt-2 space-y-1">
                                {item.lines.map((line: string, idx: number) => (
                                  <p
                                    key={idx}
                                    className="text-[13px] italic leading-6 text-[#5B6B7A] sm:text-[15px]"
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
                  <div className="rounded-xl border border-[#DCE7F3] bg-white px-4 py-3 text-[14px] italic text-[#5B6B7A]">
                    {ui.chooseFlightTypePrompt}
                  </div>
                ) : null}

                <a
                  href={HOMESTAY_URL}
                  className="mx-auto block max-w-[680px] rounded-xl border-2 border-[#FF5E1F] bg-[#FFF4ED] px-4 py-3 text-center shadow-sm transition hover:shadow-md"
                >
                  <div className="text-[15px] font-bold uppercase text-[#FF5E1F] sm:text-[16px]">
                    ✩ {ui.khauPhaPromoTitle}
                  </div>
                  <div className="text-[13px] font-semibold italic text-[#0194F3] sm:text-[14px]">
                    {ui.khauPhaPromoSub}
                  </div>
                </a>
              </section>
            ) : null}

            {/* Service Section */}
            <section className="space-y-4">
              <SectionBar>{ui.serviceSectionTitle}</SectionBar>

              <div className="flex flex-col gap-4 rounded-xl border border-[#DCE7F3] bg-white p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 text-[16px] text-[#1C2930]">
                    <span className="text-[#0194F3]">👥</span>
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
                    <div className="rounded-xl border-2 border-[#FF5E1F] bg-[#FFF4ED] px-4 py-3 text-[16px] font-bold text-[#1C2930] sm:text-[18px]">
                      <span>{ui.paramotorDiscountBefore}</span>
                      <span className="text-[#5B6B7A] line-through">
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
                <div className="rounded-xl border border-[#DCE7F3] bg-white px-4 py-3 text-[14px] italic text-[#5B6B7A]">
                  {ui.choosePackagePrompt}
                </div>
              ) : null}

              {/* Price Summary Box */}
              <div className="rounded-xl border border-[#D6EAFB] bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="px-4 py-4">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6B7A]">
                      {ui.flightPrice}
                    </div>
                    <div className="mt-2 inline-block rounded-lg bg-[#EAF4FE] px-3 py-2 text-[18px] font-bold text-[#1C2930] md:text-[20px]">
                      {formatVND(Number(totalsVND.basePricePerPerson || 0))}
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6B7A]">
                      {ui.optionalPrice}
                    </div>
                    <div className="mt-2 text-[20px] font-bold text-[#355166]">
                      +{formatVND(optionalTotalVND)}
                    </div>
                  </div>

                  <div className="px-4 py-4 text-center md:text-right">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6B7A]">
                      {ui.totalPrice}:
                    </div>
                    <div className="mt-2 text-[26px] font-bold text-[#FF5E1F]">
                      {formatVND(grandTotalVND)}
                    </div>
                    <div className="text-[14px] font-semibold text-[#5B6B7A]">
                      {formatUsdTotal(grandTotalUSD)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#D6EAFB] px-4 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6B7A]">
                        {ui.selectedFlightLabel}
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-[#1C2930]">
                        {selectedFlightSummary || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6B7A]">
                        {ui.selectedOptionsLabel}
                      </div>

                      {!selectedOptionRows.length ? (
                        <div className="mt-2 text-[14px] italic text-[#5B6B7A]">
                          {ui.noOptionalSelected}
                        </div>
                      ) : null}

                      <ul className="mt-2 space-y-1">
                        {selectedOptionRows.map((row, idx) => (
                          <li
                            key={`${row.label}-${idx}`}
                            className="flex items-start justify-between gap-4 text-[14px] text-[#5B6B7A]"
                          >
                            <span>{row.label}</span>
                            <span className="whitespace-nowrap font-semibold text-[#1C2930]">
                              +{formatVND(row.amount || 0)}
                            </span>
                          </li>
                        ))}

                        <li className="flex items-start justify-between gap-4 text-[14px] text-[#5B6B7A]">
                          <span>{ui.freeGopro}</span>
                          <span className="whitespace-nowrap font-semibold text-[#16A34A]">
                            FREE
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Services */}
              <div>
                <div className="mb-3 text-[18px] font-bold text-[#1C2930] sm:text-[20px]">
                  <span className="mr-2 text-[#0194F3]">✚</span>
                  {ui.optionalServiceTitle}:
                </div>

                {servicesWithMeta.length === 0 &&
                ADDON_KEYS.every((key) => !selectedCfg?.addons?.[key]) ? (
                  <div className="rounded-xl border border-[#DCE7F3] bg-white px-4 py-3 text-[14px] italic text-[#5B6B7A]">
                    {ui.noVisibleServices}
                  </div>
                ) : null}

                <div className="space-y-2">
                  {servicesWithMeta.map(({ svc, meta, label }) => {
                    const state = getServiceState(data, svc.key);
                    const active = !!state.selected;
                    const qty = getServiceQty(svc, meta);

                    return (
                      <div
                        key={svc.key}
                        className={[
                          "rounded-xl border-2 px-4 py-3 transition-all",
                          active
                            ? "border-[#0194F3] bg-[#EAF4FE]"
                            : "border-[#DCE7F3] bg-white hover:border-[#B9DDFB]"
                        ].join(" ")}
                      >
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
                                  <div className="text-[16px] font-semibold leading-6 text-[#1C2930] sm:text-[18px]">
                                    {label}:
                                  </div>
                                  {renderServiceDescription(svc, meta)}
                                </div>

                                <div className="shrink-0 whitespace-nowrap text-[14px] font-bold text-[#FF5E1F] sm:text-[16px]">
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

                        {meta.activeNoteLines?.length ? (
                          <div className="mt-2 space-y-1 sm:ml-11">
                            {meta.activeNoteLines.map((line, idx) => (
                              <p
                                key={`${svc.key}-note-${idx}`}
                                className={[
                                  "text-[13px] italic leading-5 sm:text-[14px]",
                                  toneClass(line.tone),
                                ].join(" ")}
                              >
                                {(line as any).href ? (
                                  <a
                                    href={(line as any).href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-blue-600"
                                  >
                                    {line.text}
                                  </a>
                                ) : (
                                  line.text
                                )}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {meta.warningWhenUnchecked && !active ? (
                          <div className="mt-2 text-[13px] italic leading-6 text-[#FF5E1F] sm:ml-11 sm:text-[14px]">
                            {meta.warningWhenUnchecked}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {activePickupWarning ? (
                    <div className="rounded-xl border border-[#FF5E1F] bg-[#FFF4ED] px-4 py-3 text-[14px] italic leading-6 text-[#FF5E1F]">
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
                      <div
                        key={key}
                        className={[
                          "rounded-xl border-2 px-4 py-3 transition-all",
                          active
                            ? "border-[#0194F3] bg-[#EAF4FE]"
                            : "border-[#DCE7F3] bg-white hover:border-[#B9DDFB]"
                        ].join(" ")}
                      >
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
                                  <div className="text-[16px] font-semibold leading-6 text-[#1C2930] sm:text-[18px]">
                                    {title}:
                                  </div>
                                </div>

                                <div className="shrink-0 whitespace-nowrap text-[14px] font-bold text-[#FF5E1F] sm:text-[16px]">
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

                        {isFlycam || is360 ? (
                          <div className="mt-2 space-y-2 sm:ml-11">
                            {isFlycam ? (
                              <>
                                <p className="text-[13px] italic leading-5 text-[#355166] sm:text-[14px]">
                                  {ui.flycamDescription}
                                </p>
                                {selected === "ha_noi" ? (
                                  <p className="text-[13px] italic leading-5 text-[#FF5E1F] sm:text-[14px]">
                                    {ui.optionalServicesFlycamNotice}
                                  </p>
                                ) : null}
                              </>
                            ) : null}

                            {is360 ? (
                              <p className="text-[13px] italic leading-5 text-[#355166] sm:text-[14px]">
                                {ui.camera360Description}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {/* Free GoPro */}
                  <div className="rounded-xl border-2 border-[#16A34A] bg-[#F0FDF4] px-4 py-3">
                    <div className="flex items-start gap-3">
                      <ToggleIndicator checked />
                      <div className="text-[16px] font-semibold leading-6 text-[#1C2930] sm:text-[18px]">
                        {ui.freeGopro}: <span className="text-[#16A34A]">FREE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Accordions */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <details className="rounded-xl border border-[#DCE7F3] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[16px] font-semibold text-[#1C2930] sm:text-[18px] [&::-webkit-details-marker]:hidden">
                    <span>✅ {ui.includedLabel}:</span>
                    <span className="text-[#5B6B7A]">▾</span>
                  </summary>

                  <div className="border-t border-[#DCE7F3] px-4 py-4">
                    <div className="flex flex-col gap-3">
                      {(() => {
                        const pkgCfg = selectedCfg?.packages?.find(
                          (p) => p.key === data.packageKey,
                        );
                        const list =
                          pkgCfg?.included?.[lang as LangCode] ??
                          pkgCfg?.included?.en ??
                          pkgCfg?.included?.vi ??
                          selectedCfg.included?.[lang as LangCode] ??
                          selectedCfg.included?.en ??
                          selectedCfg.included?.vi ??
                          [];

                        const excludedList =
                          pkgCfg?.excluded?.[lang as LangCode] ??
                          pkgCfg?.excluded?.en ??
                          pkgCfg?.excluded?.vi ??
                          selectedCfg.excluded?.[lang as LangCode] ??
                          selectedCfg.excluded?.en ??
                          selectedCfg.excluded?.vi ??
                          [];

                        return (
                          <>
                            {list.map((item: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3">
                                <span className="mt-0.5 text-[18px] leading-none text-[#16A34A]">
                                  ✓
                                </span>
                                <span className="text-[15px] leading-6 text-[#1C2930] sm:text-[16px]">
                                  {item}
                                </span>
                              </div>
                            ))}
                            {excludedList.length > 0 &&
                              excludedList.map((item: string, idx: number) => (
                                <div
                                  key={`ex-${idx}`}
                                  className="flex items-start gap-3"
                                >
                                  <span className="mt-0.5 text-[18px] leading-none text-red-500">
                                    ✕
                                  </span>
                                  <span className="text-[15px] font-medium leading-6 text-red-500 sm:text-[16px]">
                                    {ui.excludedLabel}: {item}
                                  </span>
                                </div>
                              ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </details>

                <details className="rounded-xl border border-[#DCE7F3] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[16px] font-semibold text-[#1C2930] sm:text-[18px] [&::-webkit-details-marker]:hidden">
                    <span>🎁 {ui.groupDiscountTitle}</span>
                    <span className="text-[#5B6B7A]">▾</span>
                  </summary>

                  <div className="border-t border-[#DCE7F3] px-4 py-3 text-[14px] text-[#5B6B7A]">
                    <div className="space-y-2">
                      {[
                        { min: 2, vnd: 50_000 },
                        { min: 3, vnd: 70_000 },
                        { min: 4, vnd: 100_000 },
                        { min: 6, vnd: 150_000 },
                      ].map((tier) => (
                        <div
                          key={tier.min}
                          className="flex items-center justify-between gap-4 border-b border-[#DCE7F3] pb-2 last:border-b-0 last:pb-0"
                        >
                          <span className="text-[#1C2930]">
                            {tier.min}+ {ui.groupGuestsSuffix}
                          </span>
                          <span className="font-semibold text-[#FF5E1F]">
                            -{formatVND(tier.vnd)}/{ui.perPersonWord}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>

              {/* Footer Links & CTA */}
              <div className="space-y-3">
                {footerConfig.inlineLinks.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] sm:px-2 sm:text-[14px]">
                    {footerConfig.inlineLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className={[
                          "underline underline-offset-2 transition hover:opacity-80",
                          item.tone === "red"
                            ? "text-[#FF5E1F]"
                            : "text-[#0194F3]",
                        ].join(" ")}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : null}

                {footerConfig.note ? (
                  <div className="px-1 text-[13px] italic text-[#5B6B7A] sm:px-2 sm:text-[14px]">
                    {footerConfig.note}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={next}
                    disabled={!canGoNext}
                    className="inline-flex min-h-[52px] min-w-[170px] items-center justify-center rounded-xl bg-[#0194F3] px-6 text-[16px] font-bold uppercase text-white shadow-md transition hover:bg-[#0B83D9] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-[#B9DDFB] disabled:shadow-none sm:min-h-[58px] sm:min-w-[200px] sm:px-8 sm:text-[18px]"
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
