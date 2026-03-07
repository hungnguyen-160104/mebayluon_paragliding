"use client";
import React from "react";
import { useBookingStore } from "@/store/booking-store";
import { LOCATIONS } from "@/lib/booking/calculate-price";
import { useLanguage } from "@/contexts/language-context";
import type { LangCode } from "@/lib/booking/translations-booking";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    notAvailable: string;
    quantity: string;
    pax: string;
  }
> = {
  vi: {
    title: "Dịch vụ tuỳ chọn",
    notAvailable: "Không khả dụng tại điểm bay này",
    quantity: "Số lượng",
    pax: "khách",
  },
  en: {
    title: "Optional services",
    notAvailable: "Not available at this location",
    quantity: "Quantity",
    pax: "pax",
  },
  fr: {
    title: "Services optionnels",
    notAvailable: "Non disponible sur ce site",
    quantity: "Quantité",
    pax: "pers",
  },
  ru: {
    title: "Дополнительные услуги",
    notAvailable: "Недоступно в этой локации",
    quantity: "Количество",
    pax: "чел",
  },
  hi: {
    title: "वैकल्पिक सेवाएँ",
    notAvailable: "इस लोकेशन पर उपलब्ध नहीं",
    quantity: "मात्रा",
    pax: "यात्री",
  },
  zh: {
    title: "可选服务",
    notAvailable: "该飞行地点不可用",
    quantity: "数量",
    pax: "人",
  },
};

export default function ServiceOptions() {
  const data = useBookingStore((s) => s.data);
  const setAddonQty = useBookingStore((s) => s.setAddonQty);
  const cfg = LOCATIONS[data.location];
  const { language } = useLanguage();

  const lang = ((language as LangCode) || "vi") as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;
  const maxQty = Math.max(1, data.guestsCount || 1);

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">{ui.title}</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(["pickup", "flycam", "camera360"] as const).map((k) => {
          const conf = cfg.addons[k];
          const disabled = conf.pricePerPersonVND === null && conf.pricePerPersonUSD === null;
          const qty = data.addonsQty?.[k] ?? 0;
          const active = qty > 0;

          return (
            <div
              key={k}
              className={`rounded-xl border p-3 ${
                disabled ? "opacity-50" : active ? "border-blue-500 bg-blue-50/10" : "hover:shadow"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{conf.label[language as LangCode] ?? conf.label.vi}</div>

                  {conf.pricePerPersonVND !== null ? (
                    <div className="text-sm text-neutral-600">
                      {conf.pricePerPersonVND.toLocaleString("vi-VN")}₫ / {ui.pax}
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-600">{ui.notAvailable}</div>
                  )}
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!active) setAddonQty(k, 1);
                      else setAddonQty(k, 0);
                    }}
                    className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded border ${
                      active ? "bg-blue-600 border-blue-600 text-white" : "border-neutral-300"
                    }`}
                  >
                    {active ? "✓" : ""}
                  </button>
                )}
              </div>

              {!disabled && active && (
                <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm">{ui.quantity}</span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAddonQty(k, Math.max(0, qty - 1))}
                      disabled={qty <= 0}
                      className="h-8 w-8 rounded-full border disabled:opacity-40"
                    >
                      −
                    </button>

                    <span className="min-w-6 text-center font-semibold">{qty}</span>

                    <button
                      type="button"
                      onClick={() => setAddonQty(k, Math.min(maxQty, qty + 1))}
                      disabled={qty >= maxQty}
                      className="h-8 w-8 rounded-full border disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}