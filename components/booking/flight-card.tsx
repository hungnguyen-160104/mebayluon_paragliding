"use client";

import React, { useMemo } from "react";
import type { LocationKey } from "@/lib/booking/calculate-price";
import { LOCATIONS, formatVND } from "@/lib/booking/calculate-price";
import { getFlightByLocationKey } from "@/lib/booking/booking-data";
import { isWeekend } from "@/lib/booking/date-utils";
import { useLanguage } from "@/contexts/language-context";
import type { LangCode } from "@/lib/booking/translations-booking";

type Props = {
  location: LocationKey;
  selected?: boolean;
  onSelect?: (loc: LocationKey) => void;
  dateISO?: string;
};

const UI_TEXT: Record<
  "vi" | "en" | "fr" | "ru" | "hi" | "zh",
  {
    selected: string;
    featured: string;
    packageHint: string;
    fromPrice: string;
    pax: string;
  }
> = {
  vi: {
    selected: "Đã chọn",
    featured: "Nổi bật",
    packageHint: "Nhiều gói bay",
    fromPrice: "từ",
    pax: "pax",
  },
  en: {
    selected: "Selected",
    featured: "Featured",
    packageHint: "Multiple packages",
    fromPrice: "from",
    pax: "pax",
  },
  fr: {
    selected: "Sélectionné",
    featured: "En vedette",
    packageHint: "Plusieurs forfaits",
    fromPrice: "de",
    pax: "pers",
  },
  ru: {
    selected: "Выбрано",
    featured: "Рекомендуем",
    packageHint: "Несколько пакетов",
    fromPrice: "от",
    pax: "чел",
  },
  hi: {
    selected: "चयनित",
    featured: "हाइलाइट",
    packageHint: "कई पैकेज",
    fromPrice: "से",
    pax: "यात्री",
  },
  zh: {
    selected: "已选择",
    featured: "推荐",
    packageHint: "多个套餐",
    fromPrice: "起",
    pax: "人",
  },
};

function splitLocationName(raw: string) {
  const trimmed = (raw || "").trim();

  const parenMatch = trimmed.match(/^(.+?)\s*\((.+)\)$/);
  if (parenMatch) {
    return {
      main: parenMatch[1].trim(),
      sub: parenMatch[2].trim(),
    };
  }

  const dashIndex = trimmed.indexOf(" - ");
  if (dashIndex > 0) {
    return {
      main: trimmed.slice(0, dashIndex).trim(),
      sub: trimmed.slice(dashIndex + 3).trim(),
    };
  }

  const lineParts = trimmed
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  if (lineParts.length >= 2) {
    return {
      main: lineParts[0],
      sub: lineParts.slice(1).join(" "),
    };
  }

  return {
    main: trimmed,
    sub: "",
  };
}

export default function FlightCard({
  location,
  selected,
  onSelect,
  dateISO,
}: Props) {
  const { language } = useLanguage();
  const lang = (language as LangCode) || "vi";
  const ui = UI_TEXT[(lang as keyof typeof UI_TEXT) || "vi"] ?? UI_TEXT.vi;

  const opt = getFlightByLocationKey(location);
  const cfg = LOCATIONS[location];

  const effectiveBasePrice = useMemo(() => {
    const weekend = isWeekend(dateISO);
    const legacy =
      weekend && opt.price.weekend
        ? opt.price.weekend
        : opt.price.weekday ?? opt.price.weekend ?? 0;

    return legacy || cfg.basePriceVND(dateISO);
  }, [cfg, dateISO, opt.price.weekday, opt.price.weekend]);

  const hasPackages = !!cfg.packages?.length;
  const displayName = cfg.name[lang] ?? cfg.name.vi;
  const { main, sub } = splitLocationName(displayName);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(location)}
      className={[
        "group relative flex min-h-[168px] w-full flex-col overflow-hidden rounded-xl border-2 text-left transition-all duration-300",
        selected
          ? "border-[#0194F3] bg-[#EAF4FE] shadow-lg ring-2 ring-[#B9DDFB]"
          : "border-[#DCE7F3] bg-white shadow-sm hover:border-[#B9DDFB] hover:shadow-md hover:-translate-y-0.5",
      ].join(" ")}
    >
      <div className="relative flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#B9DDFB] bg-[#EAF4FE] px-2.5 py-1 text-[10px] font-semibold text-[#0194F3]">
              {ui.featured}
            </span>
            {hasPackages ? (
              <span className="rounded-full border border-[#DCE7F3] bg-[#F5F7FA] px-2.5 py-1 text-[10px] font-medium text-[#5B6B7A]">
                {ui.packageHint}
              </span>
            ) : null}
          </div>

          {selected ? (
            <span className="shrink-0 rounded-full border border-[#16A34A] bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-bold text-[#16A34A]">
              ✓ {ui.selected}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex-1">
          <h3 className={[
            "text-[19px] font-bold uppercase tracking-[0.02em] md:text-[20px]",
            selected ? "text-[#0194F3]" : "text-[#1C2930]"
          ].join(" ")}>
            {main}
          </h3>

          {sub ? (
            <div className="mt-2 text-[14px] font-medium leading-5 text-[#5B6B7A] md:text-[15px]">
              {sub}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="text-[15px] font-bold text-[#FF5E1F] md:text-[16px]">
            {ui.fromPrice} {formatVND(effectiveBasePrice)}/{ui.pax}
          </div>
        </div>
      </div>
    </button>
  );
}
