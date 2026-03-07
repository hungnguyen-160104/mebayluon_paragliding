"use client";

import React, { useMemo, useRef, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { computePriceByLang } from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";
import BookingTicket from "@/components/booking/BookingTicket";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const UI_TEXT: Record<
  LangUI,
  {
    ticketTitle: string;
    imageFail: string;
  }
> = {
  vi: {
    ticketTitle: "Vé đặt bay",
    imageFail: "Không tạo được ảnh. Vui lòng thử lại hoặc chụp màn hình.",
  },
  en: {
    ticketTitle: "Booking ticket",
    imageFail: "Failed to generate image. Please try again or take a screenshot.",
  },
  fr: {
    ticketTitle: "Billet de réservation",
    imageFail: "Impossible de générer l'image. Veuillez réessayer.",
  },
  ru: {
    ticketTitle: "Билет на полёт",
    imageFail: "Не удалось создать изображение. Попробуйте ещё раз.",
  },
  hi: {
    ticketTitle: "बुकिंग टिकट",
    imageFail: "इमेज बनाई नहीं जा सकी। कृपया फिर से प्रयास करें।",
  },
  zh: {
    ticketTitle: "预订票",
    imageFail: "无法生成图片。请重试或直接截图。",
  },
};

export default function SuccessStep() {
  const t = useBookingText();
  const lang = useLangCode() as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const data = useBookingStore((s) => s.data);
  const bookingResult = useBookingStore((s) => s.bookingResult);
  const reset = useBookingStore((s) => s.reset);

  const totals = computePriceByLang(
    {
      location: data.location,
      guestsCount: data.guestsCount,
      dateISO: data.dateISO,
      packageKey: data.packageKey,
      flightTypeKey: data.flightTypeKey,
      addons: data.addons,
      addonsQty: data.addonsQty,
    },
    lang
  );

  const ticketRef = useRef<HTMLDivElement | null>(null);
  const [downloadingIMG, setDownloadingIMG] = useState(false);

  const baseFileName = useMemo(() => {
    const loc = data.location || "booking";
    const pkg = data.packageKey || "default";
    const flight = data.flightTypeKey || "flight";
    const date = (data.dateISO || "date").replaceAll("/", "-");
    return `ticket-${loc}-${pkg}-${flight}-${date}`;
  }, [data.location, data.packageKey, data.flightTypeKey, data.dateISO]);

  const downloadImage = async () => {
    if (!ticketRef.current) return;

    setDownloadingIMG(true);
    try {
      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());

          const safeStyle = doc.createElement("style");
          safeStyle.textContent = `
            *, *::before, *::after {
              box-shadow: none !important;
              filter: none !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              text-shadow: none !important;
            }
          `;
          doc.head.appendChild(safeStyle);
        },
      });

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 1)
      );

      if (!blob) {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${baseFileName}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseFileName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download image failed:", e);
      alert(ui.imageFail);
    } finally {
      setDownloadingIMG(false);
    }
  };

  const glassWrapperClass =
    "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-5 space-y-6";

  return (
    <div className="space-y-6 text-white">
      <div className={glassWrapperClass}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-white">{ui.ticketTitle}</h3>

          <button
            onClick={downloadImage}
            disabled={downloadingIMG}
            className="px-4 py-2 rounded-xl bg-white/20 border border-white/30 hover:bg-white/30 disabled:opacity-60 transition"
          >
            {downloadingIMG ? t.buttons.generatingImage : t.buttons.downloadImage}
          </button>
        </div>

        <div className="mt-4">
          <div ref={ticketRef} style={{ background: "#ffffff", borderRadius: 24 }}>
            <BookingTicket
              booking={data}
              bookingResult={bookingResult}
              totals={totals}
              lang={lang}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl border border-white/40 bg-black/30 text-white hover:bg-black/50 transition backdrop-blur-sm"
        >
          {t.buttons.startOver}
        </button>
      </div>
    </div>
  );
}