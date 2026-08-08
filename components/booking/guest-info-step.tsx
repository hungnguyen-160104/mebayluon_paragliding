"use client";

import React, { useMemo } from "react";
import { useBookingStore } from "@/store/booking-store";
import { useLangCode } from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";
type GenderValue = "Nam" | "Nữ" | "Khác";
type GenderOptionValue = "" | GenderValue;

const GENDER_OPTIONS: Record<
  LangUI,
  Array<{ value: GenderValue; label: string }>
> = {
  vi: [
    { value: "Nam", label: "Nam" },
    { value: "Nữ", label: "Nữ" },
    { value: "Khác", label: "Khác" },
  ],
  en: [
    { value: "Nam", label: "Male" },
    { value: "Nữ", label: "Female" },
    { value: "Khác", label: "Other" },
  ],
  fr: [
    { value: "Nam", label: "Homme" },
    { value: "Nữ", label: "Femme" },
    { value: "Khác", label: "Autre" },
  ],
  ru: [
    { value: "Nam", label: "Мужской" },
    { value: "Nữ", label: "Женский" },
    { value: "Khác", label: "Другое" },
  ],
  hi: [
    { value: "Nam", label: "पुरुष" },
    { value: "Nữ", label: "महिला" },
    { value: "Khác", label: "अन्य" },
  ],
  zh: [
    { value: "Nam", label: "男" },
    { value: "Nữ", label: "女" },
    { value: "Khác", label: "其他" },
  ],
};

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    subtitle: string;
    passengerPrefix: string;
    warning: string;

    fullNameLabel: string;
    dobLabel: string;
    genderLabel: string;
    nationalityLabel: string;
    idNumberLabel: string;
    weightLabel: string;

    fullNamePlaceholder: string;
    dobPlaceholder: string;
    genderPlaceholder: string;
    nationalityPlaceholder: string;
    idNumberPlaceholder: string;
    weightPlaceholder: string;

    fillBookerInfo: string;
    back: string;
    next: string;
    dobInvalid: string;
  }
