"use client";

import React, { useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { LOCATIONS } from "@/lib/booking/calculate-price";
import type { LocationKey } from "@/lib/booking/calculate-price";
import {
  useBookingText,
  useLangCode,
  BIGC_THANG_LONG_MAP,
} from "@/lib/booking/translations-booking";

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

export default function ContactInfoStep() {
  const t = useBookingText();
  const lang = useLangCode();
  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);
  const setContact = useBookingStore((s) => s.setContact);

  const cfg = data.location
    ? LOCATIONS[data.location as LocationKey]
    : undefined;

  const isHaNoi = data.location === "ha_noi";
  const showPickupField =
    Boolean(data.addons?.pickup) &&
    Boolean(cfg?.addons?.pickup) &&
    (cfg?.addons?.pickup?.pricePerPersonVND != null ||
      cfg?.addons?.pickup?.pricePerPersonUSD != null);

  // minDate = ngày mai
  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [dateError, setDateError] = useState<string | null>(null);

  const inputStyle =
    "mt-2 w-full rounded-lg border border-white/40 bg-black/30 px-3 py-2 text-white placeholder:text-white/70 backdrop-blur-sm";
  const labelStyle = "block text-base font-medium text-white";
  const glassWrapperClass =
    "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-5 space-y-6";

  return (
    <form
      className="space-y-6 text-white"
      onSubmit={(e) => {
        e.preventDefault();
        if (!dateError) next();
      }}
    >
      <div className={glassWrapperClass}>
        {!cfg && (
          <p className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-white backdrop-blur-sm">
            Vui lòng chọn điểm bay trước khi nhập thông tin liên hệ.
          </p>
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
              className={`${inputStyle} [color-scheme:dark]`}
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

        {showPickupField && (
          <div>
            <label className={labelStyle}>{t.labels.pickup}</label>
            {isHaNoi ? (
              <div className="mt-2 text-sm text-white bg-white/10 border border-white/30 rounded-lg p-3">
                {t.labels.pickupFixed}{" "}
                <a
                  href={BIGC_THANG_LONG_MAP}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 underline font-medium"
                >
                  {t.buttons.viewMap}
                </a>
              </div>
            ) : (
              <input
                type="text"
                placeholder={t.placeholders.pickup}
                value={data.contact?.pickupLocation || ""}
                onChange={(e) => setContact({ pickupLocation: e.target.value })}
                className={inputStyle}
              />
            )}
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
