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
    selectLocation: string;
    selected: string;
    featured: string;
    basePrice: string;
    fromPrice: string;
    weekdayFrom: string;
    weekendFrom: string;
    packageHint: string;
  }
> = {
  vi: {
    selectLocation: "Chọn điểm bay",
    selected: "Đã chọn",
    featured: "Nổi bật",
    basePrice: "Giá cơ bản",
    fromPrice: "Từ",
    weekdayFrom: "Ngày thường",
    weekendFrom: "Cuối tuần/lễ",
    packageHint: "Nhiều gói bay",
  },
  en: {
    selectLocation: "Choose location",
    selected: "Selected",
    featured: "Featured",
    basePrice: "Base price",
    fromPrice: "From",
    weekdayFrom: "Weekday",
    weekendFrom: "Weekend/holiday",
    packageHint: "Multiple packages",
  },
  fr: {
    selectLocation: "Choisir le site",
    selected: "Sélectionné",
    featured: "En vedette",
    basePrice: "Prix de base",
    fromPrice: "De",
    weekdayFrom: "Semaine",
    weekendFrom: "Week-end/Férié",
    packageHint: "Plusieurs forfaits",
  },
  ru: {
    selectLocation: "Выбрать",
    selected: "Выбрано",
    featured: "Рекомендуем",
    basePrice: "Базовая цена",
    fromPrice: "От",
    weekdayFrom: "Будни",
    weekendFrom: "Выходные",
    packageHint: "Несколько пакетов",
  },
  hi: {
    selectLocation: "चुनें",
    selected: "चयनित",
    featured: "हाइलाइट",
    basePrice: "बेस प्राइस",
    fromPrice: "से",
    weekdayFrom: "कार्यदिवस",
    weekendFrom: "सप्ताहांत",
    packageHint: "कई पैकेज",
  },
  zh: {
    selectLocation: "选择地点",
    selected: "已选择",
    featured: "推荐",
    basePrice: "基础价格",
    fromPrice: "起",
    weekdayFrom: "工作日",
    weekendFrom: "节假日",
    packageHint: "多个套餐",
  },
};

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

  const weekdayBase = cfg.basePriceVND("2026-03-10");
  const weekendBase = cfg.basePriceVND("2026-03-08");
  const hasDynamicWeekendPrice = weekdayBase !== weekendBase;
  const hasPackages = !!cfg.packages?.length;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(location)}
      className={`group relative flex w-full flex-col justify-between overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-300 min-h-[180px] ${
        selected
          ? "border-sky-300 bg-sky-500/20 shadow-[0_8px_30px_rgba(56,189,248,0.25)]"
          : "border-white/15 bg-white/10 hover:bg-white/15 hover:border-white/30"
      }`}
    >
      {/* Nửa trên: Huy hiệu & Tên địa điểm */}
      <div className="flex w-full flex-col items-start gap-3">
        <div className="flex w-full items-start justify-between gap-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              {ui.featured}
            </span>
            {hasPackages ? (
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">
                {ui.packageHint}
              </span>
            ) : null}
          </div>

          {selected ? (
            <span className="shrink-0 rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow-sm">
              ✓ {ui.selected}
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-bold leading-tight text-white drop-shadow-md lg:text-xl">
          {cfg.name[lang] ?? cfg.name.vi}
        </h3>
      </div>

      {/* Nửa dưới: Khu vực Giá */}
      <div className="mt-4 flex w-full flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] uppercase text-white/70">{ui.fromPrice}</span>
          <span className="text-xl font-bold text-white drop-shadow-sm 2xl:text-2xl">
            {formatVND(effectiveBasePrice)}
          </span>
        </div>

        {/* Giá chi tiết ngày thường / cuối tuần dạng list */}
        {hasDynamicWeekendPrice && (
          <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">{ui.weekdayFrom}:</span>
              <span className="font-semibold text-white/90">
                {formatVND(weekdayBase)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">{ui.weekendFrom}:</span>
              <span className="font-semibold text-white/90">
                {formatVND(weekendBase)}
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}