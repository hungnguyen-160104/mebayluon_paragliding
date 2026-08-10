"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { computePriceByLang, LOCATIONS } from "@/lib/booking/calculate-price";
import { spotPageForBooking } from "@/lib/booking/spot-to-location";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";
import BookingTicket from "@/components/booking/BookingTicket";
import Link from "next/link";
import Image from "next/image";
import { CONTACT_WHATSAPP } from "@/lib/contact-channels";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

/** Hai số hotline, hiển thị thành nút bấm gọi được trên điện thoại. */
const HOTLINES = ["0964.073.555", "0385.907.789"];

/**
 * Kênh nhắn tin — dùng lại đúng logo và đường dẫn của nút mạng xã hội nổi
 * (components/floating-social.tsx) để cả site chỉ có một nguồn.
 */
const CHAT_CHANNELS = [
  { name: "Zalo", icon: "/social_icons/zalo.png", url: "https://zalo.me/0964073555" },
  {
    name: "WhatsApp",
    icon: "/social_icons/whatsapp.jpg",
    url: CONTACT_WHATSAPP,
  },
];

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    subtitle: string;
    imageFail: string;
    note: string;
    preFlightNotesTitle: string;
    preFlightNotes: string[];
    contactTitle: string;
    contactHint: string;
    guideTitle: string;
    guideHint: string;
    guidePreNotice: string;
    guideSafety: string;
    guideSteps: string;
    spotMore: string;
    readyTitle: string;
    flightAtLabel: string;
    passengerLabel: string;
    andOthers: (n: number) => string;
    funLines: string[];
  }
