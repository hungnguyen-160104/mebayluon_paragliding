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
    <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-sm">
      <div className="border-b border-[#DCE7F3] bg-[#F5F7FA] px-4 py-4 md:px-5">
        <h4 className="text-lg font-bold text-[#1C2930]">{ui.title}</h4>
        <p className="mt-1 text-sm text-[#5B6B7A]">{ui.subtitle}</p>
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
                className={`rounded-xl border-2 p-4 transition ${
                  disabled
                    ? "opacity-50 border-[#DCE7F3] bg-[#F5F7FA]"
                    : active
                      ? "border-[#0194F3] bg-[#EAF4FE] shadow-md"
                      : "border-[#DCE7F3] bg-white hover:border-[#B9DDFB]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#1C2930]">
                      {conf.label[language as LangCode] ?? conf.label.vi}
                    </div>

                    {conf.pricePerPersonVND !== null ? (
                      <div className="mt-1 text-sm font-bold text-[#FF5E1F]">
                        {conf.pricePerPersonVND.toLocaleString("vi-VN")}₫ / {ui.pax}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-[#5B6B7A]">
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
                      className={`inline-flex min-h-9 items-center rounded-lg px-4 text-xs font-semibold transition ${
                        active
                          ? "bg-[#0194F3] text-white"
                          : "border border-[#DCE7F3] bg-white text-[#5B6B7A] hover:border-[#0194F3] hover:text-[#0194F3]"
                      }`}
                    >
                      {active ? ui.active : "+"}
                    </button>
                  ) : null}
                </div>

                {!disabled && active ? (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
                    <span className="text-sm text-[#5B6B7A]">{ui.quantity}</span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAddonQty(k, Math.max(0, qty - 1))}
                        disabled={qty <= 0}
                        className="h-8 w-8 rounded-lg border border-[#DCE7F3] bg-white text-[#5B6B7A] transition hover:bg-[#EAF4FE] disabled:opacity-40"
                      >
                        −
                      </button>

                      <span className="min-w-6 text-center font-bold text-[#0194F3]">
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => setAddonQty(k, Math.min(maxQty, qty + 1))}
                        disabled={qty >= maxQty}
                        className="h-8 w-8 rounded-lg border border-[#DCE7F3] bg-white text-[#5B6B7A] transition hover:bg-[#EAF4FE] disabled:opacity-40"
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
