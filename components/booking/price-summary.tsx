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
    title: string;
    subtitle: string;
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
    totalLabel: string;
    autoPromoNote: string;
  }
> = {
  vi: {
    title: "Tóm tắt chi phí",
    subtitle:
      "Chi phí sẽ được cập nhật ngay khi bạn thay đổi điểm bay, số khách hoặc dịch vụ.",
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
    totalLabel: "Tạm tính",
    autoPromoNote: "Ưu đãi nhóm sẽ được áp dụng tự động nếu đủ điều kiện.",
  },
  en: {
    title: "Price summary",
    subtitle:
      "The price updates instantly when you change location, guest count, or services.",
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
    totalLabel: "Estimated total",
    autoPromoNote: "Group promotion is applied automatically when eligible.",
  },
  fr: {
    title: "Résumé du prix",
    subtitle:
      "Le prix se met à jour immédiatement selon le site, le nombre de passagers et les services.",
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
    totalLabel: "Total estimé",
    autoPromoNote:
      "La remise de groupe s’applique automatiquement si éligible.",
  },
  ru: {
    title: "Сводка стоимости",
    subtitle:
      "Цена обновляется сразу при изменении локации, количества гостей или услуг.",
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
    totalLabel: "Предварительный итог",
    autoPromoNote:
      "Групповая скидка применяется автоматически при соблюдении условий.",
  },
  hi: {
    title: "मूल्य सारांश",
    subtitle:
      "लोकेशन, यात्रियों की संख्या या सेवाएँ बदलते ही मूल्य अपडेट हो जाएगा।",
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
    totalLabel: "अनुमानित कुल",
    autoPromoNote: "योग्य होने पर समूह छूट स्वतः लागू होगी।",
  },
  zh: {
    title: "价格摘要",
    subtitle:
      "当您更改飞行地点、人数或服务时，价格会立即更新。",
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
    totalLabel: "预估总价",
    autoPromoNote: "符合条件时，团队优惠将自动生效。",
  },
};

function getFlightTypeLabel(lang: LangUI, key?: string) {
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;
  if (key === "paramotor") return ui.paramotor;
  if (key === "paragliding") return ui.paragliding;
  return ui.notSelected;
}

function getHolidayTypeLabel(
  lang: LangUI,
  holidayType?: "weekday" | "weekend" | "holiday"
) {
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

  const selectedPackage = cfg?.packages?.find((p) => p.key === data.packageKey);
  const packageLabel =
    selectedPackage?.label?.[lang] ??
    selectedPackage?.label?.vi ??
    ui.notSelected;

  return (
    <aside className="rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
      <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent px-4 py-4 md:px-5">
        <h3 className="text-lg font-semibold text-white">{ui.title}</h3>
        <p className="mt-1 text-sm text-white/75">{ui.subtitle}</p>
      </div>

      <div className="p-4 md:p-5">
        <div className="space-y-3">
          <SummaryRow
            label={t.labels.location}
            value={cfg.name[lang] ?? cfg.name.vi}
          />

          {cfg?.packages?.length ? (
            <SummaryRow label={ui.packageLabel} value={packageLabel} />
          ) : null}

          <SummaryRow
            label={ui.flightTypeLabel}
            value={
              cfg.key === "khau_pha"
                ? getFlightTypeLabel(lang, data.flightTypeKey)
                : getFlightTypeLabel(lang, "paragliding")
            }
          />

          <SummaryRow
            label={t.labels.numGuests}
            value={String(data.guestsCount)}
          />

          <SummaryRow
            label={ui.holidayType}
            value={getHolidayTypeLabel(lang, totals.holidayType)}
          />
        </div>

        <div className="my-4 h-px bg-white/10" />

        <div className="space-y-3">
          <PriceRow
            label={t.labels.basePricePerGuest}
            value={formatByLang(
              lang,
              totals.basePricePerPerson,
              totals.basePricePerPerson
            )}
          />

          {addonQtyEntries
            .filter(([, qty]) => qty > 0)
            .map(([k, qty]) => {
              const label = cfg.addons[k].label[lang] ?? cfg.addons[k].label.vi;
              const lineTotal = totals.addonsTotal[k] || 0;

              return (
                <PriceRow
                  key={k}
                  label={
                    t.labels.addonSurcharge
                      ? t.labels.addonSurcharge(label)
                      : `${ui.serviceSurcharge}: ${label}`
                  }
                  value={`${formatByLang(lang, lineTotal, lineTotal)} · ${qty} ${ui.pax}`}
                />
              );
            })}

          {totals.discountPerPerson > 0 ? (
            <PriceRow
              label={t.labels.groupDiscount}
              value={`-${formatByLang(
                lang,
                totals.discountPerPerson,
                totals.discountPerPerson
              )} / ${ui.pax}`}
              highlight="discount"
            />
          ) : null}
        </div>

        <div className="my-4 h-px bg-white/10" />

        <div className="rounded-2xl bg-slate-950/45 border border-white/10 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                {ui.totalLabel}
              </div>
              <div className="mt-1 text-sm text-white/75">
                {t.labels.provisionalTotal}
              </div>
            </div>

            <div className="text-right text-xl md:text-2xl font-bold text-white">
              {formatByLang(
                lang,
                totals.totalAfterDiscount,
                totals.totalAfterDiscount
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/65 leading-5">
          * {t.messages.groupPromoAuto || ui.autoPromoNote}
        </p>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
      <span className="text-sm text-white/65">{label}</span>
      <span className="text-sm font-semibold text-white text-right break-words">
        {value}
      </span>
    </div>
  );
}

function PriceRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "discount";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-white/70">{label}</span>
      <span
        className={`text-sm font-semibold text-right ${
          highlight === "discount" ? "text-rose-300" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}