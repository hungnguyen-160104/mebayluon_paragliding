"use client";

import React, { useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { LOCATIONS } from "@/lib/booking/calculate-price";
import type { LocationKey } from "@/lib/booking/calculate-price";
import {
  BIGC_THANG_LONG_MAP,
  useLangCode,
} from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

type LocalizedValue =
  | string
  | Partial<Record<LangUI | "vi" | "en", string>>
  | undefined;

type PackageLike = {
  key?: string;
  label?: LocalizedValue;
  name?: LocalizedValue;
  title?: LocalizedValue;
};

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    subtitle: string;
    chooseLocationFirst: string;

    flightInfo: string;
    contactInfo: string;
    pickupInfo: string;

    locationLabel: string;
    packageLabel: string;
    flightTypeLabel: string;
    passengersLabel: string;
    flightDateLabel: string;
    timeSlotLabel: string;

    fullNameLabel: string;
    phoneLabel: string;
    emailLabel: string;
    specialRequestLabel: string;

    pickupRequired: string;
    fixedPickupPoint: string;
    viewMap: string;

    notSelected: string;
    paragliding: string;
    paramotor: string;

    note: string;

    fullNamePlaceholder: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    specialRequestPlaceholder: string;
    pickupPlaceholder: string;
    timeSlotPlaceholder: string;

    back: string;
    next: string;
    dateInPast: string;
  }