> = {
  vi: {
    title: "THÔNG TIN KHÁCH BAY",
    subtitle: "Thông tin khách bay",
    passengerPrefix: "Khách bay",
    warning:
      "Thông tin này được dùng để kích hoạt Bảo hiểm, vui lòng điền đúng mọi thông tin. Chúng tôi cam kết mọi thông tin khách hàng đều được bảo mật.",

    fullNameLabel: "Họ và Tên",
    dobLabel: "Ngày Sinh",
    genderLabel: "Giới Tính",
    nationalityLabel: "Quốc Tịch",
    idNumberLabel: "Passport/CCCD",
    weightLabel: "Cân Nặng (kg)",

    fullNamePlaceholder: "Họ và Tên",
    dobPlaceholder: "dd/mm/yyyy",
    genderPlaceholder: "Chọn giới tính",
    nationalityPlaceholder: "Vietnam",
    idNumberPlaceholder: "Nhập số Passport hoặc CCCD",
    weightPlaceholder: "0",

    fillBookerInfo: "Điền thông tin người bay",
    back: "Quay lại",
    next: "Tiếp theo",
    dobInvalid: "Ngày sinh không hợp lệ.",
  },

  en: {
    title: "Passenger Information",
    subtitle: "Passenger information",
    passengerPrefix: "Passenger",
    warning:
      "This information is used to activate your insurance — please make sure every detail is correct. We are committed to keeping all customer information strictly confidential.",

    fullNameLabel: "Full Name",
    dobLabel: "Date of Birth",
    genderLabel: "Gender",
    nationalityLabel: "Nationality",
    idNumberLabel: "Passport/ID",
    weightLabel: "Weight (kg)",

    fullNamePlaceholder: "Full Name",
    dobPlaceholder: "dd/mm/yyyy",
    genderPlaceholder: "Select gender",
    nationalityPlaceholder: "Vietnam",
    idNumberPlaceholder: "Enter Passport or ID number",
    weightPlaceholder: "0",

    fillBookerInfo: "Fill in flyer information",
    back: "Back",
    next: "Next",
    dobInvalid: "Invalid date of birth.",
  },

  fr: {
    title: "Informations passager",
    subtitle: "Informations passager",
    passengerPrefix: "Passager",
    warning:
      "Ces informations servent à activer votre assurance — merci de vérifier que chaque détail est exact. Nous nous engageons à garder toutes les informations de nos clients strictement confidentielles.",

    fullNameLabel: "Nom complet",
    dobLabel: "Date de naissance",
    genderLabel: "Sexe",
    nationalityLabel: "Nationalité",
    idNumberLabel: "Passeport/CIN",
    weightLabel: "Poids (kg)",

    fullNamePlaceholder: "Nom complet",
    dobPlaceholder: "jj/mm/aaaa",
    genderPlaceholder: "Choisir le sexe",
    nationalityPlaceholder: "Vietnam",
    idNumberPlaceholder: "Saisir le numéro du passeport ou de la CIN",
    weightPlaceholder: "0",

    fillBookerInfo: "Remplir avec les informations du passager",
    back: "Retour",
    next: "Suivant",
    dobInvalid: "Date de naissance invalide.",
  },

  ru: {
    title: "Информация о пассажире",
    subtitle: "Информация о пассажире",
    passengerPrefix: "Пассажир",
    warning:
      "Эти данные используются для оформления страховки — пожалуйста, заполните всё точно. Мы гарантируем полную конфиденциальность данных наших клиентов.",

    fullNameLabel: "Полное имя",
    dobLabel: "Дата рождения",
    genderLabel: "Пол",
    nationalityLabel: "Гражданство",
    idNumberLabel: "Паспорт/ID",
    weightLabel: "Вес (кг)",

    fullNamePlaceholder: "Полное имя",
    dobPlaceholder: "дд/мм/гггг",
    genderPlaceholder: "Выберите пол",
    nationalityPlaceholder: "Vietnam",
    idNumberPlaceholder: "Введите номер паспорта или ID",
    weightPlaceholder: "0",

    fillBookerInfo: "Заполнить данные пассажира",
    back: "Назад",
    next: "Далее",
    dobInvalid: "Неверная дата рождения.",
  },

  hi: {
    title: "यात्री जानकारी",
    subtitle: "यात्री जानकारी",
    passengerPrefix: "यात्री",
    warning:
      "यह जानकारी बीमा सक्रिय करने के लिए उपयोग होती है — कृपया सभी विवरण सही भरें। हम ग्राहकों की सभी जानकारी को पूर्ण गोपनीय रखने के लिए प्रतिबद्ध हैं।",

    fullNameLabel: "पूरा नाम",
    dobLabel: "जन्म तिथि",
    genderLabel: "लिंग",
    nationalityLabel: "राष्ट्रीयता",
    idNumberLabel: "पासपोर्ट/आईडी",
    weightLabel: "वज़न (kg)",

    fullNamePlaceholder: "पूरा नाम",
    dobPlaceholder: "dd/mm/yyyy",
    genderPlaceholder: "लिंग चुनें",
    nationalityPlaceholder: "Vietnam",
    idNumberPlaceholder: "पासपोर्ट या आईडी नंबर दर्ज करें",
    weightPlaceholder: "0",

    fillBookerInfo: "यात्री की जानकारी भरें",
    back: "वापस",
    next: "अगला",
    dobInvalid: "जन्म तिथि अमान्य है।",
  },

  zh: {
    title: "乘客信息",
    subtitle: "乘客信息",
    passengerPrefix: "乘客",
    warning:
      "此信息用于激活保险，请确保填写的每项信息准确无误。我们承诺对所有客户信息严格保密。",

    fullNameLabel: "姓名",
    dobLabel: "出生日期",
    genderLabel: "性别",
    nationalityLabel: "国籍",
    idNumberLabel: "护照/身份证",
    weightLabel: "体重 (kg)",

    fullNamePlaceholder: "姓名",
    dobPlaceholder: "dd/mm/yyyy",
    genderPlaceholder: "选择性别",
    nationalityPlaceholder: "Vietnam",
    idNumberPlaceholder: "输入护照或身份证号码",
    weightPlaceholder: "0",

    fillBookerInfo: "填写飞行者信息",
    back: "返回",
    next: "下一步",
    dobInvalid: "出生日期无效。",
  },
};

