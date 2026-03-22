"use client";

import React, { useMemo } from "react";
import { useBookingStore } from "@/store/booking-store";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";
type GenderValue = "Nam" | "Nữ" | "Khác";

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
    quickNote: string;
  }
> = {
  vi: {
    title: "Thông tin hành khách",
    subtitle:
      "Vui lòng điền đầy đủ và chính xác thông tin cho từng hành khách để phục vụ công tác đăng ký bay và an toàn.",
    passengerPrefix: "Hành khách",
    quickNote: "Ngày sinh không được ở tương lai và không thể là năm hiện tại.",
  },
  en: {
    title: "Passenger information",
    subtitle:
      "Please provide complete and accurate information for each passenger for flight registration and safety purposes.",
    passengerPrefix: "Passenger",
    quickNote: "Date of birth cannot be in the future or in the current year.",
  },
  fr: {
    title: "Informations passagers",
    subtitle:
      "Veuillez renseigner des informations complètes et exactes pour chaque passager, pour l’enregistrement du vol et la sécurité.",
    passengerPrefix: "Passager",
    quickNote:
      "La date de naissance ne peut pas être future ni appartenir à l’année en cours.",
  },
  ru: {
    title: "Данные пассажиров",
    subtitle:
      "Пожалуйста, заполните точную информацию для каждого пассажира для регистрации полёта и обеспечения безопасности.",
    passengerPrefix: "Пассажир",
    quickNote: "Дата рождения не может быть в будущем или в текущем году.",
  },
  hi: {
    title: "यात्री जानकारी",
    subtitle:
      "फ्लाइट रजिस्ट्रेशन और सुरक्षा के लिए प्रत्येक यात्री की सही और पूरी जानकारी भरें।",
    passengerPrefix: "यात्री",
    quickNote: "जन्मतिथि भविष्य की या वर्तमान वर्ष की नहीं हो सकती।",
  },
  zh: {
    title: "乘客信息",
    subtitle: "请为每位乘客填写完整且准确的信息，以便飞行登记和安全安排。",
    passengerPrefix: "乘客",
    quickNote: "出生日期不能是未来日期，也不能是当前年份。",
  },
};

export default function GuestInfoStep() {
  const t = useBookingText();
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
  const currentYear = today.getFullYear();

  function validateGuest(g: any) {
    const fullNameOk = Boolean(g.fullName?.trim());
    const idOk = Boolean(g.idNumber?.trim());
    const weightOk =
      g.weightKg !== undefined &&
      g.weightKg !== null &&
      !Number.isNaN(Number(g.weightKg)) &&
      Number(g.weightKg) > 0;

    let dobOk = false;
    let dobFutureErr = false;
    let dobTooYoungErr = false;

    if (g.dob) {
      const d = new Date(g.dob);
      d.setHours(0, 0, 0, 0);

      if (d > today) dobFutureErr = true;
      else if (d.getFullYear() === currentYear) dobTooYoungErr = true;
      else dobOk = true;
    }

    return {
      ok:
        fullNameOk &&
        idOk &&
        weightOk &&
        dobOk &&
        !dobFutureErr &&
        !dobTooYoungErr,
      errs: { fullNameOk, idOk, weightOk, dobOk, dobFutureErr, dobTooYoungErr },
    };
  }

  const guestsValidation = Array.from({ length: data.guestsCount }).map((_, idx) =>
    validateGuest(data.guests[idx] || {}),
  );
  const allValid = guestsValidation.every((v) => v.ok);

  return (
    <form
      className="space-y-5 text-white"
      onSubmit={(e) => {
        e.preventDefault();
        if (allValid) next();
      }}
    >
      <div className="overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent px-4 py-4 md:px-6">
          <h3 className="text-lg font-semibold md:text-xl">{ui.title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-white/80">{ui.subtitle}</p>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          <div className="rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white/75">
            {ui.quickNote}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: data.guestsCount }).map((_, idx) => {
              const g = data.guests[idx] || {};

              return (
                <section
                  key={idx}
                  className="rounded-[24px] border border-white/15 bg-black/20 p-4 md:p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 text-sm font-bold text-red-200">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {ui.passengerPrefix} #{idx + 1}
                      </div>
                      <div className="text-xs text-white/55">
                        {g.fullName?.trim() || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field
                      label={t.labels.fullName}
                      required
                      value={g.fullName || ""}
                      onChange={(value) => setGuest(idx, { fullName: value })}
                    />

                    <DateField
                      label={t.labels.dob}
                      required
                      value={g.dob || ""}
                      onChange={(value) => setGuest(idx, { dob: value })}
                    />

                    <div>
                      <label className="block text-sm font-medium text-white/90">
                        {t.labels.gender}
                      </label>

                      <div className="relative mt-2">
                        <select
                          value={(g.gender as GenderValue) || "Nam"}
                          onChange={(e) =>
                            setGuest(idx, {
                              gender: e.target.value as GenderValue,
                            })
                          }
                          className="h-12 w-full appearance-none rounded-2xl border border-sky-300/70 bg-[#5b5447] px-4 pr-10 text-white outline-none focus:border-sky-300"
                        >
                          {genderOptions.map((x) => (
                            <option
                              key={x.value}
                              value={x.value}
                              style={{ backgroundColor: "#5b5447", color: "#ffffff" }}
                            >
                              {x.label}
                            </option>
                          ))}
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

                    <Field
                      label={t.labels.idNumber}
                      required
                      value={g.idNumber || ""}
                      onChange={(value) => setGuest(idx, { idNumber: value })}
                    />

                    <Field
                      label={t.labels.weightKg}
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
                    />

                    <Field
                      label={t.labels.nationality}
                      value={g.nationality || ""}
                      onChange={(value) => setGuest(idx, { nationality: value })}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="h-12 rounded-full border border-white/25 bg-black/25 px-5 text-sm font-medium text-white hover:bg-black/35"
        >
          {t.buttons.back}
        </button>

        <button
          type="submit"
          disabled={!allValid}
          className="h-12 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition hover:brightness-105 disabled:opacity-50"
        >
          {t.buttons.next}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/90">
        {label}
        {required ? <span className="ml-1 text-red-300">*</span> : null}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none focus:border-sky-300"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/90">
        {label}
        {required ? <span className="ml-1 text-red-300">*</span> : null}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none focus:border-sky-300"
        required={required}
      />
    </div>
  );
}