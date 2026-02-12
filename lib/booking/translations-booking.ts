"use client";

import { useMemo } from "react";
import { useLanguage } from "@/contexts/language-context";

export type LangCode = "vi" | "en" | "fr" | "ru";
export const BIGC_THANG_LONG_MAP =
  "https://maps.app.goo.gl/3vB2qYuThwBASQZj8";

type Dict = {
  pageTitle: string;
  pageSubtitle: string;
  stepNames: string[];
  buttons: {
    next: string;
    back: string;
    confirm: string;
    processing: string;
    startOver: string;
    viewMap: string;
    downloadImage: string;
    downloadPDF: string;
    generatingImage: string;
    generatingPDF: string;

  };
  labels: {
    guestsCount: string;
    addonsTitle: string;
    addonsPromptSelectLocation: string;
    notAvailableHere: string;
    notIncluded: string;

    date: string;
    timeSlot: string;
    phone: string;
    email: string;
    pickup: string;
    pickupFixed: string;
    specialRequest: string;

    fullName: string;
    dob: string;
    gender: string;
    idNumber: string;
    weightKg: string;
    nationality: string;

    contactInfo: string;
    passengerList: string;
    termsText: string;
    viewTerms: string;

    priceSummary: string;
    location: string;
    numGuests: string;
    basePricePerGuest: string;
    addonSurcharge: (k: string) => string;
    groupDiscount: string;
    provisionalTotal: string;
  };
  placeholders: {
    phone: string;
    email: string;
    pickup: string;
    specialRequest: string;
    timeSlotPlaceholder: string;
  };
  messages: {
    selectLocationToSeeDetail: string;
    groupPromoAuto: string;
    pickupNoteSapa: string;
    pickupNoteHN: string;

    successTitle: string;
    successBody: string;
    preflightTitle: string;
    preflightNotes: string[];

    errors: {
      dateInPast: string;
      dobInFuture: string;
      dobTooYoung: string;
      requiredField: string;
      weightInvalid: string;
    };
  };
};

