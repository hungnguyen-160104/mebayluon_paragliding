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
        "group relative flex min-h-[168px] w-full flex-col overflow-hidden rounded-[20px] border text-left transition-all duration-300",
        "backdrop-blur-xl",
        selected
          ? "border-yellow-200/70 bg-[linear-gradient(180deg,rgba(255,193,7,0.92),rgba(245,166,35,0.86))] shadow-[0_12px_30px_rgba(245,158,11,0.28)]"
          : "border-white/20 bg-[linear-gradient(180deg,rgba(255,190,11,0.82),rgba(245,158,11,0.76))] shadow-[0_8px_24px_rgba(15,23,42,0.14)] hover:border-white/35 hover:shadow-[0_12px_28px_rgba(15,23,42,0.18)]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_34%)]" />

      <div className="relative flex h-full flex-col p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/95">
              {ui.featured}
            </span>
            {hasPackages ? (
              <span className="rounded-full border border-white/20 bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/85">
                {ui.packageHint}
              </span>
            ) : null}
          </div>

          {selected ? (
            <span className="shrink-0 rounded-full border border-white/25 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ✓ {ui.selected}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex-1">
          <h3 className="text-[19px] font-extrabold uppercase tracking-[0.02em] text-red-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.15)] md:text-[20px]">
            {main}
          </h3>

          {sub ? (
            <div className="mt-3 text-[14px] font-semibold italic leading-5 text-yellow-50/95 md:text-[15px]">
              {sub}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="text-[14px] font-semibold italic text-red-600 md:text-[15px]">
            {ui.fromPrice} {formatVND(effectiveBasePrice)}/{ui.pax}
          </div>
        </div>
      </div>
    </button>
  );
}