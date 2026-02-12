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

export default function PriceSummary() {
  const t = useBookingText();
  const lang = useLangCode();
  const data = useBookingStore((s) => s.data);

  const totals = computePriceByLang(
    {
      location: data.location,
      guestsCount: data.guestsCount,
      dateISO: data.dateISO,
      addons: data.addons,         // backward compat
      addonsQty: data.addonsQty,   // NEW
    },
    lang
  );

  const cfg = LOCATIONS[data.location];

  const addonQtyEntries = Object.entries(totals.addonsQty) as [AddonKey, number][];

  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl p-6 text-white">
      <h3 className="text-xl font-semibold mb-4">{t.labels.priceSummary}</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{t.labels.location}</span>
          <span>{cfg.name[lang] ?? cfg.name.vi}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.labels.numGuests}</span>
          <span>{data.guestsCount}</span>
        </div>

        <div className="border-t border-white/30 my-2" />

        <div className="flex justify-between">
          <span>{t.labels.basePricePerGuest}</span>
          <span>{formatByLang(lang, totals.basePricePerPerson, totals.basePricePerPerson)}</span>
        </div>

        {/* NEW: addons theo qty */}
        {addonQtyEntries
          .filter(([, qty]) => qty > 0)
          .map(([k, qty]) => {
            const label = cfg.addons[k].label[lang] ?? cfg.addons[k].label.vi;
            const lineTotal = totals.addonsTotal[k] || 0;
            return (
              <div key={k} className="flex justify-between">
                <span>
                  {t.labels.addonSurcharge(label)}{" "}
                  <span className="text-white/80">× {qty}</span>
                </span>
                <span>{formatByLang(lang, lineTotal, lineTotal)}</span>
              </div>
            );
          })}

        {totals.discountPerPerson > 0 && (
          <div className="flex justify-between text-white">
            <span>{t.labels.groupDiscount}</span>
            <span>
              -{formatByLang(lang, totals.discountPerPerson, totals.discountPerPerson)} /{" "}
              {lang === "vi" ? "khách" : "pax"}
            </span>
          </div>
        )}

        <div className="border-t border-white/30 my-2" />
        <div className="flex justify-between font-semibold text-lg">
          <span>{t.labels.provisionalTotal}</span>
          <span>{formatByLang(lang, totals.totalAfterDiscount, totals.totalAfterDiscount)}</span>
        </div>
      </div>

      <p className="text-xs text-white/80 mt-3">* {t.messages.groupPromoAuto}</p>
    </div>
  );
}