export const bookingTranslations: Record<LangCode, Dict> = {
  vi: {
    pageTitle: "Đặt bay",
    pageSubtitle:
      "Điều hướng 5 bước • Lưu ý: thông tin & giá có thể thay đổi theo thời gian.",
    stepNames: ["Chọn dịch vụ", "Ngày & liên hệ", "Khách bay", "Xác nhận", "Hoàn tất"],
    buttons: {
      next: "Tiếp tục",
      back: "Quay lại",
      confirm: "Xác nhận",
      processing: "Đang xử lý...",
      startOver: "Đặt chuyến khác",
      viewMap: "Xem bản đồ",
      downloadImage: "Tải ảnh",
downloadPDF: "Tải PDF",
generatingImage: "Đang tạo ảnh...",
generatingPDF: "Đang tạo PDF...",

    },
    labels: {
      guestsCount: "Số lượng người bay",
      addonsTitle: "Dịch vụ tuỳ chọn",
      addonsPromptSelectLocation: "Vui lòng chọn điểm bay để xem các dịch vụ khả dụng.",
      notAvailableHere: "Không khả dụng tại điểm bay này",
      notIncluded: "Không bao gồm:",

      date: "Ngày bay",
      timeSlot: "Khung giờ",
      phone: "Số điện thoại liên hệ",
      email: "Email liên hệ",
      pickup: "Điểm đón",
      pickupFixed:
        "Điểm đón cố định: BigC Thăng Long (Khung giờ đón: 8h – 9h sáng)",
      specialRequest: "Yêu cầu đặc biệt",

      fullName: "Họ và tên (passport)",
      dob: "Ngày sinh",
      gender: "Giới tính",
      idNumber: "Số CCCD/Passport",
      weightKg: "Cân nặng (kg)",
      nationality: "Quốc tịch",

      contactInfo: "Thông tin liên hệ",
      passengerList: "Danh sách khách",
      termsText:
        "Tôi đã đọc và đồng ý với mọi điều khoản dịch vụ. Tôi xác nhận thông tin đặt bay.",
      viewTerms: "Xem điều khoản",

      priceSummary: "Tóm tắt chi phí",
      location: "Điểm bay",
      numGuests: "Số khách",
      basePricePerGuest: "Giá cơ bản / khách",
      addonSurcharge: (k) => `-${k}`,
      groupDiscount: "Giảm theo nhóm",
      provisionalTotal: "Tổng tạm tính",
    },
    placeholders: {
      phone: "Ví dụ: 0912345678",
      email: "ten@gmail.com",
      pickup: "Nhập địa chỉ khách sạn / điểm đón",
      specialRequest: "Ví dụ: yêu cầu hỗ trợ quay phim, cân nặng, dị ứng...",
      timeSlotPlaceholder: "Chọn khung giờ",
    },
    messages: {
      selectLocationToSeeDetail:
        "Vui lòng chọn điểm bay để xem mô tả chi tiết",
      groupPromoAuto:
        "Khuyến mãi nhóm áp dụng tự động theo số lượng khách",
      pickupNoteSapa:
        "Xe đón trả tại khách sạn (Trung tâm Sapa, Lao Chải, Tả Van)",
      pickupNoteHN:
        "Xe đón trả 2 chiều từ BigC Thăng Long (Hà Nội)",
      successTitle: "HOÀN TẤT",
      successBody:
        "Cảm ơn đặt chỗ của bạn! Chúng tôi sẽ liên hệ trực tiếp để xác nhận thông tin đặt bay, vui lòng để ý điện thoại. Nếu cần gấp, vui lòng chủ động liên hệ hotline 0964.073.555 - 097.970.2812 (Zalo, WhatsApp, Telegram).",
      preflightTitle: "Lưu ý trước chuyến bay:",
      preflightNotes: [
        "Có mặt tại điểm bay trước 30 phút để làm thủ tục Check-in.",
        "Trang phục: nên đi giày thể thao; không đi giày cao gót; quần áo dài tay màu sắc sặc sỡ; có thể đeo kính; mang theo điện thoại có sẵn ~4GB bộ nhớ trống để nhận ảnh/video.",
        "Toạ độ điểm bay:",
      ],
      errors: {
        dateInPast:
          "Ngày bay không được ở quá khứ. Vui lòng chọn từ ngày mai trở đi.",
        dobInFuture: "Ngày sinh không được ở tương lai.",
        dobTooYoung: "Ngày sinh không hợp lệ (không được trong năm hiện tại).",
        requiredField: "Trường này là bắt buộc.",
        weightInvalid: "Cân nặng không hợp lệ.",
      },
    },
  },

  en: {
    pageTitle: "Book your flight",
    pageSubtitle:
      "5-step flow • Note: information & prices may change over time.",
    stepNames: ["Select", "Date & Contact", "Passengers", "Review", "Done"],
    buttons: {
      next: "Next",
      back: "Back",
      confirm: "Confirm",
      processing: "Processing...",
      startOver: "Book another",
      viewMap: "View map",
      downloadImage: "Download image",
downloadPDF: "Download PDF",
generatingImage: "Generating image...",
generatingPDF: "Generating PDF...",

    },
    labels: {
      guestsCount: "Number of passengers",
      addonsTitle: "Optional services",
      addonsPromptSelectLocation:
        "Please select a location to see available services.",
      notAvailableHere: "Not available at this location",
      notIncluded: "Not included:",

      date: "Flight date",
      timeSlot: "Time slot",
      phone: "Phone",
      email: "Email",
      pickup: "Pickup point",
      pickupFixed: "Fixed pickup: BigC Thăng Long (8–9 AM)",
      specialRequest: "Special requests",

      fullName: "Full name (passport)",
      dob: "Date of birth",
      gender: "Gender",
      idNumber: "ID/Passport number",
      weightKg: "Weight (kg)",
      nationality: "Nationality",

      contactInfo: "Contact information",
      passengerList: "Passenger list",
      termsText:
        "I have read and agree to the terms of service. I confirm the booking details.",
      viewTerms: "View terms",

      priceSummary: "Price summary",
      location: "Location",
      numGuests: "Passengers",
      basePricePerGuest: "Base price / pax",
      addonSurcharge: (k) => `Surcharge ${k}`,
      groupDiscount: "Group discount",
      provisionalTotal: "Provisional total",
    },
    placeholders: {
      phone: "e.g. +84 912345678",
      email: "name@gmail.com",
      pickup: "Enter hotel address / pickup point",
      specialRequest: "e.g. filming help, weight, allergies…",
      timeSlotPlaceholder: "Select a time slot",
    },
    messages: {
      selectLocationToSeeDetail:
        "Please select a flight location to see details.",
      groupPromoAuto:
        "Group discount is automatically applied based on passenger count.",
      pickupNoteSapa:
        "Hotel pickup in Sapa center, Lao Chải, Tả Van.",
      pickupNoteHN:
        "Round-trip pickup from BigC Thăng Long (Hanoi).",
      successTitle: "COMPLETED",
      successBody:
        "Thank you for your booking! We will contact you to confirm the flight details.",
      preflightTitle: "Pre-flight notes",
      preflightNotes: [
        "Arrive at the launch site 30 minutes early for check-in.",
        "Outfit: sneakers recommended; avoid high heels; long-sleeve colorful outfit; glasses allowed; prepare ~4GB free storage for photo/video.",
        "Coordinates:",
      ],
      errors: {
        dateInPast:
          "Flight date cannot be in the past. Please pick from tomorrow onwards.",
        dobInFuture: "Date of birth cannot be in the future.",
        dobTooYoung: "Invalid date of birth (cannot be in the current year).",
        requiredField: "This field is required.",
        weightInvalid: "Invalid weight.",
      },
    },
  },

  fr: {
    pageTitle: "Réserver votre vol",
    pageSubtitle:
      "Processus en 5 étapes • Remarque : informations et prix susceptibles d’évoluer.",
    stepNames: ["Sélection", "Date & contact", "Passagers", "Validation", "Terminé"],
    buttons: {
      next: "Continuer",
      back: "Retour",
      confirm: "Confirmer",
      processing: "Traitement…",
      startOver: "Nouvelle réservation",
      viewMap: "Voir la carte",
      downloadImage: "Télécharger l’image",
downloadPDF: "Télécharger le PDF",
generatingImage: "Génération de l’image…",
generatingPDF: "Génération du PDF…",

    },
    labels: {
      guestsCount: "Nombre de passagers",
      addonsTitle: "Services optionnels",
      addonsPromptSelectLocation:
        "Veuillez choisir un site pour voir les services disponibles.",
      notAvailableHere: "Non disponible sur ce site",
      notIncluded: "Non inclus :",

      date: "Date de vol",
      timeSlot: "Créneau horaire",
      phone: "Téléphone",
      email: "E-mail",
      pickup: "Point de prise en charge",
      pickupFixed: "Ramassage fixe : BigC Thăng Long (8h–9h)",
      specialRequest: "Demandes particulières",

      fullName: "Nom complet (passeport)",
      dob: "Date de naissance",
      gender: "Sexe",
      idNumber: "N° Passeport/ID",
      weightKg: "Poids (kg)",
      nationality: "Nationalité",

      contactInfo: "Coordonnées",
      passengerList: "Liste des passagers",
      termsText:
        "J’ai lu et j’accepte les conditions d’utilisation. Je confirme les détails de la réservation.",
      viewTerms: "Voir les conditions",

      priceSummary: "Récapitulatif",
      location: "Site",
      numGuests: "Passagers",
      basePricePerGuest: "Tarif de base / pers",
      addonSurcharge: (k) => `Supplément ${k}`,
      groupDiscount: "Remise de groupe",
      provisionalTotal: "Total provisoire",
    },
    placeholders: {
      phone: "ex. +84 912345678",
      email: "nom@gmail.com",
      pickup: "Adresse de l’hôtel / point de prise en charge",
      specialRequest: "ex. aide vidéo, poids, allergies…",
      timeSlotPlaceholder: "Choisir un créneau",
    },
    messages: {
      selectLocationToSeeDetail:
        "Veuillez choisir un site de vol pour voir les détails.",
      groupPromoAuto:
        "La remise de groupe est appliquée automatiquement selon le nombre de passagers.",
      pickupNoteSapa:
        "Prise en charge à l’hôtel (centre de Sapa, Lao Chải, Tả Van).",
      pickupNoteHN:
        "Prise en charge aller‑retour depuis BigC Thăng Long (Hanoï).",
      successTitle: "TERMINÉ",
      successBody:
        "Merci pour votre réservation ! Nous vous contacterons pour confirmer les détails du vol.",
      preflightTitle: "Notes avant le vol",
      preflightNotes: [
        "Arrivez 30 minutes en avance pour l’enregistrement.",
        "Tenue : baskets, pas de talons ; manches longues colorées ; lunettes autorisées ; prévoyez ~4 Go libres pour photos/vidéos.",
        "Coordonnées :",
      ],
      errors: {
        dateInPast:
          "La date de vol ne peut pas être dans le passé. Choisissez à partir de demain.",
        dobInFuture: "La date de naissance ne peut pas être dans le futur.",
        dobTooYoung: "Date de naissance invalide (pas dans l’année en cours).",
        requiredField: "Champ requis.",
        weightInvalid: "Poids invalide.",
      },
    },
  },

  ru: {
    pageTitle: "Бронирование полёта",
    pageSubtitle:
      "5 шагов • Внимание: информация и цены могут меняться.",
    stepNames: ["Выбор", "Дата и контакт", "Пассажиры", "Подтверждение", "Готово"],
    buttons: {
      next: "Далее",
      back: "Назад",
      confirm: "Подтвердить",
      processing: "Обработка...",
      startOver: "Забронировать ещё",
      viewMap: "Открыть карту",
      downloadImage: "Скачать изображение",
downloadPDF: "Скачать PDF",
generatingImage: "Создание изображения…",
generatingPDF: "Создание PDF…",

    },
    labels: {
      guestsCount: "Количество пассажиров",
      addonsTitle: "Доп. услуги",
      addonsPromptSelectLocation:
        "Выберите локацию, чтобы увидеть доступные услуги.",
      notAvailableHere: "Недоступно для этой локации",
      notIncluded: "Не включено:",

      date: "Дата полёта",
      timeSlot: "Время",
      phone: "Телефон",
      email: "E-mail",
      pickup: "Место посадки",
      pickupFixed: "Фиксированная посадка: BigC Thăng Long (8:00–9:00)",
      specialRequest: "Особые пожелания",

      fullName: "ФИО (по паспорту)",
      dob: "Дата рождения",
      gender: "Пол",
      idNumber: "Номер паспорта/ID",
      weightKg: "Вес (кг)",
      nationality: "Гражданство",

      contactInfo: "Контактная информация",
      passengerList: "Список пассажиров",
      termsText:
        "Я прочитал(а) и согласен(на) с условиями. Подтверждаю детали бронирования.",
      viewTerms: "Условия",

      priceSummary: "Итоговая стоимость",
      location: "Локация",
      numGuests: "Пассажиры",
      basePricePerGuest: "Базовая цена / чел.",
      addonSurcharge: (k) => `Доплата ${k}`,
      groupDiscount: "Групповая скидка",
      provisionalTotal: "Предварительный итог",
    },
    placeholders: {
      phone: "напр. +84 912345678",
      email: "name@gmail.com",
      pickup: "Адрес отеля / место посадки",
      specialRequest: "напр. помощь со съемкой, вес, аллергии…",
      timeSlotPlaceholder: "Выберите время",
    },
    messages: {
      selectLocationToSeeDetail:
        "Выберите место полёта, чтобы увидеть подробности.",
      groupPromoAuto:
        "Групповая скидка применяется автоматически по числу пассажиров.",
      pickupNoteSapa:
        "Трансфер от отеля (центр Сапы, Лао Чай, Та Ван).",
      pickupNoteHN:
        "Трансфер туда‑обратно от BigC Thăng Long (Ханой).",
      successTitle: "ГОТОВО",
      successBody:
        "Спасибо за бронирование! Мы свяжемся с вами для подтверждения.",
      preflightTitle: "Памятка перед полётом",
      preflightNotes: [
        "Прибудьте на стартовую площадку за 30 минут до вылета.",
        "Одежда: кроссовки, не каблуки; яркая одежда с длинными рукавами; очки разрешены; подготовьте ~4 ГБ памяти.",
        "Координаты:",
      ],
      errors: {
        dateInPast:
          "Дата полёта не может быть в прошлом. Выберите завтрашний день или позже.",
        dobInFuture: "Дата рождения не может быть в будущем.",
        dobTooYoung: "Неверная дата рождения (не в текущем году).",
        requiredField: "Обязательное поле.",
        weightInvalid: "Недопустимый вес.",
      },
    },
  },
};

export function useBookingText() {
  const ctx: any = (useLanguage as any)?.() ?? {};
  const lang = (ctx?.lang ?? ctx?.language ?? "vi") as LangCode;
  const safeLang: LangCode = ["vi", "en", "fr", "ru"].includes(lang)
    ? (lang as LangCode)
    : "vi";
  return useMemo(() => bookingTranslations[safeLang], [safeLang]);
}

export function useLangCode(): LangCode {
  const ctx: any = (useLanguage as any)?.() ?? {};
  const lang = (ctx?.lang ?? ctx?.language ?? "vi") as LangCode;
  return ["vi", "en", "fr", "ru"].includes(lang) ? lang : "vi";
}
