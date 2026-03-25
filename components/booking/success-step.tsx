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
    title: string;
    subtitle: string;
    imageFail: string;
    note: string;
  }
> = {
  vi: {
    title: "Booking đã được ghi nhận",
    subtitle:
      "Bạn có thể tải vé đặt bay ngay bên dưới hoặc bắt đầu một booking mới.",
    imageFail: "Không tạo được ảnh. Vui lòng thử lại hoặc chụp màn hình.",
    note: "Đội ngũ sẽ liên hệ xác nhận lịch bay, thời tiết và các dịch vụ đi kèm trong thời gian sớm nhất.",
  },
  en: {
    title: "Booking received",
    subtitle:
      "You can download your booking ticket below or start a new booking.",
    imageFail: "Failed to generate image. Please try again or take a screenshot.",
    note: "Our team will contact you soon to confirm schedule, weather, and selected services.",
  },
  fr: {
    title: "Réservation enregistrée",
    subtitle:
      "Vous pouvez télécharger votre billet ci-dessous ou commencer une nouvelle réservation.",
    imageFail: "Impossible de générer l'image. Veuillez réessayer.",
    note: "Notre équipe vous contactera rapidement pour confirmer l'horaire, la météo et les services choisis.",
  },
  ru: {
    title: "Бронирование получено",
    subtitle:
      "Ниже вы можете скачать билет или начать новое бронирование.",
    imageFail: "Не удалось создать изображение. Попробуйте ещё раз.",
    note: "Наша команда скоро свяжется с вами для подтверждения времени, погоды и выбранных услуг.",
  },
  hi: {
    title: "बुकिंग प्राप्त हो गई",
    subtitle:
      "आप नीचे अपना बुकिंग टिकट डाउनलोड कर सकते हैं या नई बुकिंग शुरू कर सकते हैं।",
    imageFail: "इमेज बनाई नहीं जा सकी। कृपया फिर से प्रयास करें।",
    note: "हमारी टीम जल्द ही समय, मौसम और चुनी गई सेवाओं की पुष्टि के लिए आपसे संपर्क करेगी।",
  },
  zh: {
    title: "预订已收到",
    subtitle:
      "您可以在下方下载预订票，或重新开始新的预订。",
    imageFail: "无法生成图片。请重试或直接截图。",
    note: "团队会尽快联系您确认飞行时间、天气和已选服务。",
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

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-sm">
        <div className="border-b border-[#DCE7F3] bg-[#16A34A] px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white md:text-xl">{ui.title}</h3>
              <p className="mt-1 max-w-3xl text-sm text-white/90">
                {ui.subtitle}
              </p>
            </div>

            <div className="rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold text-white">
              ✓ Confirmed
            </div>
          </div>
        </div>

        <div className="space-y-5 bg-[#F5F7FA] p-4 md:p-6">
          <div className="rounded-lg border border-[#B9DDFB] bg-[#EAF4FE] px-4 py-3 text-sm text-[#355166]">
            {ui.note}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-[#5B6B7A]">
              {t.buttons.downloadImage}
            </div>

            <button
              onClick={downloadImage}
              disabled={downloadingIMG}
              className="h-12 rounded-xl bg-[#0194F3] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#0B83D9] disabled:bg-[#B9DDFB] disabled:shadow-none"
            >
              {downloadingIMG ? t.buttons.generatingImage : t.buttons.downloadImage}
            </button>
          </div>

          <div className="rounded-xl border border-[#DCE7F3] bg-white p-2 md:p-3 mx-auto" style={{ maxWidth: "560px" }}>
            <div ref={ticketRef} style={{ background: "#ffffff", borderRadius: 12 }}>
              <BookingTicket
                booking={data}
                bookingResult={bookingResult}
                totals={totals}
                lang={lang}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={reset}
          className="h-12 rounded-xl border border-[#DCE7F3] bg-white px-5 text-sm font-medium text-[#5B6B7A] transition hover:border-[#B9DDFB] hover:bg-[#F5F7FA]"
        >
          {t.buttons.startOver}
        </button>
      </div>
    </div>
  );
}
