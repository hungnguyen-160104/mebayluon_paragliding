"use client";

import React from "react";
import { useBookingStore } from "@/store/booking-store";
import {
  LOCATIONS,
  computePriceByLang,
  formatByLang,
  type AddonKey,
} from "@/lib/booking/calculate-price";
import { useLangCode, useBookingText } from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const UI_TEXT: Record<
  LangUI,
  {
    packageLabel: string;
    flightTypeLabel: string;
    serviceSurcharge: string;
    pax: string;
    notSelected: string;
    paragliding: string;
    paramotor: string;
    holidayType: string;
    weekday: string;
    weekend: string;
    holiday: string;
  }
> = {
  vi: {
    packageLabel: "Gói bay",
    flightTypeLabel: "Loại bay",
    serviceSurcharge: "Phụ phí dịch vụ",
    pax: "khách",
    notSelected: "Chưa chọn",
    paragliding: "Bay dù không động cơ",
    paramotor: "Bay dù gắn động cơ",
    holidayType: "Loại ngày",
    weekday: "Ngày thường",
    weekend: "Cuối tuần",
    holiday: "Ngày lễ",
  },
  en: {
    packageLabel: "Flight package",
    flightTypeLabel: "Flight type",
    serviceSurcharge: "Service surcharge",
    pax: "pax",
    notSelected: "Not selected",
    paragliding: "Paragliding",
    paramotor: "Paramotor",
    holidayType: "Day type",
    weekday: "Weekday",
    weekend: "Weekend",
    holiday: "Holiday",
  },
  fr: {
    packageLabel: "Forfait de vol",
    flightTypeLabel: "Type de vol",
    serviceSurcharge: "Supplément de service",
    pax: "pers",
    notSelected: "Non sélectionné",
    paragliding: "Parapente",
    paramotor: "Paramoteur",
    holidayType: "Type de jour",
    weekday: "Jour ouvré",
    weekend: "Week-end",
    holiday: "Jour férié",
  },
  ru: {
    packageLabel: "Пакет полёта",
    flightTypeLabel: "Тип полёта",
    serviceSurcharge: "Доплата за услугу",
    pax: "чел",
    notSelected: "Не выбрано",
    paragliding: "Параплан",
    paramotor: "Парамотор",
    holidayType: "Тип дня",
    weekday: "Будний день",
    weekend: "Выходной",
    holiday: "Праздничный день",
  },
  hi: {
    packageLabel: "फ्लाइट पैकेज",
    flightTypeLabel: "फ्लाइट प्रकार",
    serviceSurcharge: "सेवा अतिरिक्त शुल्क",
    pax: "यात्री",
    notSelected: "चयन नहीं किया गया",
    paragliding: "पैराग्लाइडिंग",
    paramotor: "पैरामोटर",
    holidayType: "दिन का प्रकार",
    weekday: "कार्यदिवस",
    weekend: "सप्ताहांत",
    holiday: "छुट्टी",
  },
  zh: {
    packageLabel: "飞行套餐",
    flightTypeLabel: "飞行类型",
    serviceSurcharge: "服务附加费",
    pax: "人",
    notSelected: "未选择",
    paragliding: "无动力滑翔伞",
    paramotor: "动力伞",
    holidayType: "日期类型",
    weekday: "工作日",
    weekend: "周末",
    holiday: "节假日",
  },
};

function getFlightTypeLabel(lang: LangUI, key?: string) {
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;
  if (key === "paramotor") return ui.paramotor;
  if (key === "paragliding") return ui.paragliding;
  return ui.notSelected;
}

function getHolidayTypeLabel(lang: LangUI, holidayType?: "weekday" | "weekend" | "holiday") {
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;
  if (holidayType === "holiday") return ui.holiday;
  if (holidayType === "weekend") return ui.weekend;
  return ui.weekday;
}

export default function PriceSummary() {
  const t = useBookingText();
  const lang = useLangCode() as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const data = useBookingStore((s) => s.data);

  const totals = computePriceByLang(
    {
      location: data.location,
      guestsCount: data.guestsCount,
      dateISO: data.dateISO,
      packageKey: data.packageKey,
      flightTypeKey: data.flightTypeKey,
      addons: data.addons,
      addonsQty: data.addonsQty,
    },
    lang
  );

  const cfg = LOCATIONS[data.location];
  const addonQtyEntries = Object.entries(totals.addonsQty) as [AddonKey, number][];

  const packageLabel =
    cfg?.packages?.find((p) => p.key === data.packageKey)?.label?.[lang] ??
    cfg?.packages?.find((p) => p.key === data.packageKey)?.label?.vi ??
    ui.notSelected;

  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl p-6 text-white">
      <h3 className="text-xl font-semibold mb-4">{t.labels.priceSummary}</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span>{t.labels.location}</span>
          <span className="text-right">{cfg.name[lang] ?? cfg.name.vi}</span>
        </div>

        {cfg?.packages?.length ? (
          <div className="flex justify-between gap-4">
            <span>{ui.packageLabel}</span>
            <span className="text-right">{packageLabel}</span>
          </div>
        ) : null}

        <div className="flex justify-between gap-4">
          <span>{ui.flightTypeLabel}</span>
          <span className="text-right">
            {cfg.key === "khau_pha"
              ? getFlightTypeLabel(lang, data.flightTypeKey)
              : getFlightTypeLabel(lang, "paragliding")}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span>{t.labels.numGuests}</span>
          <span>{data.guestsCount}</span>
        </div>

        <div className="flex justify-between gap-4">
          <span>{ui.holidayType}</span>
          <span>{getHolidayTypeLabel(lang, totals.holidayType)}</span>
        </div>

        <div className="border-t border-white/30 my-2" />

        <div className="flex justify-between gap-4">
          <span>{t.labels.basePricePerGuest}</span>
          <span>{formatByLang(lang, totals.basePricePerPerson, totals.basePricePerPerson)}</span>
        </div>

        {addonQtyEntries
          .filter(([, qty]) => qty > 0)
          .map(([k, qty]) => {
            const label = cfg.addons[k].label[lang] ?? cfg.addons[k].label.vi;
            const lineTotal = totals.addonsTotal[k] || 0;

            return (
              <div key={k} className="flex justify-between gap-4">
                <span>
                  {t.labels.addonSurcharge
                    ? t.labels.addonSurcharge(label)
                    : `${ui.serviceSurcharge}: ${label}`}{" "}
                  <span className="text-white/80">
                    × {qty} {ui.pax}
                  </span>
                </span>
                <span>{formatByLang(lang, lineTotal, lineTotal)}</span>
              </div>
            );
          })}

        {totals.discountPerPerson > 0 && (
          <div className="flex justify-between text-white gap-4">
            <span>{t.labels.groupDiscount}</span>
            <span className="text-right">
              -{formatByLang(lang, totals.discountPerPerson, totals.discountPerPerson)} / {ui.pax}
            </span>
          </div>
        )}

        <div className="border-t border-white/30 my-2" />
        <div className="flex justify-between font-semibold text-lg gap-4">
          <span>{t.labels.provisionalTotal}</span>
          <span>{formatByLang(lang, totals.totalAfterDiscount, totals.totalAfterDiscount)}</span>
        </div>
      </div>

      <p className="text-xs text-white/80 mt-3">* {t.messages.groupPromoAuto}</p>
    </div>
  );
}