"use client";
import React from "react";
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
    basePrice: string;
    selectLocation: string;
    selected: string;
    packageHint: string;
    weekdayFrom: string;
    weekendFrom: string;
  }
> = {
  vi: {
    basePrice: "/ khách (giá cơ bản)",
    selectLocation: "Chọn điểm bay",
    selected: "Đã chọn",
    packageHint: "Có nhiều gói bay",
    weekdayFrom: "Ngày thường từ",
    weekendFrom: "Cuối tuần/lễ từ",
  },
  en: {
    basePrice: "/ pax (base price)",
    selectLocation: "Choose location",
    selected: "Selected",
    packageHint: "Multiple packages available",
    weekdayFrom: "Weekday from",
    weekendFrom: "Weekend/holiday from",
  },
  fr: {
    basePrice: "/ pers (prix de base)",
    selectLocation: "Choisir le site",
    selected: "Sélectionné",
    packageHint: "Plusieurs forfaits disponibles",
    weekdayFrom: "Jour ouvré à partir de",
    weekendFrom: "Week-end/férié à partir de",
  },
  ru: {
    basePrice: "/ чел (базовая цена)",
    selectLocation: "Выбрать локацию",
    selected: "Выбрано",
    packageHint: "Доступно несколько пакетов",
    weekdayFrom: "Будни от",
    weekendFrom: "Выходные/праздники от",
  },
  hi: {
    basePrice: "/ यात्री (बेस प्राइस)",
    selectLocation: "लोकेशन चुनें",
    selected: "चयनित",
    packageHint: "एक से अधिक पैकेज उपलब्ध",
    weekdayFrom: "कार्यदिवस से",
    weekendFrom: "सप्ताहांत/छुट्टी से",
  },
  zh: {
    basePrice: "/ 人（基础价格）",
    selectLocation: "选择飞行地点",
    selected: "已选择",
    packageHint: "提供多个套餐",
    weekdayFrom: "工作日起",
    weekendFrom: "周末/节假日起",
  },
};

export default function FlightCard({ location, selected, onSelect, dateISO }: Props) {
  const { language } = useLanguage();
  const lang = (language as LangCode) || "vi";
  const ui = UI_TEXT[(lang as keyof typeof UI_TEXT) || "vi"] ?? UI_TEXT.vi;

  const opt = getFlightByLocationKey(location);
  const cfg = LOCATIONS[location];

  const priceFromLegacy = (() => {
    const weekend = isWeekend(dateISO);
    if (weekend && opt.price.weekend) return opt.price.weekend;
    return opt.price.weekday ?? opt.price.weekend ?? 0;
  })();

  const basePrice = priceFromLegacy || cfg.basePriceVND(dateISO);

  const weekdayBase = cfg.basePriceVND("2026-03-09");
  const weekendBase = cfg.basePriceVND("2026-03-08");
  const hasDynamicWeekendPrice = weekdayBase !== weekendBase;
  const hasPackages = !!cfg.packages?.length;

  return (
    <div
      role="button"
      onClick={() => onSelect?.(location)}
      className={`group overflow-hidden rounded-2xl border transition hover:shadow-md cursor-pointer ${
        selected ? "border-blue-600 ring-2 ring-blue-200" : "border-neutral-200"
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
        <img
          src={opt.image}
          alt={opt.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {hasPackages ? (
          <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">
            {ui.packageHint}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{cfg.name[lang] ?? cfg.name.vi}</div>

            {cfg.included?.[lang]?.length ? (
              <ul className="text-sm text-neutral-600 list-disc ml-5 mt-2">
                {(cfg.included[lang] ?? cfg.included.vi).slice(0, 3).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">{formatVND(basePrice)}</div>
            <div className="text-xs text-neutral-500">{ui.basePrice}</div>
          </div>
        </div>

        {hasDynamicWeekendPrice ? (
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-neutral-600">
            <div className="rounded-md bg-neutral-100 px-2 py-1">
              {ui.weekdayFrom}: <span className="font-semibold">{formatVND(weekdayBase)}</span>
            </div>
            <div className="rounded-md bg-neutral-100 px-2 py-1">
              {ui.weekendFrom}: <span className="font-semibold">{formatVND(weekendBase)}</span>
            </div>
          </div>
        ) : opt.options?.length ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-600">
            {opt.options.slice(0, 2).map((o, i) => (
              <div key={i} className="rounded-md bg-neutral-100 px-2 py-1">
                {o.name} (+{o.price.toLocaleString("vi-VN")}₫)
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <span
            className={`rounded-xl px-3 py-1 text-sm font-medium ${
              selected ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {selected ? ui.selected : ui.selectLocation}
          </span>
        </div>
      </div>
    </div>
  );
}