> = {
  vi: {
    title: "Đặt lịch thành công — Sẵn sàng bay!",
    subtitle:
      "Vui lòng tải vé đặt bay ngay bên dưới — Chúng tôi sẽ sớm liên hệ trực tiếp với bạn!",
    imageFail: "Không tạo được ảnh. Vui lòng thử lại hoặc chụp màn hình.",
    note: "Đội ngũ sẽ liên hệ xác nhận lịch bay, thời tiết và các dịch vụ đi kèm trong thời gian sớm nhất.",
    preFlightNotesTitle: "Thông tin lưu ý trước khi bay",
    preFlightNotes: [
      "Mang theo điện thoại và chừa sẵn khoảng 4GB trống để chép ảnh & video chuyến bay ngay tại điểm bay.",
      "Lịch bay có thể thay đổi tùy theo điều kiện thời tiết thực tế.",
      "Vui lòng có mặt tại điểm hẹn trước giờ bay ít nhất 30 phút.",
      "Mang theo giấy tờ tùy thân và xác nhận đặt chỗ khi đến.",
      "Trang phục gọn gàng, giày thể thao; không mang theo vật sắc nhọn.",
      "Nếu có vấn đề sức khỏe hoặc cần hỗ trợ đặc biệt, vui lòng thông báo trước.",
      "Liên hệ hotline nếu cần thay đổi hoặc hủy lịch bay.",
    ],
    contactTitle: "Cần hỗ trợ? Gọi ngay",
    contactHint: "Đổi lịch, huỷ bay hay hỏi thời tiết — gọi hoặc nhắn bất cứ lúc nào.",
    guideTitle: "Đọc trước khi đi bay",
    guideHint: "Ba bài ngắn giúp bạn chuẩn bị đúng và bay thoải mái hơn.",
    guidePreNotice: "Lưu ý trước chuyến bay",
    guideSafety: "Dù lượn có an toàn không?",
    guideSteps: "Các bước khi đi bay dù lượn",
    spotMore: "Xem thêm thông tin về điểm bay",
    readyTitle: "Đặt lịch thành công — Sẵn sàng bay!",
    flightAtLabel: "Giờ lên dù",
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
    title: "Booking confirmed — ready to fly!",
    subtitle:
      "Please download your ticket below — we will contact you directly very soon!",
    imageFail: "Failed to generate image. Please try again or take a screenshot.",
    note: "Our team will contact you soon to confirm schedule, weather, and selected services.",
    preFlightNotesTitle: "Pre-flight information",
    preFlightNotes: [
      "Bring your phone with about 4GB free so we can copy your flight photos and video on the spot.",
      "Flight schedule may change depending on actual weather conditions.",
      "Please arrive at the meeting point at least 30 minutes before flight time.",
      "Bring ID and booking confirmation when you arrive.",
      "Wear comfortable clothes and sport shoes; do not bring sharp objects.",
      "If you have health issues or need special assistance, please inform us in advance.",
      "Contact our hotline to reschedule or cancel your flight.",
    ],
    contactTitle: "Need help? Call us",
    contactHint: "Reschedule, cancel or ask about the weather — call or message any time.",
    guideTitle: "Read before you fly",
    guideHint: "Three short reads to help you prepare and enjoy the flight.",
    guidePreNotice: "Pre-flight notes",
    guideSafety: "Is paragliding safe?",
    guideSteps: "How a paragliding flight goes",
    spotMore: "More about this flying site",
    readyTitle: "Booking confirmed — ready to fly!",
    flightAtLabel: "Boarding time",
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
    title: "Réservation confirmée — prêts à voler !",
    subtitle:
      "Merci de télécharger votre billet ci-dessous — nous vous contacterons très bientôt !",
    imageFail: "Impossible de générer l'image. Veuillez réessayer.",
    note: "Notre équipe vous contactera rapidement pour confirmer l'horaire, la météo et les services choisis.",
    preFlightNotesTitle: "Informations avant le vol",
    preFlightNotes: [
      "Apportez votre téléphone avec environ 4 Go libres pour copier vos photos et vidéos de vol sur place.",
      "L'horaire du vol peut changer en fonction des conditions météorologiques.",
      "Veuillez arriver au point de rendez-vous au moins 30 minutes avant le vol.",
      "Apportez une pièce d'identité et la confirmation de réservation.",
      "Portez des vêtements confortables et des chaussures de sport ; pas d'objets tranchants.",
      "Si vous avez des problèmes de santé ou besoin d'une assistance particulière, informez-nous à l'avance.",
      "Contactez notre hotline pour modifier ou annuler votre vol.",
    ],
    contactTitle: "Besoin d'aide ? Appelez-nous",
    contactHint: "Report, annulation ou météo — appelez ou écrivez à tout moment.",
    guideTitle: "À lire avant de voler",
    guideHint: "Trois lectures courtes pour bien vous préparer.",
    guidePreNotice: "Notes avant le vol",
    guideSafety: "Le parapente est-il sûr ?",
    guideSteps: "Comment se déroule un vol",
    spotMore: "En savoir plus sur le site de vol",
    readyTitle: "Réservation confirmée — prêts à voler !",
    flightAtLabel: "Heure d'embarquement",
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
    title: "Бронирование принято — готовы к полёту!",
    subtitle:
      "Пожалуйста, скачайте билет ниже — мы свяжемся с вами в ближайшее время!",
    imageFail: "Не удалось создать изображение. Попробуйте ещё раз.",
    note: "Наша команда скоро свяжется с вами для подтверждения времени, погоды и выбранных услуг.",
    preFlightNotesTitle: "Информация перед полётом",
    preFlightNotes: [
      "Возьмите телефон и оставьте около 4 ГБ свободного места — фото и видео полёта скопируем прямо на площадке.",
      "Расписание полёта может измениться в зависимости от погодных условий.",
      "Пожалуйста, прибудьте к месту встречи минимум за 30 минут до вылета.",
      "Возьмите удостоверение личности и подтверждение бронирования.",
      "Наденьте удобную одежду и спортивную обувь; не берите острые предметы.",
      "Если у вас есть проблемы со здоровьем или нужна особая помощь, сообщите заранее.",
      "Свяжитесь с нашей горячей линией для изменения или отмены полёта.",
    ],
    contactTitle: "Нужна помощь? Звоните",
    contactHint: "Перенос, отмена или вопрос о погоде — звоните или пишите в любое время.",
    guideTitle: "Прочитайте перед полётом",
    guideHint: "Три короткие статьи, чтобы всё прошло гладко.",
    guidePreNotice: "Памятка перед полётом",
    guideSafety: "Безопасен ли параплан?",
    guideSteps: "Как проходит полёт",
    spotMore: "Подробнее о площадке",
    readyTitle: "Бронирование принято — готовы к полёту!",
    flightAtLabel: "Время посадки",
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
    title: "बुकिंग सफल — उड़ान के लिए तैयार!",
    subtitle:
      "कृपया नीचे से अपना टिकट डाउनलोड करें — हम जल्द ही आपसे सीधे संपर्क करेंगे!",
    imageFail: "इमेज बनाई नहीं जा सकी। कृपया फिर से प्रयास करें।",
    note: "हमारी टीम जल्द ही समय, मौसम और चुनी गई सेवाओं की पुष्टि के लिए आपसे संपर्क करेगी।",
    preFlightNotesTitle: "उड़ान से पहले की जानकारी",
    preFlightNotes: [
      "फ़ोन साथ लाएँ और लगभग 4GB जगह खाली रखें — उड़ान की फ़ोटो व वीडियो वहीं कॉपी कर दी जाएगी।",
      "मौसम की स्थिति के अनुसार उड़ान का समय बदल सकता है।",
      "कृपया उड़ान से कम से कम 30 मिनट पहले मिलन स्थल पर पहुँचें।",
      "आईडी और बुकिंग पुष्टि साथ लाएं।",
      "आरामदायक कपड़े और स्पोर्ट्स शूज पहनें; तेज धार वाली वस्तुएं न लाएं।",
      "यदि स्वास्थ्य संबंधी कोई समस्या है या विशेष सहायता चाहिए, तो पहले से सूचित करें।",
      "उड़ान में बदलाव या रद्द करने के लिए हमारी हॉटलाइन से संपर्क करें।",
    ],
    contactTitle: "मदद चाहिए? कॉल करें",
    contactHint: "तारीख़ बदलना, रद्द करना या मौसम — कभी भी कॉल या मैसेज करें।",
    guideTitle: "उड़ान से पहले पढ़ें",
    guideHint: "तीन छोटी जानकारियाँ जो तैयारी आसान बनाती हैं।",
    guidePreNotice: "उड़ान से पहले की बातें",
    guideSafety: "क्या पैराग्लाइडिंग सुरक्षित है?",
    guideSteps: "उड़ान कैसे होती है",
    spotMore: "उड़ान स्थल के बारे में और जानें",
    readyTitle: "बुकिंग सफल — उड़ान के लिए तैयार!",
    flightAtLabel: "बोर्डिंग समय",
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
    title: "预订成功——准备起飞！",
    subtitle:
      "请在下方下载您的电子票——我们会尽快直接与您联系！",
    imageFail: "无法生成图片。请重试或直接截图。",
    note: "团队会尽快联系您确认飞行时间、天气和已选服务。",
    preFlightNotesTitle: "飞行前须知",
    preFlightNotes: [
      "请带上手机并预留约 4GB 空间，飞行照片和视频可当场拷贝给您。",
      "飞行时间可能根据实际天气情况调整。",
      "请至少提前30分钟到达集合点。",
      "请携带身份证件和预订确认信息。",
      "请穿着舒适的衣物和运动鞋；请勿携带尖锐物品。",
      "如有健康问题或需要特殊协助，请提前告知。",
      "如需更改或取消航班，请联系客服热线。",
    ],
    contactTitle: "需要帮助？请致电",
    contactHint: "改期、取消或询问天气——随时来电或留言。",
    guideTitle: "飞行前请先阅读",
    guideHint: "三篇简短内容，帮您做好准备。",
    guidePreNotice: "飞行前须知",
    guideSafety: "滑翔伞安全吗？",
    guideSteps: "一次飞行是怎样进行的",
    spotMore: "了解更多飞行点信息",
    readyTitle: "预订成功——准备起飞！",
    flightAtLabel: "登伞时间",
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

  /** Trang giới thiệu điểm bay khách vừa đặt (dù máy Khau Phạ -> /ppg). */
  const spotPage = useMemo(() => {
    const href = spotPageForBooking(
      bookingData.location,
      bookingData.flightTypeKey,
    );
    if (!href) return null;

    const cfg = bookingData.location
      ? (LOCATIONS as any)[bookingData.location]
      : null;
    const name = cfg?.name?.[lang] ?? cfg?.name?.vi ?? "";
    return { href, name };
  }, [bookingData.location, bookingData.flightTypeKey, lang]);

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
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const baseFileName = useMemo(() => {
    const loc = bookingData.location || "booking";
    const pkg = bookingData.packageKey || "default";
    const flight = bookingData.flightTypeKey || "flight";
    const date = (bookingData.dateISO || "date").replaceAll("/", "-");
    return `ticket-${loc}-${pkg}-${flight}-${date}`;
  }, [bookingData.location, bookingData.packageKey, bookingData.flightTypeKey, bookingData.dateISO]);

  /**
   * Chụp tấm vé thành canvas. Dùng chung cho cả tải ảnh lẫn tải PDF, để hai
   * kiểu tệp không bao giờ lệch nhau về nội dung hay cách xử lý CSS.
   */
  const renderTicketCanvas = useCallback(async () => {
    if (!ticketRef.current) return null;

    const { default: html2canvas } = await import("html2canvas");

    return html2canvas(ticketRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      onclone: (doc) => {
        doc
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((el) => el.remove());

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
  }, []);

  /**
   * Tải vé dạng PDF — trang PDF cắt đúng theo tấm vé, không nhét vào khổ A4.
   *
   * Trước đây trang luôn là A4 dọc, vé thì cao hơn tỉ lệ A4 nên phải co lại
   * cho vừa chiều cao; kết quả là vé bé tí ở giữa với hai dải trắng hai bên.
   * Nay trang PDF lấy đúng tỉ lệ ảnh vé, giống hệt bản PNG. Bề ngang vẫn để
   * 210mm bằng A4 để in ra giấy A4 là vừa khít chiều ngang, phần thừa chỉ
   * rơi vào chiều dài.
   */
  const downloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const canvas = await renderTicketCanvas();
      if (!canvas) return;

      const { default: jsPDF } = await import("jspdf");

      const width = 210;
      const height = (width * canvas.height) / canvas.width;

      const pdf = new jsPDF({
        orientation: height >= width ? "portrait" : "landscape",
        unit: "mm",
        format: [width, height],
      });

      // Đọc lại kích thước thật: jsPDF tự hoán đổi rộng/cao theo orientation.
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        pageW,
        pageH,
      );
      pdf.save(`${baseFileName}.pdf`);
    } catch (err) {
      console.error(err);
      alert(ui.imageFail);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const downloadImage = async () => {
    if (!ticketRef.current) return;

    setDownloadingIMG(true);
    try {
      const canvas = await renderTicketCanvas();
      if (!canvas) return;

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
          {/* Căn giữa, bỏ huy hiệu "Đã xác nhận" — dải xanh và dòng chữ đã
              nói rõ booking thành công, thêm huy hiệu chỉ làm loãng. */}
          <div className="text-center">
            <div className="text-4xl md:text-5xl">🪂</div>
            {/* Đổ bóng để chữ trắng nổi hẳn trên nền xanh chuyển sắc */}
            <h3
              className="mt-2 text-2xl font-black leading-tight md:text-4xl"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.45)" }}
            >
              {ui.readyTitle}
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-base font-medium text-white/95 md:text-lg">
              {ui.subtitle}
            </p>
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

          <div className="rounded-lg border border-[#B9DDFB] bg-[#EAF4FE] px-4 py-3 text-center text-base font-bold text-[#1B4A6B]">
            {ui.note}
          </div>

          {spotPage ? (
            <div className="text-center">
              <Link
                href={spotPage.href}
                className="inline-flex items-center gap-2 text-base font-semibold text-[#0194F3] underline underline-offset-4 hover:text-[#0B6FC4]"
              >
                🔗 {ui.spotMore} {spotPage.name}
              </Link>
            </div>
          ) : null}

          {/* Căn giữa, ngay trên tấm vé — đây là việc khách cần làm đầu tiên
              sau khi đặt xong nên không để nép ở góc phải. */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={downloadImage}
              disabled={downloadingIMG || downloadingPDF}
              className="cta-btn inline-flex h-12 items-center gap-2 rounded-full bg-red-600 px-7 text-base font-bold text-white shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-red-700 disabled:translate-y-0 disabled:bg-red-300 disabled:shadow-none"
            >
              🖼️ {downloadingIMG ? t.buttons.generatingImage : t.buttons.downloadImage}
            </button>

            <button
              onClick={downloadPDF}
              disabled={downloadingIMG || downloadingPDF}
              className="cta-btn inline-flex h-12 items-center gap-2 rounded-full border-2 border-red-600 bg-white px-7 text-base font-bold text-red-600 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-red-50 disabled:translate-y-0 disabled:border-red-200 disabled:text-red-300 disabled:shadow-none"
            >
              📄 {downloadingPDF ? t.buttons.generatingPDF : t.buttons.downloadPDF}
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
          {/* Căn giữa cả khối. Nút gọi hạ xuống cỡ vừa và dùng viền thay vì
              nền cam đặc — trước đây hai nút cam to chiếm hết sự chú ý, lấn
              cả nút tải vé vốn mới là việc khách cần làm trước. */}
          <section className="rounded-xl border-2 border-[#FF5E1F] bg-white p-4 text-center shadow-md">
            <div className="text-base font-bold text-[#FF5E1F] md:text-lg">
              {ui.contactTitle}
            </div>
            <p className="mx-auto mt-1 max-w-xl text-sm text-[#5B6B7A]">
              {ui.contactHint}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {HOTLINES.map((tel) => (
                <a
                  key={tel}
                  href={`tel:${tel.replace(/\D/g, "")}`}
                  className="cta-btn inline-flex h-10 items-center gap-2 rounded-lg border border-[#FF5E1F] bg-[#FFF4ED] px-4 text-sm font-bold text-[#C2410C] transition hover:bg-[#FFE8DA]"
                >
                  📞 {tel}
                </a>
              ))}
            </div>

            {/* Zalo / WhatsApp mở thẳng khung chat, không bắt khách tự lưu số */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {CHAT_CHANNELS.map((c) => (
                <a
                  key={c.name}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-btn inline-flex h-10 items-center gap-2 rounded-lg border border-[#DCE7F3] bg-white px-4 text-sm font-semibold text-[#1C2930] transition hover:bg-[#F5F7FA]"
                >
                  <Image
                    src={c.icon}
                    alt={c.name}
                    width={20}
                    height={20}
                    className="rounded"
                  />
                  {c.name}
                </a>
              ))}
            </div>

            <div className="mt-3 text-sm">
              <Link href="/" className="font-medium text-[#0194F3] underline">
                www.mebayluon.com
              </Link>
            </div>
          </section>

          {/* Dẫn khách sang các bài chuẩn bị trước chuyến bay */}
          <section className="rounded-xl border border-[#DCE7F3] bg-white p-4 text-center">
            <div className="text-base font-bold text-[#1C2930]">
              {ui.guideTitle}
            </div>
            <p className="mx-auto mt-1 max-w-xl text-sm text-[#5B6B7A]">
              {ui.guideHint}
            </p>

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