> = {
  vi: {
    title: "Thông tin liên hệ",
    subtitle:
      "Điền thông tin để đội ngũ xác nhận lịch bay và hỗ trợ đón / trả nếu có.",
    chooseLocationFirst:
      "Vui lòng chọn điểm bay trước khi nhập thông tin liên hệ.",

    flightInfo: "Thông tin chuyến bay",
    contactInfo: "Thông tin khách đặt",
    pickupInfo: "Thông tin đón / trả",

    locationLabel: "Điểm bay",
    packageLabel: "Gói bay",
    flightTypeLabel: "Loại bay",
    passengersLabel: "Số khách",
    flightDateLabel: "Ngày bay",
    timeSlotLabel: "Khung giờ",

    fullNameLabel: "Họ và tên (passport)",
    phoneLabel: "Số điện thoại liên hệ",
    emailLabel: "Email liên hệ",
    specialRequestLabel: "Yêu cầu đặc biệt",

    pickupRequired: "Vui lòng nhập địa chỉ đón cho dịch vụ đã chọn.",
    fixedPickupPoint: "Điểm đón cố định",
    viewMap: "Xem bản đồ",

    notSelected: "Chưa chọn",
    paragliding: "Bay dù không động cơ",
    paramotor: "Bay dù gắn động cơ",

    note: "Vui lòng nhập đúng số điện thoại và email để nhận xác nhận đặt bay.",

    fullNamePlaceholder: "Nhập họ và tên đầy đủ",
    phonePlaceholder: "Ví dụ: 0912345678",
    emailPlaceholder: "ten@gmail.com",
    specialRequestPlaceholder:
      "Ví dụ: yêu cầu hỗ trợ quay phim, cân nặng, dị ứng...",
    pickupPlaceholder: "Nhập địa chỉ / điểm đón",
    timeSlotPlaceholder: "Chọn khung giờ",

    back: "Quay lại",
    next: "Tiếp theo",
    dateInPast: "Ngày bay phải từ ngày mai trở đi.",
  },

  en: {
    title: "Contact information",
    subtitle:
      "Fill in your details so our team can confirm your flight schedule and pickup support if needed.",
    chooseLocationFirst:
      "Please choose a flight location before entering your contact details.",

    flightInfo: "Flight information",
    contactInfo: "Booker information",
    pickupInfo: "Pickup / drop-off information",

    locationLabel: "Location",
    packageLabel: "Package",
    flightTypeLabel: "Flight type",
    passengersLabel: "Passengers",
    flightDateLabel: "Flight date",
    timeSlotLabel: "Time slot",

    fullNameLabel: "Full name (passport)",
    phoneLabel: "Phone",
    emailLabel: "Email",
    specialRequestLabel: "Special requests",

    pickupRequired:
      "Please enter the pickup address for the selected service.",
    fixedPickupPoint: "Fixed pickup point",
    viewMap: "View map",

    notSelected: "Not selected",
    paragliding: "Paragliding",
    paramotor: "Paramotor",

    note:
      "Please enter the correct phone number and email to receive your booking confirmation.",

    fullNamePlaceholder: "Enter full name",
    phonePlaceholder: "Example: 0912345678",
    emailPlaceholder: "name@gmail.com",
    specialRequestPlaceholder:
      "Example: filming support, weight, allergies...",
    pickupPlaceholder: "Enter pickup address / point",
    timeSlotPlaceholder: "Choose time slot",

    back: "Back",
    next: "Next",
    dateInPast: "Flight date must be from tomorrow onward.",
  },

  fr: {
    title: "Informations de contact",
    subtitle:
      "Renseignez vos coordonnées afin que notre équipe puisse confirmer votre vol et organiser la prise en charge si nécessaire.",
    chooseLocationFirst:
      "Veuillez choisir un site de vol avant de saisir vos coordonnées.",

    flightInfo: "Informations du vol",
    contactInfo: "Informations du client",
    pickupInfo: "Informations de prise en charge / retour",

    locationLabel: "Lieu",
    packageLabel: "Forfait",
    flightTypeLabel: "Type de vol",
    passengersLabel: "Passagers",
    flightDateLabel: "Date du vol",
    timeSlotLabel: "Créneau horaire",

    fullNameLabel: "Nom complet (passeport)",
    phoneLabel: "Téléphone",
    emailLabel: "Email",
    specialRequestLabel: "Demandes spéciales",

    pickupRequired:
      "Veuillez saisir l’adresse de prise en charge pour le service sélectionné.",
    fixedPickupPoint: "Point de prise en charge fixe",
    viewMap: "Voir la carte",

    notSelected: "Non sélectionné",
    paragliding: "Parapente",
    paramotor: "Paramoteur",

    note:
      "Veuillez saisir un numéro de téléphone et un email corrects afin de recevoir la confirmation de réservation.",

    fullNamePlaceholder: "Saisissez le nom complet",
    phonePlaceholder: "Exemple : 0912345678",
    emailPlaceholder: "nom@gmail.com",
    specialRequestPlaceholder:
      "Exemple : aide au tournage, poids, allergies...",
    pickupPlaceholder: "Saisir l’adresse / point de prise en charge",
    timeSlotPlaceholder: "Choisir un créneau horaire",

    back: "Retour",
    next: "Suivant",
    dateInPast: "La date du vol doit être à partir de demain.",
  },

  ru: {
    title: "Контактная информация",
    subtitle:
      "Заполните данные, чтобы наша команда могла подтвердить ваш полёт и при необходимости организовать трансфер.",
    chooseLocationFirst:
      "Пожалуйста, сначала выберите место полёта, прежде чем вводить контактные данные.",

    flightInfo: "Информация о полёте",
    contactInfo: "Данные заказчика",
    pickupInfo: "Информация о трансфере",

    locationLabel: "Место",
    packageLabel: "Пакет",
    flightTypeLabel: "Тип полёта",
    passengersLabel: "Пассажиры",
    flightDateLabel: "Дата полёта",
    timeSlotLabel: "Временной слот",

    fullNameLabel: "Полное имя (паспорт)",
    phoneLabel: "Телефон",
    emailLabel: "Email",
    specialRequestLabel: "Особые пожелания",

    pickupRequired:
      "Пожалуйста, укажите адрес трансфера для выбранной услуги.",
    fixedPickupPoint: "Фиксированная точка посадки",
    viewMap: "Открыть карту",

    notSelected: "Не выбрано",
    paragliding: "Параплан",
    paramotor: "Парамотор",

    note:
      "Пожалуйста, укажите корректный номер телефона и email, чтобы получить подтверждение бронирования.",

    fullNamePlaceholder: "Введите полное имя",
    phonePlaceholder: "Например: 0912345678",
    emailPlaceholder: "name@gmail.com",
    specialRequestPlaceholder:
      "Например: помощь со съёмкой, вес, аллергии...",
    pickupPlaceholder: "Введите адрес / точку трансфера",
    timeSlotPlaceholder: "Выберите время",

    back: "Назад",
    next: "Далее",
    dateInPast: "Дата полёта должна быть не раньше завтрашнего дня.",
  },

  hi: {
    title: "संपर्क जानकारी",
    subtitle:
      "अपनी जानकारी भरें ताकि हमारी टीम आपकी फ्लाइट और पिकअप सहायता की पुष्टि कर सके।",
    chooseLocationFirst:
      "कृपया संपर्क जानकारी भरने से पहले फ्लाइट लोकेशन चुनें।",

    flightInfo: "फ्लाइट जानकारी",
    contactInfo: "बुकिंग ग्राहक की जानकारी",
    pickupInfo: "पिकअप / ड्रॉप जानकारी",

    locationLabel: "स्थान",
    packageLabel: "पैकेज",
    flightTypeLabel: "फ्लाइट प्रकार",
    passengersLabel: "यात्री",
    flightDateLabel: "फ्लाइट तिथि",
    timeSlotLabel: "समय स्लॉट",

    fullNameLabel: "पूरा नाम (पासपोर्ट)",
    phoneLabel: "फ़ोन",
    emailLabel: "ईमेल",
    specialRequestLabel: "विशेष अनुरोध",

    pickupRequired:
      "कृपया चुनी गई सेवा के लिए पिकअप पता दर्ज करें।",
    fixedPickupPoint: "फिक्स्ड पिकअप पॉइंट",
    viewMap: "मैप देखें",

    notSelected: "चयन नहीं किया गया",
    paragliding: "पैराग्लाइडिंग",
    paramotor: "पैरामोटर",

    note:
      "बुकिंग पुष्टि प्राप्त करने के लिए कृपया सही फोन नंबर और ईमेल दर्ज करें।",

    fullNamePlaceholder: "पूरा नाम दर्ज करें",
    phonePlaceholder: "उदाहरण: 0912345678",
    emailPlaceholder: "name@gmail.com",
    specialRequestPlaceholder:
      "उदाहरण: वीडियो सहायता, वजन, एलर्जी...",
    pickupPlaceholder: "पिकअप पता / बिंदु दर्ज करें",
    timeSlotPlaceholder: "समय स्लॉट चुनें",

    back: "वापस",
    next: "अगला",
    dateInPast: "फ्लाइट की तारीख कल या उसके बाद की होनी चाहिए।",
  },

  zh: {
    title: "联系信息",
    subtitle: "请填写您的信息，方便团队确认飞行时间及接送安排。",
    chooseLocationFirst: "请输入联系信息前，请先选择飞行地点。",

    flightInfo: "飞行信息",
    contactInfo: "预订人信息",
    pickupInfo: "接送信息",

    locationLabel: "地点",
    packageLabel: "套餐",
    flightTypeLabel: "飞行类型",
    passengersLabel: "乘客人数",
    flightDateLabel: "飞行日期",
    timeSlotLabel: "时间段",

    fullNameLabel: "姓名（护照）",
    phoneLabel: "电话",
    emailLabel: "邮箱",
    specialRequestLabel: "特殊要求",

    pickupRequired: "请选择接送服务后填写接送地址。",
    fixedPickupPoint: "固定接送点",
    viewMap: "查看地图",

    notSelected: "未选择",
    paragliding: "无动力滑翔伞",
    paramotor: "动力伞",

    note: "请填写正确的电话号码和邮箱，以便接收预订确认信息。",

    fullNamePlaceholder: "请输入完整姓名",
    phonePlaceholder: "例如：0912345678",
    emailPlaceholder: "name@gmail.com",
    specialRequestPlaceholder: "例如：拍摄协助、体重、过敏等...",
    pickupPlaceholder: "请输入接送地址 / 地点",
    timeSlotPlaceholder: "选择时间段",

    back: "返回",
    next: "下一步",
    dateInPast: "飞行日期必须从明天开始选择。",
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
        <option
          key={s}
          value={s}
          style={{ backgroundColor: "#5b5447", color: "#ffffff" }}
        >
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

function getLocalizedText(value: unknown, lang: LangUI, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, string | undefined>;
    return obj[lang] || obj.en || obj.vi || fallback;
  }
  return fallback;
}

function extractPackages(rawPackages: unknown): PackageLike[] {
  if (Array.isArray(rawPackages)) {
    return rawPackages as PackageLike[];
  }

  if (rawPackages && typeof rawPackages === "object") {
    return Object.values(rawPackages as Record<string, unknown>) as PackageLike[];
  }

  return [];
}

export default function ContactInfoStep() {
  const lang = (useLangCode() || "vi") as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);
  const setContact = useBookingStore((s) => s.setContact);
  const setServiceInput = useBookingStore((s) => s.setServiceInput);

  const cfg = data.location
    ? LOCATIONS[data.location as LocationKey]
    : undefined;

  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const [dateError, setDateError] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const selectedServices = useMemo(() => {
    if (!cfg?.services?.length) return [];

    return cfg.services.filter((svc) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return false;
        if (!svc.visibleForPackages.includes(data.packageKey as any)) {
          return false;
        }
      }

      return !!data.services?.[svc.key]?.selected;
    });
  }, [cfg, data.packageKey, data.services]);

  const pickupServices = useMemo(() => {
    return selectedServices.filter(
      (svc) => svc.requiresPickupInput || svc.fixedMapUrl,
    );
  }, [selectedServices]);

  const packageLabel = useMemo(() => {
    if (!cfg?.packages || !data.packageKey) return ui.notSelected;

    const packages = extractPackages(cfg.packages);
    const found = packages.find((p) => p.key === data.packageKey);

    if (!found) return ui.notSelected;

    return getLocalizedText(
      found.label || found.name || found.title,
      lang,
      ui.notSelected,
    );
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
      className="space-y-5 text-white"
      onSubmit={(e) => {
        e.preventDefault();
        const pickupValid = validatePickupServices();
        if (!dateError && pickupValid) next();
      }}
    >
      <div className="overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent px-4 py-4 md:px-6">
          <h3 className="text-lg font-semibold md:text-xl">{ui.title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-white/80">{ui.subtitle}</p>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          {!cfg ? (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-white">
              {ui.chooseLocationFirst}
            </div>
          ) : null}

          {cfg ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1.4fr]">
              <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/90">
                  {ui.flightInfo}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoBox
                    label={ui.locationLabel}
                    value={getLocalizedText(cfg.name, lang, ui.notSelected)}
                  />
                  <InfoBox label={ui.packageLabel} value={packageLabel} />
                  <InfoBox
                    label={ui.flightTypeLabel}
                    value={
                      cfg.key === "khau_pha"
                        ? getFlightTypeLabel(lang, data.flightTypeKey)
                        : getFlightTypeLabel(lang, "paragliding")
                    }
                  />
                  <InfoBox
                    label={ui.passengersLabel}
                    value={String(data.guestsCount || 1)}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/90">
                      {ui.flightDateLabel}
                    </label>
                    <input
                      type="date"
                      value={data.dateISO || ""}
                      min={tomorrowISO}
                      onChange={(e) => {
                        const val = e.target.value;
                        update({ dateISO: val });
                        setDateError(
                          val && val < tomorrowISO ? ui.dateInPast : null,
                        );
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none focus:border-sky-300"
                      required
                    />
                    {dateError ? (
                      <p className="mt-2 text-xs text-red-300">{dateError}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90">
                      {ui.timeSlotLabel}
                    </label>

                    <div className="relative mt-2">
                      <select
                        value={data.timeSlot || ""}
                        onChange={(e) => update({ timeSlot: e.target.value })}
                        className="h-12 w-full appearance-none rounded-2xl border border-sky-300/70 bg-[#5b5447] px-4 pr-10 text-white outline-none focus:border-sky-300"
                        required
                      >
                        <option
                          value=""
                          disabled
                          style={{
                            backgroundColor: "#5b5447",
                            color: "#d1d5db",
                          }}
                        >
                          {ui.timeSlotPlaceholder}
                        </option>
                        <TimeOptions />
                      </select>

                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/80">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/90">
                  {ui.contactInfo}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field
                    label={ui.fullNameLabel}
                    required
                    value={
                      data.contact?.fullName ||
                      data.contact?.contactName ||
                      ""
                    }
                    onChange={(value) =>
                      setContact({ fullName: value, contactName: value })
                    }
                    placeholder={ui.fullNamePlaceholder}
                  />

                  <Field
                    label={ui.phoneLabel}
                    required
                    type="tel"
                    value={data.contact?.phone || ""}
                    onChange={(value) => setContact({ phone: value })}
                    placeholder={ui.phonePlaceholder}
                  />

                  <Field
                    label={ui.emailLabel}
                    required
                    type="email"
                    value={data.contact?.email || ""}
                    onChange={(value) => setContact({ email: value })}
                    placeholder={ui.emailPlaceholder}
                  />

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/90">
                      {ui.specialRequestLabel}
                    </label>
                    <textarea
                      rows={4}
                      placeholder={ui.specialRequestPlaceholder}
                      value={data.contact?.specialRequest || ""}
                      onChange={(e) =>
                        setContact({ specialRequest: e.target.value })
                      }
                      className="mt-2 w-full resize-none rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-white outline-none placeholder:text-white/45 focus:border-sky-300"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/75">
                  {ui.note}
                </div>
              </section>
            </div>
          ) : null}

          {pickupServices.length > 0 ? (
            <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/90">
                {ui.pickupInfo}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {pickupServices.map((svc) => {
                  const label = getLocalizedText(
                    svc.label,
                    lang,
                    String(svc.key),
                  );

                  if (svc.fixedMapUrl) {
                    return (
                      <div
                        key={svc.key}
                        className="rounded-2xl border border-white/15 bg-white/8 p-4"
                      >
                        <div className="text-sm font-semibold text-white">
                          {label}
                        </div>
                        <div className="mt-2 text-sm text-white/75">
                          {ui.fixedPickupPoint}
                        </div>
                        <a
                          href={svc.fixedMapUrl || BIGC_THANG_LONG_MAP}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex h-10 items-center rounded-full border border-sky-300/40 bg-sky-400/10 px-4 text-sm font-medium text-sky-200 hover:bg-sky-400/20"
                        >
                          {ui.viewMap}
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={svc.key}
                      className="rounded-2xl border border-white/15 bg-white/8 p-4"
                    >
                      <label className="block text-sm font-medium text-white/90">
                        {label}
                      </label>
                      <input
                        type="text"
                        placeholder={ui.pickupPlaceholder}
                        value={data.services?.[svc.key]?.inputText || ""}
                        onChange={(e) => {
                          setServiceInput(svc.key, e.target.value);

                          if (data.contact?.pickupLocation !== e.target.value) {
                            setContact({ pickupLocation: e.target.value });
                          }

                          if (pickupError) setPickupError(null);
                        }}
                        className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none placeholder:text-white/45 focus:border-sky-300"
                        required
                      />
                    </div>
                  );
                })}
              </div>

              {pickupError ? (
                <p className="mt-3 text-xs text-red-300">{pickupError}</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="h-12 rounded-full border border-white/25 bg-black/25 px-5 text-sm font-medium text-white hover:bg-black/35"
        >
          {ui.back}
        </button>

        <button
          type="submit"
          disabled={!cfg || Boolean(dateError)}
          className="h-12 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition hover:brightness-105 disabled:opacity-60"
        >
          {ui.next}
        </button>
      </div>
    </form>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/90">
        {label}
        {required ? <span className="ml-1 text-red-300">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none placeholder:text-white/45 focus:border-sky-300"
      />
    </div>
  );
}