"use client";

import React, { useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import {
  LOCATIONS,
  type LocationKey,
  type AddonKey,
  formatByLang,
} from "@/lib/booking/calculate-price";
import { motion } from "framer-motion";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

export default function SelectFlightStep() {
  const t = useBookingText();
  const lang = useLangCode();

  const data = useBookingStore((s) => s.data);
  const setGuestsCount = useBookingStore((s) => s.setGuestsCount);
  const setAddonQty = useBookingStore((s) => s.setAddonQty);
  const update = useBookingStore((s) => s.update);
  const next = useBookingStore((s) => s.next);

  const [selected, setSelected] = useState<LocationKey | null>(
    (data.location as LocationKey) || null
  );
  const [guestInput, setGuestInput] = useState((data.guestsCount || 0).toString());

  const handleSelect = (key: LocationKey) => {
    // đổi địa điểm -> reset lựa chọn dịch vụ để tránh lệch service availability
    update({ location: key, addons: {}, addonsQty: {} });
    setSelected(key);
  };

  const handleGuestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (/^[0-9]*$/.test(rawValue)) {
      setGuestInput(rawValue);
      const numValue = parseInt(rawValue, 10);
      setGuestsCount(isNaN(numValue) ? 0 : numValue);
    }
  };

  const selectedCfg = selected ? LOCATIONS[selected] : null;

  return (
    <div className="space-y-10 text-white">
      {/* Lưới địa điểm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Object.values(LOCATIONS).map((loc) => {
          const isActive = selected === loc.key;
          const priceText = formatByLang(lang, loc.basePriceVND(), loc.basePriceUSD());

          return (
            <motion.div
              key={loc.key}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleSelect(loc.key as LocationKey)}
              className={`cursor-pointer p-5 rounded-2xl border text-center backdrop-blur-lg transition-all duration-300
                ${
                  isActive
                    ? "bg-white/30 border-accent/70 shadow-xl"
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
            >
              <h3 className="text-xl font-semibold mb-2">
                {loc.name[lang] ?? loc.name.vi}
              </h3>
              <div className="text-lg font-bold text-white">{priceText}</div>
              <p className="text-xs text-white mt-1">
                {lang === "vi" ? "/ khách (giá cơ bản)" : "/ pax (base price)"}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Mô tả chi tiết */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-lg"
      >
        {!selectedCfg ? (
          <p className="text-center text-white">{t.messages.selectLocationToSeeDetail}</p>
        ) : (
          <div>
            <h4 className="text-2xl font-semibold mb-3 text-white">
              {selectedCfg.name[lang] ?? selectedCfg.name.vi}
            </h4>
            <ul className="list-disc ml-6 space-y-1 text-white text-sm">
              {(selectedCfg.included[lang] ?? selectedCfg.included.vi).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>

            {selectedCfg.excluded &&
              (selectedCfg.excluded[lang] ?? selectedCfg.excluded.vi)?.length > 0 && (
                <p className="text-xs text-white mt-3">
                  <strong>{t.labels.notIncluded}</strong>{" "}
                  {(selectedCfg.excluded[lang] ?? selectedCfg.excluded.vi).join(", ")}
                </p>
              )}
          </div>
        )}
      </motion.div>

      {/* Số lượng khách */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-md">
          <label className="block text-sm font-medium mb-2">{t.labels.guestsCount}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={guestInput}
            onChange={handleGuestInputChange}
            className="w-full rounded-lg bg-white/20 border border-white/30 px-3 py-2 text-white placeholder-slate-300"
          />
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-md text-sm text-white">
          {t.messages.groupPromoAuto}
        </div>
      </div>

      {/* Dịch vụ tuỳ chọn (NEW: qty +/- không vượt quá số khách) */}
      <div>
        <h4 className="text-xl font-semibold mb-4">{t.labels.addonsTitle}</h4>

        {!selectedCfg ? (
          <p className="text-slate-200 italic text-sm">{t.labels.addonsPromptSelectLocation}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(selectedCfg.addons) as [AddonKey, any][]).map(([key, conf]) => {
              const disabled =
                conf.pricePerPersonVND === null && conf.pricePerPersonUSD === null;

              const qty = data.addonsQty?.[key] ?? 0;
              const active = qty > 0;

              const priceText =
                conf.pricePerPersonVND == null && conf.pricePerPersonUSD == null
                  ? ""
                  : formatByLang(
                      lang,
                      conf.pricePerPersonVND ?? 0,
                      conf.pricePerPersonUSD ??
                        (conf.pricePerPersonVND != null
                          ? Math.round(conf.pricePerPersonVND / 26000)
                          : 0)
                    );

              const maxQty = Math.max(1, data.guestsCount || 1);

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (disabled) return;
                    if (!active) setAddonQty(key, 1); // click để "hiện số lượt"
                  }}
                  className={`flex flex-col gap-2 rounded-xl border backdrop-blur-md p-4 transition-all duration-200
                    ${
                      active
                        ? "bg-white/30 border-accent/70 shadow-lg"
                        : "bg-white/10 border-white/20 hover:bg-white/20"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border
                          ${active ? "bg-accent/80 border-accent/80" : "bg-white/10 border-white/30"}`}
                      >
                        {active ? <span className="text-white text-sm">✓</span> : null}
                      </span>

                      <span className="font-medium">{conf.label[lang] ?? conf.label.vi}</span>
                    </div>

                    {!disabled && (
                      <span className="text-xs text-white/80">
                        {active ? `${qty}/${maxQty}` : ""}
                      </span>
                    )}
                  </div>

                  {priceText ? (
                    <p className="text-sm text-white">
                      {priceText} / {lang === "vi" ? "khách" : "pax"}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 italic mt-1">{t.labels.notAvailableHere}</p>
                  )}

                  {/* NEW: qty control (chỉ hiện khi đã click chọn) */}
                  {!disabled && active && (
                    <div
                      className="mt-1 flex items-center justify-between rounded-lg bg-black/20 border border-white/20 px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-sm font-medium">
                        {lang === "vi" ? "Số lượt:" : "Qty:"}
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAddonQty(key, qty - 1)}
                          disabled={qty <= 0}
                          className="h-8 w-8 rounded-full bg-white/10 border border-white/20 disabled:opacity-40"
                        >
                          −
                        </button>

                        <span className="min-w-6 text-center font-semibold">{qty}</span>

                        <button
                          type="button"
                          onClick={() => setAddonQty(key, qty + 1)}
                          disabled={qty >= maxQty}
                          className="h-8 w-8 rounded-full bg-white/10 border border-white/20 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {key === "pickup" && selected === "sapa" && (
                    <p className="text-xs italic text-slate-300">{t.messages.pickupNoteSapa}</p>
                  )}
                  {key === "pickup" && selected === "ha_noi" && (
                    <p className="text-xs italic text-slate-300">{t.messages.pickupNoteHN}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nút tiếp tục */}
      <div className="flex justify-end">
        <button
          onClick={next}
          className="px-6 py-2.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition"
        >
          {t.buttons.next}
        </button>
      </div>
    </div>
  );
}
