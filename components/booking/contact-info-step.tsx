"use client";

import React, { useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { useLangCode } from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const COUNTRY_CODES = [
  { value: "+84", label: "🇻🇳 +84" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+7", label: "🇷🇺 +7" },
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+86", label: "🇨🇳 +86" },
  { value: "+81", label: "🇯🇵 +81" },
  { value: "+82", label: "🇰🇷 +82" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+66", label: "🇹🇭 +66" },
  { value: "+61", label: "🇦🇺 +61" },
];

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    subtitle: string;
    chooseLocationFirst: string;

    flightDateLabel: string;
    timeSlotLabel: string;
    fullNameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    specialRequestLabel: string;
    importantNoticeTitle: string;

    fullNamePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    specialRequestPlaceholder: string;
    timeSlotPlaceholder: string;

    importantNoticeItems: string[];

    back: string;
    next: string;
    dateInPast: string;
  }
> = {
  vi: {
    title: "Lịch bay",
    subtitle: "Nhập thông tin liên hệ",
    chooseLocationFirst:
      "Vui lòng chọn điểm bay ở bước trước trước khi tiếp tục.",

    flightDateLabel: "Ngày bay",
    timeSlotLabel: "Giờ bay",
    fullNameLabel: "Họ và Tên",
    emailLabel: "Email",
    phoneLabel: "Số Điện Thoại / WhatsApp / Zalo",
    specialRequestLabel: "Yêu Cầu Đặc Biệt",
    importantNoticeTitle: "Lưu Ý Quan Trọng",

    fullNamePlaceholder: "Họ và Tên",
    emailPlaceholder: "Email",
    phonePlaceholder: "123 456 789",
    specialRequestPlaceholder:
      "Ví dụ: yêu cầu hỗ trợ quay phim, cân nặng, dị ứng...",
    timeSlotPlaceholder: "Chọn giờ",

    importantNoticeItems: [
      "Sau khi đặt chỗ, chúng tôi sẽ liên hệ để sắp xếp lịch bay, bao gồm thời gian bay, điểm đón và giờ đón.",
      "Thời gian đón khách trước giờ bay khoảng 30 phút.",
      "Vào ngày bay, chúng tôi sẽ gửi tên tài xế, số điện thoại và biển số xe/xe máy qua SMS, WhatsApp hoặc Email.",
    ],

    back: "Quay lại",
    next: "Tiếp theo",
    dateInPast: "Ngày bay phải từ hôm nay trở đi.",
  },

  en: {
    title: "Flight schedule",
    subtitle: "Enter contact information",
    chooseLocationFirst:
      "Please select a flight location in the previous step before continuing.",

    flightDateLabel: "Flight date",
    timeSlotLabel: "Flight time",
    fullNameLabel: "Full name",
    emailLabel: "Email",
    phoneLabel: "Phone / WhatsApp / Zalo",
    specialRequestLabel: "Special requests",
    importantNoticeTitle: "Important notice",

    fullNamePlaceholder: "Full name",
    emailPlaceholder: "Email",
    phonePlaceholder: "123 456 789",
    specialRequestPlaceholder:
      "Example: filming support, weight, allergies...",
    timeSlotPlaceholder: "Select time",

    importantNoticeItems: [
      "After booking, we will contact you to arrange the flight schedule, including flight time, pickup point, and pickup time.",
      "Pickup time is around 30 minutes before flight time.",
      "On the flight day, we will send the driver's name, phone number, and vehicle plate number via SMS, WhatsApp, or Email.",
    ],

    back: "Back",
    next: "Next",
    dateInPast: "Flight date must be from today onward.",
  },

  fr: {
    title: "Horaire du vol",
    subtitle: "Saisir les coordonnées",
    chooseLocationFirst:
      "Veuillez choisir le site de vol à l’étape précédente avant de continuer.",

    flightDateLabel: "Date du vol",
    timeSlotLabel: "Heure du vol",
    fullNameLabel: "Nom complet",
    emailLabel: "Email",
    phoneLabel: "Téléphone / WhatsApp / Zalo",
    specialRequestLabel: "Demandes spéciales",
    importantNoticeTitle: "Remarque importante",

    fullNamePlaceholder: "Nom complet",
    emailPlaceholder: "Email",
    phonePlaceholder: "123 456 789",
    specialRequestPlaceholder:
      "Exemple : aide au tournage, poids, allergies...",
    timeSlotPlaceholder: "Choisir l’heure",

    importantNoticeItems: [
      "Après la réservation, nous vous contacterons pour organiser l’horaire du vol, y compris l’heure du vol, le point de prise en charge et l’heure de prise en charge.",
      "L’heure de prise en charge est d’environ 30 minutes avant l’heure du vol.",
      "Le jour du vol, nous enverrons le nom du chauffeur, son numéro de téléphone et la plaque du véhicule par SMS, WhatsApp ou Email.",
    ],

    back: "Retour",
    next: "Suivant",
    dateInPast: "La date du vol doit être à partir d'aujourd'hui.",
  },

  ru: {
    title: "Время полёта",
    subtitle: "Введите контактные данные",
    chooseLocationFirst:
      "Пожалуйста, выберите место полёта на предыдущем шаге перед продолжением.",

    flightDateLabel: "Дата полёта",
    timeSlotLabel: "Время полёта",
    fullNameLabel: "Полное имя",
    emailLabel: "Email",
    phoneLabel: "Телефон / WhatsApp / Zalo",
    specialRequestLabel: "Особые пожелания",
    importantNoticeTitle: "Важное примечание",

    fullNamePlaceholder: "Полное имя",
    emailPlaceholder: "Email",
    phonePlaceholder: "123 456 789",
    specialRequestPlaceholder:
      "Например: помощь со съёмкой, вес, аллергии...",
    timeSlotPlaceholder: "Выберите время",

    importantNoticeItems: [
      "После бронирования мы свяжемся с вами, чтобы согласовать расписание полёта, включая время полёта, точку встречи и время трансфера.",
      "Трансфер обычно осуществляется примерно за 30 минут до полёта.",
      "В день полёта мы отправим имя водителя, номер телефона и номер транспортного средства по SMS, WhatsApp или Email.",
    ],

    back: "Назад",
    next: "Далее",
    dateInPast: "Дата полёта должна быть не раньше сегодняшнего дня.",
  },

  hi: {
    title: "फ्लाइट शेड्यूल",
    subtitle: "संपर्क जानकारी भरें",
    chooseLocationFirst:
      "कृपया आगे बढ़ने से पहले पिछले चरण में फ्लाइट लोकेशन चुनें।",

    flightDateLabel: "फ्लाइट तिथि",
    timeSlotLabel: "फ्लाइट समय",
    fullNameLabel: "पूरा नाम",
    emailLabel: "ईमेल",
    phoneLabel: "फ़ोन / WhatsApp / Zalo",
    specialRequestLabel: "विशेष अनुरोध",
    importantNoticeTitle: "महत्वपूर्ण सूचना",

    fullNamePlaceholder: "पूरा नाम",
    emailPlaceholder: "ईमेल",
    phonePlaceholder: "123 456 789",
    specialRequestPlaceholder:
      "उदाहरण: वीडियो सहायता, वजन, एलर्जी...",
    timeSlotPlaceholder: "समय चुनें",

    importantNoticeItems: [
      "बुकिंग के बाद, हम आपसे संपर्क करेंगे और फ्लाइट समय, पिकअप पॉइंट और पिकअप समय सहित शेड्यूल तय करेंगे।",
      "पिकअप समय फ्लाइट समय से लगभग 30 मिनट पहले होगा।",
      "फ्लाइट वाले दिन, हम ड्राइवर का नाम, फोन नंबर और वाहन नंबर SMS, WhatsApp या Email से भेजेंगे।",
    ],

    back: "वापस",
    next: "अगला",
    dateInPast: "फ्लाइट की तारीख आज या उसके बाद की होनी चाहिए।",
  },

  zh: {
    title: "飞行时间",
    subtitle: "填写联系信息",
    chooseLocationFirst: "请先在上一步选择飞行地点后再继续。",

    flightDateLabel: "飞行日期",
    timeSlotLabel: "飞行时间",
    fullNameLabel: "姓名",
    emailLabel: "邮箱",
    phoneLabel: "电话 / WhatsApp / Zalo",
    specialRequestLabel: "特殊要求",
    importantNoticeTitle: "重要提示",

    fullNamePlaceholder: "姓名",
    emailPlaceholder: "邮箱",
    phonePlaceholder: "123 456 789",
    specialRequestPlaceholder: "例如：拍摄协助、体重、过敏等...",
    timeSlotPlaceholder: "选择时间",

    importantNoticeItems: [
      "预订后，我们会联系您安排飞行行程，包括飞行时间、接送点和接送时间。",
      "接客时间通常在飞行前约 30 分钟。",
      "飞行当天，我们会通过短信、WhatsApp 或邮箱发送司机姓名、电话号码和车牌号。",
    ],

    back: "返回",
    next: "下一步",
    dateInPast: "飞行日期必须从今天开始选择。",
  },
};

function TimeOptions() {
  const slots: string[] = [];

  for (let h = 7; h <= 18; h++) {
    const hh = String(h).padStart(2, "0");
    slots.push(`${hh}:00`);
  }

  return (
    <>
      {slots.map((slot) => (
        <option key={slot} value={slot}>
          {slot}
        </option>
      ))}
    </>
  );
}

function splitPhone(phone: string | undefined) {
  const raw = (phone || "").trim();

  if (!raw) {
    return {
      countryCode: "+84",
      phoneNumber: "",
    };
  }

  const matchedCode = COUNTRY_CODES.find((item) => raw.startsWith(item.value));

  if (!matchedCode) {
    return {
      countryCode: "+84",
      phoneNumber: raw,
    };
  }

  const phoneNumber = raw.slice(matchedCode.value.length).trim();

  return {
    countryCode: matchedCode.value,
    phoneNumber,
  };
}

export default function ContactInfoStep() {
  const lang = (useLangCode() || "vi") as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);
  const setContact = useBookingStore((s) => s.setContact);

  const hasLocation = Boolean(data.location);
  const [dateError, setDateError] = useState<string | null>(null);

  const todayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const parsedPhone = useMemo(
    () => splitPhone(data.contact?.phone || ""),
    [data.contact?.phone],
  );

  const countryCode = parsedPhone.countryCode;
  const phoneNumber = parsedPhone.phoneNumber;

  const updatePhone = (nextCountryCode: string, nextPhoneNumber: string) => {
    const cleanedNumber = nextPhoneNumber.replace(/\s+/g, " ").trim();
    const fullPhone = cleanedNumber
      ? `${nextCountryCode} ${cleanedNumber}`
      : nextCountryCode;

    setContact({ phone: fullPhone });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();

        if (!hasLocation) return;
        if (dateError) return;

        next();
      }}
    >
      <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-sm">
        <div className="border-b border-[#DCE7F3] bg-[#0194F3] px-4 py-4 md:px-6">
          <h3 className="text-lg font-bold text-white md:text-xl">
            {ui.title}
          </h3>
          <p className="mt-1 text-sm text-white/90">
            {ui.subtitle}
          </p>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          {!hasLocation ? (
            <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {ui.chooseLocationFirst}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div>
              <Label text={ui.flightDateLabel} required />
              <input
                type="date"
                value={data.dateISO || ""}
                min={todayISO}
                onChange={(e) => {
                  const value = e.target.value;
                  update({ dateISO: value });
                  setDateError(
                    value && value < todayISO ? ui.dateInPast : null,
                  );
                }}
                required
                className="mt-2 h-12 w-full rounded-lg border border-[#DCE7F3] bg-white px-4 text-[#1C2930] outline-none transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
              />
              {dateError ? (
                <p className="mt-2 text-sm text-[#DC2626]">{dateError}</p>
              ) : null}
            </div>

            <div>
              <Label text={ui.timeSlotLabel} required />
              <div className="relative mt-2">
                <select
                  value={data.timeSlot || ""}
                  onChange={(e) => update({ timeSlot: e.target.value })}
                  required
                  className="h-12 w-full appearance-none rounded-lg border border-[#DCE7F3] bg-white px-4 pr-10 text-[#1C2930] outline-none transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
                >
                  <option value="" disabled>
                    {ui.timeSlotPlaceholder}
                  </option>
                  <TimeOptions />
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#5B6B7A]">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            <TextField
              label={ui.fullNameLabel}
              required
              value={data.contact?.fullName || data.contact?.contactName || ""}
              onChange={(value) =>
                setContact({
                  fullName: value,
                  contactName: value,
                })
              }
              placeholder={ui.fullNamePlaceholder}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TextField
              label={ui.emailLabel}
              required
              type="email"
              value={data.contact?.email || ""}
              onChange={(value) => setContact({ email: value })}
              placeholder={ui.emailPlaceholder}
            />

            <div>
              <Label text={ui.phoneLabel} required />
              <div className="mt-2 grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => updatePhone(e.target.value, phoneNumber)}
                    className="h-12 w-full appearance-none rounded-lg border border-[#DCE7F3] bg-white px-3 pr-8 text-[#1C2930] outline-none transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
                  >
                    {COUNTRY_CODES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#5B6B7A]">
                    <ChevronDownIcon />
                  </div>
                </div>

                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => updatePhone(countryCode, e.target.value)}
                  placeholder={ui.phonePlaceholder}
                  required
                  className="h-12 w-full rounded-lg border border-[#DCE7F3] bg-white px-4 text-[#1C2930] outline-none placeholder:text-[#94A3B8] transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <Label text={ui.specialRequestLabel} />
              <textarea
                rows={5}
                value={data.contact?.specialRequest || ""}
                onChange={(e) =>
                  setContact({ specialRequest: e.target.value })
                }
                placeholder={ui.specialRequestPlaceholder}
                className="mt-2 w-full resize-none rounded-lg border border-[#DCE7F3] bg-white px-4 py-3 text-[#1C2930] outline-none placeholder:text-[#94A3B8] transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
              />
            </div>

            <div className="rounded-lg border border-[#F2D27A] bg-[#FFF8E8] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#9A6700]">
                <WarningIcon />
                <span>{ui.importantNoticeTitle}</span>
              </div>

              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#7A5B12]">
                {ui.importantNoticeItems.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1 text-[#C69300]">
                      <CheckIcon />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="h-12 rounded-xl border border-[#DCE7F3] bg-white px-5 text-sm font-medium text-[#5B6B7A] transition hover:border-[#B9DDFB] hover:bg-[#F5F7FA]"
        >
          {ui.back}
        </button>

        <button
          type="submit"
          disabled={!hasLocation || Boolean(dateError)}
          className="h-12 rounded-xl bg-[#0194F3] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#0B83D9] disabled:bg-[#B9DDFB] disabled:shadow-none"
        >
          {ui.next}
        </button>
      </div>
    </form>
  );
}

function Label({
  text,
  required,
}: {
  text: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-[#1C2930]">
      {text}
      {required ? <span className="ml-1 text-[#DC2626]">*</span> : null}
    </label>
  );
}

function TextField({
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
      <Label text={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-12 w-full rounded-lg border border-[#DCE7F3] bg-white px-4 text-[#1C2930] outline-none placeholder:text-[#94A3B8] transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
      />
    </div>
  );
}

function ChevronDownIcon() {
  return (
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
  );
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 3.75a1.5 1.5 0 0 1 1.299.75l7.5 13a1.5 1.5 0 0 1-1.299 2.25H4.5a1.5 1.5 0 0 1-1.299-2.25l7.5-13A1.5 1.5 0 0 1 12 3.75Zm0 4.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0V9a.75.75 0 0 0-.75-.75Zm0 8.25a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}