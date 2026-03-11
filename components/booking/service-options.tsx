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
    subtitle: string;
    notAvailable: string;
    quantity: string;
    pax: string;
    active: string;
  }
> = {
  vi: {
    title: "Dịch vụ tuỳ chọn",
    subtitle: "Bạn có thể thêm nhanh các dịch vụ quay chụp và hỗ trợ đi kèm.",
    notAvailable: "Không khả dụng tại điểm bay này",
    quantity: "Số lượng",
    pax: "khách",
    active: "Đã chọn",
  },
  en: {
    title: "Optional services",
    subtitle: "Quickly add filming services and useful extras for your flight.",
    notAvailable: "Not available at this location",
    quantity: "Quantity",
    pax: "pax",
    active: "Selected",
  },
  fr: {
    title: "Services optionnels",
    subtitle: "Ajoutez rapidement les services photo/vidéo et les options utiles.",
    notAvailable: "Non disponible sur ce site",
    quantity: "Quantité",
    pax: "pers",
    active: "Sélectionné",
  },
  ru: {
    title: "Дополнительные услуги",
    subtitle: "Быстро добавьте услуги съёмки и полезные опции для полёта.",
    notAvailable: "Недоступно в этой локации",
    quantity: "Количество",
    pax: "чел",
    active: "Выбрано",
  },
  hi: {
    title: "वैकल्पिक सेवाएँ",
    subtitle: "फिल्मिंग सेवाएँ और उपयोगी अतिरिक्त विकल्प जल्दी जोड़ें।",
    notAvailable: "इस लोकेशन पर उपलब्ध नहीं",
    quantity: "मात्रा",
    pax: "यात्री",
    active: "चयनित",
  },
  zh: {
    title: "可选服务",
    subtitle: "快速添加拍摄服务和其他实用附加项目。",
    notAvailable: "该飞行地点不可用",
    quantity: "数量",
    pax: "人",
    active: "已选择",
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
    <div className="rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
      <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent px-4 py-4 md:px-5">
        <h4 className="text-lg font-semibold text-white">{ui.title}</h4>
        <p className="mt-1 text-sm text-white/75">{ui.subtitle}</p>
      </div>

      <div className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["pickup", "flycam", "camera360"] as const).map((k) => {
            const conf = cfg.addons[k];
            const disabled =
              conf.pricePerPersonVND === null && conf.pricePerPersonUSD === null;
            const qty = data.addonsQty?.[k] ?? 0;
            const active = qty > 0;

            return (
              <div
                key={k}
                className={`rounded-2xl border p-4 transition ${
                  disabled
                    ? "opacity-50 border-white/10 bg-white/5"
                    : active
                      ? "border-sky-300/60 bg-sky-400/12 shadow-[0_10px_25px_rgba(56,189,248,0.16)]"
                      : "border-white/12 bg-white/8"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {conf.label[language as LangCode] ?? conf.label.vi}
                    </div>

                    {conf.pricePerPersonVND !== null ? (
                      <div className="mt-1 text-sm text-white/70">
                        {conf.pricePerPersonVND.toLocaleString("vi-VN")}₫ / {ui.pax}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-white/55">
                        {ui.notAvailable}
                      </div>
                    )}
                  </div>

                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!active) setAddonQty(k, 1);
                        else setAddonQty(k, 0);
                      }}
                      className={`inline-flex min-h-9 items-center rounded-full px-4 text-xs font-semibold transition ${
                        active
                          ? "bg-sky-300 text-slate-950"
                          : "border border-white/20 bg-white/8 text-white"
                      }`}
                    >
                      {active ? ui.active : "+"}
                    </button>
                  ) : null}
                </div>

                {!disabled && active ? (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/12 bg-black/18 px-4 py-3">
                    <span className="text-sm text-white/80">{ui.quantity}</span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAddonQty(k, Math.max(0, qty - 1))}
                        disabled={qty <= 0}
                        className="h-8 w-8 rounded-full border border-white/20 bg-white/8 text-white disabled:opacity-40"
                      >
                        −
                      </button>

                      <span className="min-w-6 text-center font-semibold text-white">
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => setAddonQty(k, Math.min(maxQty, qty + 1))}
                        disabled={qty >= maxQty}
                        className="h-8 w-8 rounded-full border border-white/20 bg-white/8 text-white disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}