"use client";

import React, { useMemo, useRef, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { computePriceByLang } from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";
import BookingTicket from "@/components/booking/BookingTicket";

export default function SuccessStep() {
  const t = useBookingText();
  const lang = useLangCode();

  const data = useBookingStore((s) => s.data);
  const bookingResult = useBookingStore((s) => s.bookingResult);
  const reset = useBookingStore((s) => s.reset);

  const totals = computePriceByLang(
    {
      location: data.location,
      guestsCount: data.guestsCount,
      dateISO: data.dateISO,
      addons: data.addons,
      addonsQty: data.addonsQty,
    },
    lang
  );

  const ticketRef = useRef<HTMLDivElement | null>(null);
  const [downloadingIMG, setDownloadingIMG] = useState(false);

  const baseFileName = useMemo(() => {
    const loc = data.location || "booking";
    const date = (data.dateISO || "date").replaceAll("/", "-");
    return `ticket-${loc}-${date}`;
  }, [data.location, data.dateISO]);

  const downloadImage = async () => {
    if (!ticketRef.current) return;

    setDownloadingIMG(true);
    try {
      const { default: html2canvas } = await import("html2canvas");

      // html2canvas v1 không hỗ trợ oklch() (Tailwind v4).
      // Vé BookingTicket đã dùng 100% inline styles → xoá toàn bộ
      // <style> và <link rel=stylesheet> trong cloned DOM để html2canvas
      // không parse oklch, nhưng ticket vẫn render đúng nhờ inline.
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          // Xoá TẤT CẢ external & embedded stylesheets (chứa oklch)
          doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());

          // Inject 1 style tối thiểu (reset box-shadow / filter)
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
      alert(
        lang === "vi"
          ? "Không tạo được ảnh. Vui lòng thử lại hoặc chụp màn hình."
          : lang === "fr"
          ? "Impossible de générer l'image. Veuillez réessayer."
          : lang === "ru"
          ? "Не удалось создать изображение. Попробуйте ещё раз."
          : "Failed to generate image. Please try again or take a screenshot."
      );
    } finally {
      setDownloadingIMG(false);
    }
  };

  const glassWrapperClass =
    "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-5 space-y-6";

  return (
    <div className="space-y-6 text-white">
      {/* Ticket + download button */}
      <div className={glassWrapperClass}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-white">
            {lang === "vi"
              ? "Vé đặt bay"
              : lang === "fr"
              ? "Billet de réservation"
              : lang === "ru"
              ? "Билет на полёт"
              : "Booking ticket"}
          </h3>

          <button
            onClick={downloadImage}
            disabled={downloadingIMG}
            className="px-4 py-2 rounded-xl bg-white/20 border border-white/30 hover:bg-white/30 disabled:opacity-60 transition"
          >
            {downloadingIMG
              ? t.buttons.generatingImage
              : t.buttons.downloadImage}
          </button>
        </div>

        {/* Capture exactly the visible ticket */}
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

      {/* Start over button */}
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
