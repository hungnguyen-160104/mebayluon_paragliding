"use client";

import React, { useMemo, useRef, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { computePriceByLang, LOCATIONS } from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";
import BookingTicket from "@/components/booking/BookingTicket";
import Link from "next/link";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

/** Hai số hotline, hiển thị thành nút bấm gọi được trên điện thoại. */
const HOTLINES = ["0964.073.555", "0385.907.789"];

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    subtitle: string;
    imageFail: string;
    note: string;
    preFlightNotesTitle: string;
    preFlightNotes: string[];
    confirmedBadge: string;
    contactTitle: string;
    contactHint: string;
    guideTitle: string;
    guideHint: string;
    guidePreNotice: string;
    guideSafety: string;
    guideSteps: string;
    readyTitle: string;
    flightAtLabel: string;
    passengerLabel: string;
    andOthers: (n: number) => string;
    funLines: string[];
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
    confirmedBadge: "Đã xác nhận",
    contactTitle: "Cần hỗ trợ? Gọi ngay",
    contactHint: "Đổi lịch, huỷ bay hay hỏi thời tiết — gọi hoặc nhắn bất cứ lúc nào.",
    guideTitle: "Đọc trước khi đi bay",
    guideHint: "Ba bài ngắn giúp bạn chuẩn bị đúng và bay thoải mái hơn.",
    guidePreNotice: "Lưu ý trước chuyến bay",
    guideSafety: "Dù lượn có an toàn không?",
    guideSteps: "Các bước khi đi bay dù lượn",
    readyTitle: "Bạn đã sẵn sàng cất cánh! 🪂",
    flightAtLabel: "Chuyến bay của bạn",
    passengerLabel: "Khách bay",
    andOthers: (n: number) => `và ${n} khách nữa`,
    funLines: [
      "Mặc thật xinh nhé — trên trời, máy ảnh không biết nói dối đâu! 📸",
      "Hít một hơi thật sâu. Vài phút nữa thôi, cả thung lũng sẽ nằm dưới chân bạn. ☁️",
      "Chuẩn bị tinh thần cho một trong những trải nghiệm đáng nhớ nhất đời. 🌄",
      "Nhớ cười thật tươi — phi công đang cầm sẵn GoPro rồi đấy! 😄",
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
    confirmedBadge: "Confirmed",
    contactTitle: "Need help? Call us",
    contactHint: "Reschedule, cancel or ask about the weather — call or message any time.",
    guideTitle: "Read before you fly",
    guideHint: "Three short reads to help you prepare and enjoy the flight.",
    guidePreNotice: "Pre-flight notes",
    guideSafety: "Is paragliding safe?",
    guideSteps: "How a paragliding flight goes",
    readyTitle: "You are ready for take-off! 🪂",
    flightAtLabel: "Your flight",
    passengerLabel: "Passenger",
    andOthers: (n: number) => `and ${n} more`,
    funLines: [
      "Dress your best — up there, the camera never lies! 📸",
      "Take a deep breath. In a few minutes the whole valley is under your feet. ☁️",
      "Get ready for one of the most memorable hours of your life. 🌄",
      "Don't forget to smile — your pilot already has the GoPro out! 😄",
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
    confirmedBadge: "Confirmé",
    contactTitle: "Besoin d'aide ? Appelez-nous",
    contactHint: "Report, annulation ou météo — appelez ou écrivez à tout moment.",
    guideTitle: "À lire avant de voler",
    guideHint: "Trois lectures courtes pour bien vous préparer.",
    guidePreNotice: "Notes avant le vol",
    guideSafety: "Le parapente est-il sûr ?",
    guideSteps: "Comment se déroule un vol",
    readyTitle: "Prêt pour le décollage ! 🪂",
    flightAtLabel: "Votre vol",
    passengerLabel: "Passager",
    andOthers: (n: number) => `et ${n} de plus`,
    funLines: [
      "Mettez votre plus belle tenue — là-haut, l'appareil photo ne ment jamais ! 📸",
      "Respirez un grand coup. Dans quelques minutes, toute la vallée sera sous vos pieds. ☁️",
      "Préparez-vous à l'un des moments les plus mémorables de votre vie. 🌄",
      "N'oubliez pas de sourire — le pilote a déjà sorti la GoPro ! 😄",
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
    confirmedBadge: "Подтверждено",
    contactTitle: "Нужна помощь? Звоните",
    contactHint: "Перенос, отмена или вопрос о погоде — звоните или пишите в любое время.",
    guideTitle: "Прочитайте перед полётом",
    guideHint: "Три короткие статьи, чтобы всё прошло гладко.",
    guidePreNotice: "Памятка перед полётом",
    guideSafety: "Безопасен ли параплан?",
    guideSteps: "Как проходит полёт",
    readyTitle: "Вы готовы к взлёту! 🪂",
    flightAtLabel: "Ваш полёт",
    passengerLabel: "Пассажир",
    andOthers: (n: number) => `и ещё ${n}`,
    funLines: [
      "Оденьтесь понаряднее — в небе камера не умеет врать! 📸",
      "Вдохните поглубже. Через пару минут вся долина будет под вашими ногами. ☁️",
      "Готовьтесь к одному из самых ярких впечатлений в жизни. 🌄",
      "Не забудьте улыбнуться — пилот уже достал GoPro! 😄",
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
    confirmedBadge: "पुष्ट",
    contactTitle: "मदद चाहिए? कॉल करें",
    contactHint: "तारीख़ बदलना, रद्द करना या मौसम — कभी भी कॉल या मैसेज करें।",
    guideTitle: "उड़ान से पहले पढ़ें",
    guideHint: "तीन छोटी जानकारियाँ जो तैयारी आसान बनाती हैं।",
    guidePreNotice: "उड़ान से पहले की बातें",
    guideSafety: "क्या पैराग्लाइडिंग सुरक्षित है?",
    guideSteps: "उड़ान कैसे होती है",
    readyTitle: "आप उड़ान के लिए तैयार हैं! 🪂",
    flightAtLabel: "आपकी उड़ान",
    passengerLabel: "यात्री",
    andOthers: (n: number) => `और ${n} लोग`,
    funLines: [
      "अच्छे कपड़े पहनिए — ऊपर कैमरा झूठ नहीं बोलता! 📸",
      "एक गहरी साँस लीजिए। कुछ ही मिनटों में पूरी घाटी आपके पैरों के नीचे होगी। ☁️",
      "ज़िंदगी के सबसे यादगार पलों में से एक के लिए तैयार हो जाइए। 🌄",
      "मुस्कुराना न भूलें — पायलट ने GoPro निकाल ली है! 😄",
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
    confirmedBadge: "已确认",
    contactTitle: "需要帮助？请致电",
    contactHint: "改期、取消或询问天气——随时来电或留言。",
    guideTitle: "飞行前请先阅读",
    guideHint: "三篇简短内容，帮您做好准备。",
    guidePreNotice: "飞行前须知",
    guideSafety: "滑翔伞安全吗？",
    guideSteps: "一次飞行是怎样进行的",
    readyTitle: "准备起飞啦！🪂",
    flightAtLabel: "您的飞行",
    passengerLabel: "飞行乘客",
    andOthers: (n: number) => `等 ${n} 位`,
    funLines: [
      "穿得美一点——在天上，镜头可不会骗人！📸",
      "深呼吸。再过几分钟，整片山谷就在您脚下。☁️",
      "准备好迎接此生难忘的一段时光吧。🌄",
      "别忘了笑——飞行员已经把 GoPro 准备好了！😄",
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

  /**
   * LUÔN tính bằng VNĐ, kể cả khi khách xem bằng tiếng Anh.
   *
   * computePriceByLang(..., lang) trả kết quả bằng USD cho mọi ngôn ngữ khác
   * tiếng Việt, nên vé của khách nước ngoài in giá bằng đô — sai, vì khách
   * thanh toán bằng tiền Việt tại điểm bay. USD chỉ là số quy đổi tham khảo.
   */
  const priceParams = {
    location: bookingData.location,
    guestsCount: bookingData.guestsCount,
    dateISO: bookingData.dateISO,
    packageKey: bookingData.packageKey,
    flightTypeKey: bookingData.flightTypeKey,
    addons: bookingData.addons,
    addonsQty: bookingData.addonsQty,
  };

  const totals = computePriceByLang(priceParams, "vi");
  const totalsUSD = computePriceByLang(priceParams, "en");

  /** Tên khách bay chính + số khách còn lại, để chào đích danh. */
  const heroPassenger = useMemo(() => {
    const guests = (bookingData.guests ?? []) as Array<{ fullName?: string }>;
    const first =
      guests[0]?.fullName?.trim() ||
      (bookingData as any)?.contact?.contactName?.trim() ||
      (bookingData as any)?.contact?.fullName?.trim() ||
      "";
    const others = Math.max(0, guests.length - 1);
    return { first, others };
  }, [bookingData]);

  /** "15/09/2026 · 07:30 · Đèo Khau Phạ" */
  const heroFlight = useMemo(() => {
    const cfg = bookingData.location
      ? (LOCATIONS as any)[bookingData.location]
      : null;
    const place = cfg?.name?.[lang] ?? cfg?.name?.vi ?? "";
    const raw = bookingData.dateISO || "";
    const d = raw ? new Date(raw) : null;
    const date =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : raw;

    return [date, bookingData.timeSlot, place].filter(Boolean).join(" · ");
  }, [bookingData, lang]);

  /**
   * Câu dặn vui, đổi theo từng booking cho đỡ nhàm nhưng vẫn cố định với một
   * booking (dùng mã đặt chỗ làm mốc, không dùng random để lần nào mở lại vé
   * cũng ra đúng câu đó).
   */
  const funLine = useMemo(() => {
    const seedText = String(
      bookingResult?.bookingCode || bookingData.dateISO || "mbl",
    );
    let seed = 0;
    for (let i = 0; i < seedText.length; i += 1) {
      seed = (seed + seedText.charCodeAt(i)) % 997;
    }
    return ui.funLines[seed % ui.funLines.length];
  }, [bookingResult?.bookingCode, bookingData.dateISO, ui.funLines]);

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
        {/* Đầu trang chúc mừng: chào đích danh khách, nhắc luôn giờ bay và
            điểm bay — ba thứ khách muốn biết ngay khi đặt xong. */}
        <div className="border-b border-[#DCE7F3] bg-gradient-to-br from-[#16A34A] to-[#0E7A38] px-4 py-5 text-white md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-2xl font-black leading-tight md:text-3xl">
                {ui.readyTitle}
              </h3>
              <p className="mt-1 max-w-3xl text-sm text-white/90">
                {ui.subtitle}
              </p>
            </div>

            <div className="cta-btn shrink-0 rounded-full border border-white/40 bg-white/20 px-4 py-2 text-base font-bold">
              ✓ {ui.confirmedBadge}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                {ui.flightAtLabel}
              </div>
              <div className="mt-0.5 text-base font-bold">
                {heroFlight || "—"}
              </div>
            </div>

            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                {ui.passengerLabel}
              </div>
              <div className="mt-0.5 text-base font-bold">
                {heroPassenger.first || "—"}
                {heroPassenger.others > 0 ? (
                  <span className="font-medium text-white/85">
                    {" "}
                    {ui.andOthers(heroPassenger.others)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 bg-[#F5F7FA] p-4 md:p-6">
          {/* Một câu dặn vui, cỡ chữ to, để bước cuối không chỉ toàn thủ tục */}
          <div className="rounded-xl border-2 border-dashed border-[#FF5E1F] bg-[#FFF4ED] px-4 py-3 text-center">
            <p className="text-base font-bold leading-snug text-[#C2410C] md:text-lg">
              {funLine}
            </p>
          </div>

          <div className="rounded-lg border border-[#B9DDFB] bg-[#EAF4FE] px-4 py-3 text-sm text-[#355166]">
            {ui.note}
          </div>

          {/* Căn giữa, ngay trên tấm vé — đây là việc khách cần làm đầu tiên
              sau khi đặt xong nên không để nép ở góc phải. */}
          <div className="flex justify-center">
            <button
              onClick={downloadImage}
              disabled={downloadingIMG}
              className="cta-btn inline-flex h-12 items-center gap-2 rounded-full bg-red-600 px-8 text-base font-bold text-white shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-red-700 disabled:translate-y-0 disabled:bg-red-300 disabled:shadow-none"
            >
              ⬇️ {downloadingIMG ? t.buttons.generatingImage : t.buttons.downloadImage}
            </button>
          </div>

          <div className="mx-auto w-fit max-w-full overflow-x-auto rounded-xl border border-[#DCE7F3] bg-white">
            {/* Vùng html2canvas chụp. Trước đây div này rộng bằng cả khung
                chứa (~900px) trong khi vé chỉ 700px, nên ảnh PNG thừa hai dải
                trắng hai bên mà trên/dưới lại sát viền.
                w-fit ôm sát vé, padding dọc 20 / ngang 14 cho ảnh có lề đều. */}
            <div
              ref={ticketRef}
              style={{
                background: "#ffffff",
                width: "fit-content",
                margin: "0 auto",
                padding: "20px 14px",
              }}
            >
              <BookingTicket
                booking={bookingData}
                bookingResult={bookingResult}
                totals={totals}
                totalsUSD={totalsUSD}
                lang={lang}
              />
            </div>
          </div>

          {/* Khối liên hệ: trước đây hotline chỉ là dòng chữ 11px ở chân vé,
              khách khó thấy đúng lúc cần nhất. Nay là hai nút bấm gọi được
              ngay trên điện thoại. */}
          <section className="rounded-xl border-2 border-[#FF5E1F] bg-white p-4 shadow-md">
            <div className="text-base font-bold text-[#FF5E1F] md:text-lg">
              {ui.contactTitle}
            </div>
            <p className="mt-1 text-sm text-[#5B6B7A]">{ui.contactHint}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {HOTLINES.map((tel) => (
                <a
                  key={tel}
                  href={`tel:${tel.replace(/\D/g, "")}`}
                  className="cta-btn flex h-12 items-center justify-center rounded-xl bg-[#FF5E1F] text-lg font-bold tracking-wide text-white shadow-md transition hover:bg-[#E14E12]"
                >
                  {tel}
                </a>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-semibold text-[#5B6B7A]">
              <span>Zalo</span>
              <span>·</span>
              <span>WhatsApp</span>
              <span>·</span>
              <Link href="/" className="text-[#0194F3] underline">
                mebayluon.com
              </Link>
            </div>
          </section>

          {/* Dẫn khách sang các bài chuẩn bị trước chuyến bay */}
          <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
            <div className="text-base font-bold text-[#1C2930]">
              {ui.guideTitle}
            </div>
            <p className="mt-1 text-sm text-[#5B6B7A]">{ui.guideHint}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { href: "/pre-notice", label: ui.guidePreNotice },
                { href: "/blog/trai-nghiem-bay-du-luon-mebayluon", label: ui.guideSteps },
                { href: "/blog/du-luon-co-an-toan-khong", label: ui.guideSafety },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="cta-btn flex min-h-12 items-center justify-center rounded-xl border border-[#B9DDFB] bg-[#EAF4FE] px-3 py-2 text-center text-sm font-semibold text-[#0B5FA5] transition hover:bg-[#D8ECFD]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

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

      {/* Nút này trước đây là viền xám chữ xám nép ở góc phải, gần như tàng
          hình. Đưa ra giữa và cho nền accent để khách muốn đặt thêm chuyến
          nữa thì thấy ngay. */}
      <div className="flex justify-center">
        <button
          onClick={reset}
          className="cta-btn inline-flex h-14 items-center gap-2 rounded-full bg-accent px-10 text-lg font-bold text-white shadow-xl shadow-black/20 ring-1 ring-white/40 transition-all hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-2xl"
        >
          🪂 {t.buttons.startOver}
        </button>
      </div>
    </div>
  );
}