export default function GuestInfoStep() {
  const lang = (useLangCode() || "vi") as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;
  const genderOptions = GENDER_OPTIONS[lang] ?? GENDER_OPTIONS.vi;

  const data = useBookingStore((s) => s.data);
  const setGuest = useBookingStore((s) => s.setGuest);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayISO = useMemo(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [today]);

  const currentYear = today.getFullYear();

  function validateGuest(g: any) {
    const fullNameOk = Boolean(g.fullName?.trim());
    const nationalityOk = Boolean(g.nationality?.trim());
    const idOk = Boolean(g.idNumber?.trim());
    const genderOk = Boolean(g.gender?.trim());
    const weightOk =
      g.weightKg !== undefined &&
      g.weightKg !== null &&
      !Number.isNaN(Number(g.weightKg)) &&
      Number(g.weightKg) > 0;

    let dobOk = false;

    if (g.dob) {
      const d = new Date(g.dob);
      d.setHours(0, 0, 0, 0);

      if (!Number.isNaN(d.getTime()) && d <= today && d.getFullYear() < currentYear) {
        dobOk = true;
      }
    }

    return {
      ok: fullNameOk && nationalityOk && idOk && genderOk && weightOk && dobOk,
    };
  }

  const allValid = Array.from({ length: data.guestsCount }).every((_, idx) =>
    validateGuest(data.guests[idx] || {}).ok,
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (allValid) next();
      }}
    >
      <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-[#F5F7FA] shadow-sm">
        <div className="border-b border-[#DCE7F3] bg-white px-3 py-2.5 md:px-3">
          <h3 className="text-lg font-bold text-[#1C2930] md:text-xl">{ui.title}</h3>
        </div>

        <div className="space-y-3 p-3 md:p-3">
          <div className="rounded-lg border border-[#F2D27A] bg-[#FFF8E8] px-3 py-2.5 text-sm text-[#9A6700]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">
                <WarningIcon />
              </span>
              <span className="font-bold">{ui.warning}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: data.guestsCount }).map((_, idx) => {
              const g = data.guests[idx] || {};

              return (
                <section
                  key={idx}
                  className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#DCE7F3] bg-[#F8FAFC] px-3 py-2.5 md:px-3">
                    <div className="text-lg font-bold text-[#1C2930]">
                      {ui.passengerPrefix} #{idx + 1}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setGuest(idx, {
                          fullName:
                            data.contact?.fullName ||
                            data.contact?.contactName ||
                            g.fullName ||
                            "",
                        })
                      }
                      className="rounded-lg bg-[#0194F3] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0B83D9]"
                    >
                      {ui.fillBookerInfo}
                    </button>
                  </div>

                  <div className="p-3 md:p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <TextField
                        label={ui.fullNameLabel}
                        required
                        value={g.fullName || ""}
                        onChange={(value) => setGuest(idx, { fullName: value })}
                        placeholder={ui.fullNamePlaceholder}
                        className="md:col-span-2"
                      />

                      <DateField
                        label={ui.dobLabel}
                        required
                        value={g.dob || ""}
                        max={todayISO}
                        onChange={(value) => setGuest(idx, { dob: value })}
                        placeholder={ui.dobPlaceholder}
                      />

                      <SelectField
                        label={ui.genderLabel}
                        required
                        value={(g.gender as GenderOptionValue) || ""}
                        onChange={(value) =>
                          setGuest(idx, { gender: value as GenderValue })
                        }
                        placeholder={ui.genderPlaceholder}
                        options={genderOptions}
                      />

                      <TextField
                        label={ui.nationalityLabel}
                        required
                        value={g.nationality || ""}
                        onChange={(value) => setGuest(idx, { nationality: value })}
                        placeholder={ui.nationalityPlaceholder}
                      />

                      <TextField
                        label={ui.idNumberLabel}
                        required
                        value={g.idNumber || ""}
                        onChange={(value) => setGuest(idx, { idNumber: value })}
                        placeholder={ui.idNumberPlaceholder}
                      />

                      <TextField
                        label={ui.weightLabel}
                        required
                        inputMode="decimal"
                        value={g.weightKg ?? ""}
                        onChange={(value) => {
                          if (value === "" || /^[0-9]*\.?[0-9]*$/.test(String(value))) {
                            const parsed = parseFloat(String(value));
                            setGuest(idx, {
                              weightKg: Number.isNaN(parsed) ? undefined : parsed,
                            });
                          }
                        }}
                        placeholder={ui.weightPlaceholder}
                      />
                    </div>

                    {g.dob && !validateGuest(g).ok && new Date(g.dob).getFullYear() >= currentYear ? (
                      <p className="mt-3 text-xs text-[#DC2626]">{ui.dobInvalid}</p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trước đây justify-between đẩy "Quay lại" và "Tiếp theo" ra hai mép,
          trên màn hình rộng hai nút cách nhau cả gang tay. Nay cụm nút nằm
          giữa trang và sát nhau. */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={back}
          className="cta-btn h-12 min-w-[130px] rounded-xl border border-[#DCE7F3] bg-white px-6 text-base font-medium text-[#5B6B7A] transition hover:border-[#B9DDFB] hover:bg-[#F5F7FA]"
        >
          {ui.back}
        </button>

        <button
          type="submit"
          disabled={!allValid}
          className="cta-btn h-12 min-w-[170px] rounded-xl bg-[#0194F3] px-6 text-base font-semibold text-white shadow-md transition hover:bg-[#0B83D9] disabled:bg-[#B9DDFB] disabled:shadow-none"
        >
          {ui.next}
        </button>
      </div>
    </form>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-[#1C2930]">
      {label}
      {required ? <span className="ml-1 text-[#DC2626]">*</span> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  inputMode,
  placeholder,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-lg border border-[#DCE7F3] bg-white px-3 text-[#1C2930] outline-none placeholder:text-[#94A3B8] focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
        required={required}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  required,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  max?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-lg border border-[#DCE7F3] bg-white px-3 text-[#1C2930] outline-none focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
        required={required}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  required,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />

      <div className="relative mt-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-lg border border-[#DCE7F3] bg-white px-3 pr-10 text-[#1C2930] outline-none focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
          required={required}
        >
          <option value="" disabled>
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-white text-[#1C2930]"
            >
              {option.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#5B6B7A]">
          <ChevronDownIcon />
        </span>
      </div>
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
      <path d="M12 3.75a1.5 1.5 0 0 1 1.299.75l7.5 13A1.5 1.5 0 0 1 19.5 19.5H4.5a1.5 1.5 0 0 1-1.299-2.25l7.5-13A1.5 1.5 0 0 1 12 3.75Zm0 4.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0V9A.75.75 0 0 0 12 8.25Zm0 8.25a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" />
    </svg>
  );
}