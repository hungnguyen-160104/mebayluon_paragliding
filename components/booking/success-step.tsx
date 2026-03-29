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
    preFlightNotesTitle: string;
    preFlightNotes: string[];
  }
> = {
  vi: {
    title: "Booking đã được ghi nhận",
    subtitle:
      "Bạn có thể tải vé đặt bay ngay bên dưới hoặc bắt đầu một booking mới.",
    imageFail: "Không tạo được ảnh. Vui lòng thử lại hoặc chụp màn hình.",
    note: "Đội ngũ sẽ liên hệ xác nhận lịch bay, thời tiết và các dịch vụ đi kèm trong thời gian sớm nhất.",
    preFlightNotesTitle: "Thông tin lưu ý trước khi bay",
    preFlightNotes: [
      "Lịch bay có thể thay đổi tùy theo điều kiện thời tiết thực tế.",
      "Vui lòng có mặt tại điểm hẹn trước giờ bay ít nhất 30 phút.",
      "Mang theo giấy tờ tùy thân và xác nhận đặt chỗ khi đến.",
      "Trang phục gọn gàng, giày thể thao; không mang theo vật sắc nhọn.",
      "Nếu có vấn đề sức khỏe hoặc cần hỗ trợ đặc biệt, vui lòng thông báo trước.",
      "Liên hệ hotline nếu cần thay đổi hoặc hủy lịch bay.",
    ],
  },
  en: {
    title: "Booking received",
    subtitle:
      "You can download your booking ticket below or start a new booking.",
    imageFail: "Failed to generate image. Please try again or take a screenshot.",
    note: "Our team will contact you soon to confirm schedule, weather, and selected services.",
    preFlightNotesTitle: "Pre-flight information",
    preFlightNotes: [
      "Flight schedule may change depending on actual weather conditions.",
      "Please arrive at the meeting point at least 30 minutes before flight time.",
      "Bring ID and booking confirmation when you arrive.",
      "Wear comfortable clothes and sport shoes; do not bring sharp objects.",
      "If you have health issues or need special assistance, please inform us in advance.",
      "Contact our hotline to reschedule or cancel your flight.",
    ],
  },
  fr: {
    title: "Réservation enregistrée",
    subtitle:
      "Vous pouvez télécharger votre billet ci-dessous ou commencer une nouvelle réservation.",
    imageFail: "Impossible de générer l'image. Veuillez réessayer.",
    note: "Notre équipe vous contactera rapidement pour confirmer l'horaire, la météo et les services choisis.",
    preFlightNotesTitle: "Informations avant le vol",
    preFlightNotes: [
      "L'horaire du vol peut changer en fonction des conditions météorologiques.",
      "Veuillez arriver au point de rendez-vous au moins 30 minutes avant le vol.",
      "Apportez une pièce d'identité et la confirmation de réservation.",
      "Portez des vêtements confortables et des chaussures de sport ; pas d'objets tranchants.",
      "Si vous avez des problèmes de santé ou besoin d'une assistance particulière, informez-nous à l'avance.",
      "Contactez notre hotline pour modifier ou annuler votre vol.",
    ],
  },
  ru: {
    title: "Бронирование получено",
    subtitle:
      "Ниже вы можете скачать билет или начать новое бронирование.",
    imageFail: "Не удалось создать изображение. Попробуйте ещё раз.",
    note: "Наша команда скоро свяжется с вами для подтверждения времени, погоды и выбранных услуг.",
    preFlightNotesTitle: "Информация перед полётом",
    preFlightNotes: [
      "Расписание полёта может измениться в зависимости от погодных условий.",
      "Пожалуйста, прибудьте к месту встречи минимум за 30 минут до вылета.",
      "Возьмите удостоверение личности и подтверждение бронирования.",
      "Наденьте удобную одежду и спортивную обувь; не берите острые предметы.",
      "Если у вас есть проблемы со здоровьем или нужна особая помощь, сообщите заранее.",
      "Свяжитесь с нашей горячей линией для изменения или отмены полёта.",
    ],
  },
  hi: {
    title: "बुकिंग प्राप्त हो गई",
    subtitle:
      "आप नीचे अपना बुकिंग टिकट डाउनलोड कर सकते हैं या नई बुकिंग शुरू कर सकते हैं।",
    imageFail: "इमेज बनाई नहीं जा सकी। कृपया फिर से प्रयास करें।",
    note: "हमारी टीम जल्द ही समय, मौसम और चुनी गई सेवाओं की पुष्टि के लिए आपसे संपर्क करेगी।",
    preFlightNotesTitle: "उड़ान से पहले की जानकारी",
    preFlightNotes: [
      "मौसम की स्थिति के अनुसार उड़ान का समय बदल सकता है।",
      "कृपया उड़ान से कम से कम 30 मिनट पहले मिलन स्थल पर पहुँचें।",
      "आईडी और बुकिंग पुष्टि साथ लाएं।",
      "आरामदायक कपड़े और स्पोर्ट्स शूज पहनें; तेज धार वाली वस्तुएं न लाएं।",
      "यदि स्वास्थ्य संबंधी कोई समस्या है या विशेष सहायता चाहिए, तो पहले से सूचित करें।",
      "उड़ान में बदलाव या रद्द करने के लिए हमारी हॉटलाइन से संपर्क करें।",
    ],
  },
  zh: {
    title: "预订已收到",
    subtitle:
      "您可以在下方下载预订票，或重新开始新的预订。",
    imageFail: "无法生成图片。请重试或直接截图。",
    note: "团队会尽快联系您确认飞行时间、天气和已选服务。",
    preFlightNotesTitle: "飞行前须知",
    preFlightNotes: [
      "飞行时间可能根据实际天气情况调整。",
      "请至少提前30分钟到达集合点。",
      "请携带身份证件和预订确认信息。",
      "请穿着舒适的衣物和运动鞋；请勿携带尖锐物品。",
      "如有健康问题或需要特殊协助，请提前告知。",
      "如需更改或取消航班，请联系客服热线。",
    ],
  },
};

