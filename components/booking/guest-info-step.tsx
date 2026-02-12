"use client";
import React, { useMemo } from "react";
import { useBookingStore } from "@/store/booking-store";
import { useBookingText } from "@/lib/booking/translations-booking";

const genders = ["Nam", "Nữ", "Khác"] as const;

export default function GuestInfoStep() {
  const t = useBookingText();
  const data = useBookingStore((s) => s.data);
  const setGuest = useBookingStore((s) => s.setGuest);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);

  const glassWrapperClass =
    "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-5 space-y-6";
  const inputStyle =
    "mt-2 w-full rounded-lg border border-white/40 bg-black/30 px-3 py-2 text-white placeholder:text-white/70 backdrop-blur-sm";
  const labelStyle = "block text-base font-medium text-white";

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
      ok: fullNameOk && idOk && weightOk && dobOk && !dobFutureErr && !dobTooYoungErr,
      errs: { fullNameOk, idOk, weightOk, dobOk, dobFutureErr, dobTooYoungErr },
    };
  }

  const guestsValidation = Array.from({ length: data.guestsCount }).map(
    (_, idx) => validateGuest(data.guests[idx] || {})
  );
  const allValid = guestsValidation.every((v) => v.ok);

  return (
    <form
      className="space-y-6 text-white"
      onSubmit={(e) => {
        e.preventDefault();
        if (allValid) next();
      }}
    >
      <div className={glassWrapperClass}>
        <p className="text-sm text-white">
          Vui lòng điền đầy đủ & chính xác thông tin cho từng hành khách.
        </p>

        <div className="space-y-5">
          {Array.from({ length: data.guestsCount }).map((_, idx) => {
            const g = data.guests[idx] || {};
            const v = guestsValidation[idx];

            return (
              <fieldset key={idx} className="rounded-2xl border border-white/40 p-4">
                <legend className="font-semibold text-white px-2">
                  {t.labels.passengerList} #{idx + 1}
                </legend>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>{t.labels.fullName}</label>
                    <input
                      type="text"
                      value={g.fullName || ""}
                      onChange={(e) => setGuest(idx, { fullName: e.target.value })}
                      className={inputStyle}
                      required
                    />
                    {!v.errs.fullNameOk && (
                      <p className="mt-1 text-xs text-red-300">{t.messages.errors.requiredField}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>{t.labels.dob}</label>
                    <input
                      type="date"
                      value={g.dob || ""}
                      onChange={(e) => setGuest(idx, { dob: e.target.value })}
                      className={`${inputStyle} [color-scheme:dark]`}
                      required
                    />
                    {v.errs.dobFutureErr && (
                      <p className="mt-1 text-xs text-red-300">{t.messages.errors.dobInFuture}</p>
                    )}
                    {!v.errs.dobFutureErr && !v.errs.dobOk && (
                      <p className="mt-1 text-xs text-red-300">{t.messages.errors.dobTooYoung}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>{t.labels.gender}</label>
                    <select
                      className={inputStyle}
                      value={(g.gender as any) || "Nam"}
                      onChange={(e) => setGuest(idx, { gender: e.target.value as any })}
                    >
                      {genders.map((x) => (
                        <option key={x} value={x} className="bg-neutral-800 text-white">
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelStyle}>{t.labels.idNumber}</label>
                    <input
                      type="text"
                      value={g.idNumber || ""}
                      onChange={(e) => setGuest(idx, { idNumber: e.target.value })}
                      className={inputStyle}
                      required
                    />
                    {!v.errs.idOk && (
                      <p className="mt-1 text-xs text-red-300">{t.messages.errors.requiredField}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>{t.labels.weightKg}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={g.weightKg ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                          const parsed = parseFloat(val);
                          setGuest(idx, { weightKg: isNaN(parsed) ? undefined : parsed });
                        }
                      }}
                      className={inputStyle}
                      required
                    />
                    {!v.errs.weightOk && (
                      <p className="mt-1 text-xs text-red-300">{t.messages.errors.weightInvalid}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>{t.labels.nationality}</label>
                    <input
                      type="text"
                      value={g.nationality || ""}
                      onChange={(e) => setGuest(idx, { nationality: e.target.value })}
                      className={inputStyle}
                    />
                  </div>
                </div>
              </fieldset>
            );
          })}
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
          disabled={!allValid}
          className="px-5 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition disabled:opacity-50"
        >
          {t.buttons.next}
        </button>
      </div>
    </form>
  );
}
