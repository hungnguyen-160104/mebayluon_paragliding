"use client";

import React, { useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { LOCATIONS } from "@/lib/booking/calculate-price";
import type { LocationKey } from "@/lib/booking/calculate-price";
import {
  useBookingText,
  BIGC_THANG_LONG_MAP,
} from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const UI_TEXT: Record<
  LangUI,
  {
    chooseLocationFirst: string;
    packageLabel: string;
    flightTypeLabel: string;
    pickupDetails: string;
    pickupRequired: string;
    fixedPickupPoint: string;
    viewMap: string;
    notSelected: string;
    paragliding: string;
    paramotor: string;
  }
> = {
  vi: {
    chooseLocationFirst: "Vui lòng chọn điểm bay trước khi nhập thông tin liên hệ.",
    packageLabel: "Gói bay",
    flightTypeLabel: "Loại bay",
    pickupDetails: "Thông tin đón/trả",
    pickupRequired: "Vui lòng nhập địa chỉ đón cho dịch vụ đã chọn.",
    fixedPickupPoint: "Điểm đón cố định",
    viewMap: "Xem bản đồ",
    notSelected: "Chưa chọn",
    paragliding: "Bay dù không động cơ",
    paramotor: "Bay dù gắn động cơ",
  },
  en: {
    chooseLocationFirst: "Please choose a flight location before entering contact details.",
    packageLabel: "Flight package",
    flightTypeLabel: "Flight type",
    pickupDetails: "Pickup details",
    pickupRequired: "Please enter the pickup address for the selected service.",
    fixedPickupPoint: "Fixed pickup point",
    viewMap: "View map",
    notSelected: "Not selected",
    paragliding: "Paragliding",
    paramotor: "Paramotor",
  },
  fr: {
    chooseLocationFirst: "Veuillez choisir un site de vol avant de saisir les coordonnées.",
    packageLabel: "Forfait de vol",
    flightTypeLabel: "Type de vol",
    pickupDetails: "Informations de prise en charge",
    pickupRequired: "Veuillez saisir l’adresse de prise en charge pour le service sélectionné.",
    fixedPickupPoint: "Point de prise en charge fixe",
    viewMap: "Voir la carte",
    notSelected: "Non sélectionné",
    paragliding: "Parapente",
    paramotor: "Paramoteur",
  },
  ru: {
    chooseLocationFirst: "Пожалуйста, сначала выберите место полёта, прежде чем вводить контактные данные.",
    packageLabel: "Пакет полёта",
    flightTypeLabel: "Тип полёта",
    pickupDetails: "Информация о трансфере",
    pickupRequired: "Пожалуйста, укажите адрес трансфера для выбранной услуги.",
    fixedPickupPoint: "Фиксированная точка посадки",
    viewMap: "Открыть карту",
    notSelected: "Не выбрано",
    paragliding: "Параплан",
    paramotor: "Парамотор",
  },
  hi: {
    chooseLocationFirst: "कृपया संपर्क जानकारी भरने से पहले फ्लाइट लोकेशन चुनें।",
    packageLabel: "फ्लाइट पैकेज",
    flightTypeLabel: "फ्लाइट प्रकार",
    pickupDetails: "पिकअप जानकारी",
    pickupRequired: "कृपया चुनी गई सेवा के लिए पिकअप पता दर्ज करें।",
    fixedPickupPoint: "फिक्स्ड पिकअप पॉइंट",
    viewMap: "मैप देखें",
    notSelected: "चयन नहीं किया गया",
    paragliding: "पैराग्लाइडिंग",
    paramotor: "पैरामोटर",
  },
  zh: {
    chooseLocationFirst: "请输入联系信息前，请先选择飞行地点。",
    packageLabel: "飞行套餐",
    flightTypeLabel: "飞行类型",
    pickupDetails: "接送信息",
    pickupRequired: "请选择接送服务后填写接送地址。",
    fixedPickupPoint: "固定接送点",
    viewMap: "查看地图",
    notSelected: "未选择",
    paragliding: "无动力滑翔伞",
    paramotor: "动力伞",
  },
};

function TimeOptions() {
  const slots: string[] = [];
  for (let h = 7; h <= 18; h++) {
    const hh = h.toString().padStart(2, "0");
    slots.push(`${hh}:00`);
  }
  return (
    <>
      {slots.map((s) => (
        <option key={s} value={s} className="bg-neutral-800 text-white">
          {s}
        </option>
      ))}
    </>
  );
}

function getFlightTypeLabel(lang: LangUI, key?: string) {
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;
  if (key === "paramotor") return ui.paramotor;
  if (key === "paragliding") return ui.paragliding;
  return ui.notSelected;
}

export default function ContactInfoStep() {
  const t = useBookingText();
  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);
  const setContact = useBookingStore((s) => s.setContact);
  const setServiceInput = useBookingStore((s) => s.setServiceInput);

  const lang = ((t as any)?.lang || "vi") as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const cfg = data.location ? LOCATIONS[data.location as LocationKey] : undefined;

  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [dateError, setDateError] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const inputStyle =
    "mt-2 w-full rounded-lg border border-white/40 bg-black/30 px-3 py-2 text-white placeholder:text-white/70 backdrop-blur-sm";
  const labelStyle = "block text-base font-medium text-white";
  const glassWrapperClass =
    "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-5 space-y-6";

  const selectedServices = useMemo(() => {
    if (!cfg?.services?.length) return [];

    return cfg.services.filter((svc) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return false;
        if (!svc.visibleForPackages.includes(data.packageKey as any)) return false;
      }
      return !!data.services?.[svc.key]?.selected;
    });
  }, [cfg, data.packageKey, data.services]);

  const pickupServices = useMemo(() => {
    return selectedServices.filter((svc) => svc.requiresPickupInput || svc.fixedMapUrl);
  }, [selectedServices]);

  const packageLabel = useMemo(() => {
    if (!cfg?.packages?.length || !data.packageKey) return ui.notSelected;
    const found = cfg.packages.find((p) => p.key === data.packageKey);
    return found ? found.label[lang] ?? found.label.vi : ui.notSelected;
  }, [cfg, data.packageKey, lang, ui.notSelected]);

  const validatePickupServices = () => {
    const missing = pickupServices.some((svc) => {
      if (svc.fixedMapUrl) return false;
      if (!svc.requiresPickupInput) return false;
      const value = data.services?.[svc.key]?.inputText || "";
      return !value.trim();
    });

    setPickupError(missing ? ui.pickupRequired : null);
    return !missing;
  };

  return (
    <form
      className="space-y-6 text-white"
      onSubmit={(e) => {
        e.preventDefault();
        const pickupValid = validatePickupServices();
        if (!dateError && pickupValid) next();
      }}
    >
      <div className={glassWrapperClass}>
        {!cfg && (
          <p className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-white backdrop-blur-sm">
            {ui.chooseLocationFirst}
          </p>
        )}

        {cfg && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>{t.labels.location}</label>
              <div className="mt-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white">
                {cfg.name[lang] ?? cfg.name.vi}
              </div>
            </div>

            <div>
              <label className={labelStyle}>{ui.packageLabel}</label>
              <div className="mt-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white">
                {cfg.key === "khau_pha" ? packageLabel : ui.notSelected}
              </div>
            </div>

            <div>
              <label className={labelStyle}>{ui.flightTypeLabel}</label>
              <div className="mt-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white">
                {cfg.key === "khau_pha"
                  ? getFlightTypeLabel(lang, data.flightTypeKey)
                  : getFlightTypeLabel(lang, "paragliding")}
              </div>
            </div>

            <div>
              <label className={labelStyle}>{t.labels.numGuests}</label>
              <div className="mt-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white">
                {data.guestsCount || 1}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>{t.labels.date}</label>
            <input
              type="date"
              value={data.dateISO || ""}
              min={tomorrowISO}
              onChange={(e) => {
                const val = e.target.value;
                update({ dateISO: val });
                setDateError(val && val < tomorrowISO ? t.messages.errors.dateInPast : null);
              }}
              className={`${inputStyle} scheme-dark`}
              required
            />
            {dateError && <p className="mt-1 text-xs text-red-300">{dateError}</p>}
          </div>

          <div>
            <label className={labelStyle}>{t.labels.timeSlot}</label>
            <select
              value={data.timeSlot || ""}
              onChange={(e) => update({ timeSlot: e.target.value })}
              className={inputStyle}
              required
            >
              <option value="" disabled className="bg-neutral-800 text-gray-400">
                {t.placeholders.timeSlotPlaceholder}
              </option>
              <TimeOptions />
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>{t.labels.phone}</label>
            <input
              type="tel"
              placeholder={t.placeholders.phone}
              value={data.contact?.phone || ""}
              onChange={(e) => setContact({ phone: e.target.value })}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className={labelStyle}>{t.labels.email}</label>
            <input
              type="email"
              placeholder={t.placeholders.email}
              value={data.contact?.email || ""}
              onChange={(e) => setContact({ email: e.target.value })}
              className={inputStyle}
              required
            />
          </div>
        </div>

        {pickupServices.length > 0 && (
          <div className="space-y-4">
            <div className="text-base font-semibold text-white">{ui.pickupDetails}</div>

            {pickupServices.map((svc) => {
              const label = svc.label[lang] ?? svc.label.vi;

              if (svc.fixedMapUrl) {
                return (
                  <div
                    key={svc.key}
                    className="rounded-lg border border-white/30 bg-white/10 p-4 text-sm text-white"
                  >
                    <div className="font-medium">{label}</div>
                    <div className="mt-2">
                      {ui.fixedPickupPoint}:{" "}
                      <a
                        href={svc.fixedMapUrl || BIGC_THANG_LONG_MAP}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-300 underline font-medium"
                      >
                        {ui.viewMap}
                      </a>
                    </div>
                  </div>
                );
              }

              return (
                <div key={svc.key}>
                  <label className={labelStyle}>{label}</label>
                  <input
                    type="text"
                    placeholder={t.placeholders.pickup}
                    value={data.services?.[svc.key]?.inputText || ""}
                    onChange={(e) => {
                      setServiceInput(svc.key, e.target.value);

                      if (data.contact?.pickupLocation !== e.target.value) {
                        setContact({ pickupLocation: e.target.value });
                      }

                      if (pickupError) setPickupError(null);
                    }}
                    className={inputStyle}
                    required
                  />
                </div>
              );
            })}

            {pickupError && <p className="text-xs text-red-300">{pickupError}</p>}
          </div>
        )}

        <div>
          <label className={labelStyle}>{t.labels.specialRequest}</label>
          <textarea
            rows={3}
            placeholder={t.placeholders.specialRequest}
            value={data.contact?.specialRequest || ""}
            onChange={(e) => setContact({ specialRequest: e.target.value })}
            className={inputStyle}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={back}
          className="px-4 py-2 rounded-xl border border-white/40 bg-black/30 text-white hover:bg-black/50 transition backdrop-blur-sm"
        >
          {t.buttons.back}
        </button>

        <button
          type="submit"
          disabled={!cfg || Boolean(dateError)}
          className="px-5 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition disabled:opacity-60"
        >
          {t.buttons.next}
        </button>
      </div>
    </form>
  );
}