"use client";

import { useMemo } from "react";
import { useLanguage } from "@/contexts/language-context";

export type LangCode = "vi" | "en" | "fr" | "ru" | "zh" | "hi";
export const BIGC_THANG_LONG_MAP = "https://maps.app.goo.gl/3vB2qYuThwBASQZj8";

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
    pageSubtitle: "Điều hướng 5 bước • Lưu ý: thông tin & giá có thể thay đổi theo thời gian.",
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
      pickupFixed: "Điểm đón cố định: BigC Thăng Long (Khung giờ đón: 8h – 9h sáng)",
      specialRequest: "Yêu cầu đặc biệt",

      fullName: "Họ và tên (passport)",
      dob: "Ngày sinh",
      gender: "Giới tính",
      idNumber: "Số CCCD/Passport",
      weightKg: "Cân nặng (kg)",
      nationality: "Quốc tịch",

      contactInfo: "Thông tin liên hệ",
      passengerList: "Danh sách khách",
      termsText: "Tôi đã đọc và đồng ý với mọi điều khoản dịch vụ. Tôi xác nhận thông tin đặt bay.",
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
      selectLocationToSeeDetail: "Vui lòng chọn điểm bay để xem mô tả chi tiết",
      groupPromoAuto: "Khuyến mãi nhóm áp dụng tự động theo số lượng khách",
      pickupNoteSapa: "Xe đón trả tại khách sạn (Trung tâm Sapa, Lao Chải, Tả Van)",
      pickupNoteHN: "Xe đón trả 2 chiều từ BigC Thăng Long (Hà Nội)",
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
        dateInPast: "Ngày bay không được ở quá khứ. Vui lòng chọn từ ngày mai trở đi.",
        dobInFuture: "Ngày sinh không được ở tương lai.",
        dobTooYoung: "Ngày sinh không hợp lệ (không được trong năm hiện tại).",
        requiredField: "Trường này là bắt buộc.",
        weightInvalid: "Cân nặng không hợp lệ.",
      },
    },
  },

  en: {
    pageTitle: "Book your flight",
    pageSubtitle: "5-step flow • Note: information & prices may change over time.",
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
      addonsPromptSelectLocation: "Please select a location to see available services.",
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
      termsText: "I have read and agree to the terms of service. I confirm the booking details.",
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
      selectLocationToSeeDetail: "Please select a flight location to see details.",
      groupPromoAuto: "Group discount is automatically applied based on passenger count.",
      pickupNoteSapa: "Hotel pickup in Sapa center, Lao Chải, Tả Van.",
      pickupNoteHN: "Round-trip pickup from BigC Thăng Long (Hanoi).",
      successTitle: "COMPLETED",
      successBody: "Thank you for your booking! We will contact you to confirm the flight details.",
      preflightTitle: "Pre-flight notes",
      preflightNotes: [
        "Arrive at the launch site 30 minutes early for check-in.",
        "Outfit: sneakers recommended; avoid high heels; long-sleeve colorful outfit; glasses allowed; prepare ~4GB free storage for photo/video.",
        "Coordinates:",
      ],
      errors: {
        dateInPast: "Flight date cannot be in the past. Please pick from tomorrow onwards.",
        dobInFuture: "Date of birth cannot be in the future.",
        dobTooYoung: "Invalid date of birth (cannot be in the current year).",
        requiredField: "This field is required.",
        weightInvalid: "Invalid weight.",
      },
    },
  },

  fr: {
    pageTitle: "Réserver votre vol",
    pageSubtitle: "Processus en 5 étapes • Remarque : informations et prix susceptibles d’évoluer.",
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
      addonsPromptSelectLocation: "Veuillez choisir un site pour voir les services disponibles.",
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
      selectLocationToSeeDetail: "Veuillez choisir un site de vol pour voir les détails.",
      groupPromoAuto:
        "La remise de groupe est appliquée automatiquement selon le nombre de passagers.",
      pickupNoteSapa: "Prise en charge à l’hôtel (centre de Sapa, Lao Chải, Tả Van).",
      pickupNoteHN: "Prise en charge aller-retour depuis BigC Thăng Long (Hanoï).",
      successTitle: "TERMINÉ",
      successBody: "Merci pour votre réservation ! Nous vous contacterons pour confirmer les détails du vol.",
      preflightTitle: "Notes avant le vol",
      preflightNotes: [
        "Arrivez 30 minutes en avance pour l’enregistrement.",
        "Tenue : baskets, pas de talons ; manches longues colorées ; lunettes autorisées ; prévoyez ~4 Go libres pour photos/vidéos.",
        "Coordonnées :",
      ],
      errors: {
        dateInPast: "La date de vol ne peut pas être dans le passé. Choisissez à partir de demain.",
        dobInFuture: "La date de naissance ne peut pas être dans le futur.",
        dobTooYoung: "Date de naissance invalide (pas dans l’année en cours).",
        requiredField: "Champ requis.",
        weightInvalid: "Poids invalide.",
      },
    },
  },

  ru: {
    pageTitle: "Бронирование полёта",
    pageSubtitle: "5 шагов • Внимание: информация и цены могут меняться.",
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
      addonsPromptSelectLocation: "Выберите локацию, чтобы увидеть доступные услуги.",
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
      termsText: "Я прочитал(а) и согласен(на) с условиями. Подтверждаю детали бронирования.",
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
      selectLocationToSeeDetail: "Выберите место полёта, чтобы увидеть подробности.",
      groupPromoAuto: "Групповая скидка применяется автоматически по числу пассажиров.",
      pickupNoteSapa: "Трансфер от отеля (центр Сапы, Лао Чай, Та Ван).",
      pickupNoteHN: "Трансфер туда-обратно от BigC Thăng Long (Ханой).",
      successTitle: "ГОТОВО",
      successBody: "Спасибо за бронирование! Мы свяжемся с вами для подтверждения.",
      preflightTitle: "Памятка перед полётом",
      preflightNotes: [
        "Прибудьте на стартовую площадку за 30 минут до вылета.",
        "Одежда: кроссовки, не каблуки; яркая одежда с длинными рукавами; очки разрешены; подготовьте ~4 ГБ памяти.",
        "Координаты:",
      ],
      errors: {
        dateInPast: "Дата полёта не может быть в прошлом. Выберите завтрашний день или позже.",
        dobInFuture: "Дата рождения не может быть в будущем.",
        dobTooYoung: "Неверная дата рождения (не в текущем году).",
        requiredField: "Обязательное поле.",
        weightInvalid: "Недопустимый вес.",
      },
    },
  },

  // ✅ NEW: 中文
  zh: {
    pageTitle: "预订飞行",
    pageSubtitle: "5 步流程 • 提示：信息与价格可能会随时间调整。",
    stepNames: ["选择服务", "日期与联系", "乘客信息", "确认", "完成"],
    buttons: {
      next: "下一步",
      back: "返回",
      confirm: "确认",
      processing: "处理中...",
      startOver: "重新预订",
      viewMap: "查看地图",
      downloadImage: "下载图片",
      downloadPDF: "下载 PDF",
      generatingImage: "正在生成图片...",
      generatingPDF: "正在生成 PDF...",
    },
    labels: {
      guestsCount: "乘客人数",
      addonsTitle: "可选服务",
      addonsPromptSelectLocation: "请选择飞行点以查看可用服务。",
      notAvailableHere: "此飞行点不可用",
      notIncluded: "不包含：",

      date: "飞行日期",
      timeSlot: "时间段",
      phone: "联系电话",
      email: "联系邮箱",
      pickup: "接送地点",
      pickupFixed: "固定接送点：BigC Thăng Long（上午 8–9 点）",
      specialRequest: "特殊需求",

      fullName: "姓名（护照）",
      dob: "出生日期",
      gender: "性别",
      idNumber: "证件号/护照号",
      weightKg: "体重（kg）",
      nationality: "国籍",

      contactInfo: "联系信息",
      passengerList: "乘客名单",
      termsText: "我已阅读并同意服务条款，并确认预订信息无误。",
      viewTerms: "查看条款",

      priceSummary: "费用汇总",
      location: "飞行点",
      numGuests: "人数",
      basePricePerGuest: "基础价格 / 人",
      addonSurcharge: (k) => `附加费用 ${k}`,
      groupDiscount: "团体优惠",
      provisionalTotal: "预估总计",
    },
    placeholders: {
      phone: "例如：+84 912345678",
      email: "name@gmail.com",
      pickup: "填写酒店地址 / 接送地点",
      specialRequest: "例如：拍摄需求、体重、过敏等…",
      timeSlotPlaceholder: "选择时间段",
    },
    messages: {
      selectLocationToSeeDetail: "请选择飞行点以查看详细说明。",
      groupPromoAuto: "团体优惠将根据人数自动计算。",
      pickupNoteSapa: "沙坝市区、Lao Chải、Tả Van 酒店接送。",
      pickupNoteHN: "河内 BigC Thăng Long 往返接送。",
      successTitle: "完成",
      successBody: "感谢你的预订！我们将联系你确认飞行信息。",
      preflightTitle: "飞行前提示",
      preflightNotes: [
        "请提前 30 分钟到达起飞点办理签到。",
        "建议穿运动鞋；避免高跟鞋；长袖亮色衣服更适合拍照；可佩戴眼镜；手机预留约 4GB 空间用于接收照片/视频。",
        "坐标：",
      ],
      errors: {
        dateInPast: "飞行日期不能选择过去时间，请从明天开始选择。",
        dobInFuture: "出生日期不能在未来。",
        dobTooYoung: "出生日期无效（不能是今年）。",
        requiredField: "此项为必填。",
        weightInvalid: "体重无效。",
      },
    },
  },

  // ✅ NEW: हिन्दी
  hi: {
    pageTitle: "फ्लाइट बुक करें",
    pageSubtitle: "5-स्टेप प्रक्रिया • नोट: जानकारी और कीमतें समय के साथ बदल सकती हैं।",
    stepNames: ["सेवा चुनें", "तारीख व संपर्क", "यात्री", "पुष्टि", "पूर्ण"],
    buttons: {
      next: "आगे",
      back: "वापस",
      confirm: "पुष्टि करें",
      processing: "प्रोसेस हो रहा है...",
      startOver: "नई बुकिंग",
      viewMap: "मैप देखें",
      downloadImage: "इमेज डाउनलोड करें",
      downloadPDF: "PDF डाउनलोड करें",
      generatingImage: "इमेज बनाई जा रही है...",
      generatingPDF: "PDF बनाई जा रही है...",
    },
    labels: {
      guestsCount: "यात्रियों की संख्या",
      addonsTitle: "वैकल्पिक सेवाएँ",
      addonsPromptSelectLocation: "उपलब्ध सेवाएँ देखने के लिए कृपया लोकेशन चुनें।",
      notAvailableHere: "इस लोकेशन पर उपलब्ध नहीं",
      notIncluded: "शामिल नहीं:",

      date: "फ्लाइट की तारीख",
      timeSlot: "समय स्लॉट",
      phone: "फ़ोन",
      email: "ईमेल",
      pickup: "पिकअप पॉइंट",
      pickupFixed: "फिक्स्ड पिकअप: BigC Thăng Long (सुबह 8–9 बजे)",
      specialRequest: "विशेष अनुरोध",

      fullName: "पूरा नाम (पासपोर्ट)",
      dob: "जन्मतिथि",
      gender: "लिंग",
      idNumber: "आईडी/पासपोर्ट नंबर",
      weightKg: "वजन (kg)",
      nationality: "राष्ट्रीयता",

      contactInfo: "संपर्क जानकारी",
      passengerList: "यात्री सूची",
      termsText: "मैंने सेवा शर्तें पढ़ ली हैं और उनसे सहमत हूँ। मैं बुकिंग विवरण की पुष्टि करता/करती हूँ।",
      viewTerms: "शर्तें देखें",

      priceSummary: "कीमत सारांश",
      location: "लोकेशन",
      numGuests: "यात्री",
      basePricePerGuest: "बेस प्राइस / व्यक्ति",
      addonSurcharge: (k) => `अतिरिक्त शुल्क ${k}`,
      groupDiscount: "ग्रुप डिस्काउंट",
      provisionalTotal: "अनुमानित कुल",
    },
    placeholders: {
      phone: "उदा. +84 912345678",
      email: "name@gmail.com",
      pickup: "होटल पता / पिकअप पॉइंट दर्ज करें",
      specialRequest: "उदा. शूटिंग मदद, वजन, एलर्जी…",
      timeSlotPlaceholder: "समय स्लॉट चुनें",
    },
    messages: {
      selectLocationToSeeDetail: "विवरण देखने के लिए कृपया फ्लाइट लोकेशन चुनें।",
      groupPromoAuto: "ग्रुप डिस्काउंट यात्रियों की संख्या के आधार पर अपने आप लागू होगा।",
      pickupNoteSapa: "सापा सेंटर, Lao Chải, Tả Van में होटल पिकअप।",
      pickupNoteHN: "BigC Thăng Long (हनोई) से राउंड-ट्रिप पिकअप।",
      successTitle: "पूर्ण",
      successBody: "आपकी बुकिंग के लिए धन्यवाद! हम पुष्टि के लिए आपसे संपर्क करेंगे।",
      preflightTitle: "उड़ान से पहले नोट्स",
      preflightNotes: [
        "चेक-इन के लिए लॉन्च साइट पर 30 मिनट पहले पहुँचें।",
        "पोशाक: स्नीकर्स सुझाए जाते हैं; हाई हील्स से बचें; रंगीन लॉन्ग-स्लीव पहनें; चश्मा ठीक है; फोटो/वीडियो के लिए फोन में ~4GB खाली जगह रखें।",
        "कोऑर्डिनेट्स:",
      ],
      errors: {
        dateInPast: "फ्लाइट की तारीख अतीत में नहीं हो सकती। कृपया कल से आगे चुनें।",
        dobInFuture: "जन्मतिथि भविष्य में नहीं हो सकती।",
        dobTooYoung: "अमान्य जन्मतिथि (वर्तमान वर्ष नहीं हो सकता)।",
        requiredField: "यह फ़ील्ड आवश्यक है।",
        weightInvalid: "अमान्य वजन।",
      },
    },
  },
};

const ALL_LANGS: LangCode[] = ["vi", "en", "fr", "ru", "zh", "hi"];

export function useBookingText() {
  const ctx: any = (useLanguage as any)?.() ?? {};
  const lang = (ctx?.lang ?? ctx?.language ?? "vi") as LangCode;
  const safeLang: LangCode = ALL_LANGS.includes(lang) ? lang : "vi";
  return useMemo(() => bookingTranslations[safeLang], [safeLang]);
}

export function useLangCode(): LangCode {
  const ctx: any = (useLanguage as any)?.() ?? {};
  const lang = (ctx?.lang ?? ctx?.language ?? "vi") as LangCode;
  return ALL_LANGS.includes(lang) ? lang : "vi";
}