export default function SuccessStep() {
  const t = useBookingText();
  const lang = useLangCode() as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const data = useBookingStore((s) => s.data);
  const bookingResult = useBookingStore((s) => s.bookingResult);
  const reset = useBookingStore((s) => s.reset);

  const bookingData = useMemo(() => {
    if (!bookingResult) return data;
    return {
      ...data,
      ...bookingResult,
      contact: {
        ...(data.contact || {}),
        ...(bookingResult.contact || {}),
      },
      guests: bookingResult.guests || data.guests,
      services: bookingResult.services || data.services,
      addons: bookingResult.addons || data.addons,
      addonsQty: bookingResult.addonsQty || data.addonsQty,
    };
  }, [data, bookingResult]);

  const totals = computePriceByLang(
    {
      location: bookingData.location,
      guestsCount: bookingData.guestsCount,
      dateISO: bookingData.dateISO,
      packageKey: bookingData.packageKey,
      flightTypeKey: bookingData.flightTypeKey,
      addons: bookingData.addons,
      addonsQty: bookingData.addonsQty,
    },
    lang
  );

  const ticketRef = useRef<HTMLDivElement | null>(null);
  const [downloadingIMG, setDownloadingIMG] = useState(false);

  const baseFileName = useMemo(() => {
    const loc = bookingData.location || "booking";
    const pkg = bookingData.packageKey || "default";
    const flight = bookingData.flightTypeKey || "flight";
    const date = (bookingData.dateISO || "date").replaceAll("/", "-");
    return `ticket-${loc}-${pkg}-${flight}-${date}`;
  }, [bookingData.location, bookingData.packageKey, bookingData.flightTypeKey, bookingData.dateISO]);

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

          <div className="flex flex-wrap items-center justify-end gap-3">
            
            <button
              onClick={downloadImage}
              disabled={downloadingIMG}
              className="h-12 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:bg-red-300 disabled:shadow-none"
            >
              {downloadingIMG ? t.buttons.generatingImage : t.buttons.downloadImage}
            </button>
          </div>

          <div className="rounded-xl border border-[#DCE7F3] bg-white p-2 md:p-3 mx-auto" style={{ maxWidth: "100%" }}>
            <div ref={ticketRef} style={{ background: "#ffffff", borderRadius: 12 }}>
              <BookingTicket
                booking={bookingData}
                bookingResult={bookingResult}
                totals={totals}
                lang={lang}
              />
            </div>
          </div>

          <section className="rounded-xl border border-[#FF5E1F] bg-[#FFF4ED] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5E1F]">
              {ui.preFlightNotesTitle}
            </div>
            <ul className="mt-3 space-y-2">
              {ui.preFlightNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[#5B6B7A]">
                  <span className="mt-1 text-[#FF5E1F]">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
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
