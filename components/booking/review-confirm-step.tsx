"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import { useBookingStore } from "@/store/booking-store";
import {
  computePriceByLang,
  LOCATIONS,
  type AddonKey,
} from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";
import { createBooking } from "@/lib/booking/api";
import { notifyTelegram } from "@/lib/booking/chatbot-api";
import { TERMS_HTML, type LangCode } from "@/lib/terms";
import { shortServiceLabel } from "@/lib/booking/service-label";
import TurnstileWidget from "@/components/booking/turnstile-widget";
import BookingTicket from "@/components/booking/BookingTicket";
import {
  imageComboDiscountVND,
  imageComboDiscountUSD,
  imageComboLabel,
} from "@/lib/booking/image-combo";

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";
type CurrencyCode = "VND" | "USD";

type LocalizedValue =
  | string
  | Partial<Record<LangUI | "vi" | "en", string>>
  | undefined;

type PackageLike = {
  key?: string;
  label?: LocalizedValue;
  name?: LocalizedValue;
  title?: LocalizedValue;
};

type PriceLine = {
  label: string;
  detail?: string;
  amountText: string;
  type?: "normal" | "discount";
};

type ServiceBreakdownRow = {
  key: string;
  label: string;
  detail?: string;
  lineTotal: number;
};

const UI_I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    termsTitle: string;
    openInNewTab: string;
    close: string;
    packageLabel: string;
    flightTypeLabel: string;
    pickupDetails: string;
    noPickupSelected: string;
    pickupAddressMissing: string;
    paragliding: string;
    paramotor: string;
    notSelected: string;
    weekday: string;
    weekend: string;
    holiday: string;
    selectedCount: string;
    /* Nhãn khối dịch vụ — trước đây không có trong bookingTranslations.labels
       nên L() luôn rơi về chuỗi tiếng Anh, kể cả khi khách xem bản tiếng Việt. */
    additionalServices: string;
    selectedServices: string;
    hotelTransfer: string;
    camera360: string;
    drone: string;
    gopro: string;
    drinks: string;
    certificate: string;
    freeTag: string;
    includedTag: string;
    noTag: string;
    flightCost: string;
    includedTitle: string;
    serviceDetails: string;
    priceBreakdown: string;
    totalCost: string;
    dayType: string;
    name: string;
    viewMap: string;
    cashPayment: string;
    bankTransfer: string;
    paypalPayment: string;
    creditCard: string;
    passengerList: string;
    paymentTitle: string;
    supportNote: string;
    paymentInfoTitle: string;
    paymentInfoDescription: string;
    preFlightNotesTitle: string;
    preFlightNotes: string[];
  }
> = {
  vi: {
    title: "Xác nhận đặt bay",
    subtitle:
      "Vui lòng kiểm tra thật kỹ thông tin chuyến bay, khách bay và dịch vụ đã chọn trước khi xác nhận",
    termsTitle: "Điều khoản & điều kiện",
    openInNewTab: "Mở trong tab mới",
    close: "Đóng",
    packageLabel: "Gói bay",
    flightTypeLabel: "Loại bay",
    pickupDetails: "Thông tin đón / trả",
    noPickupSelected:
      "Chuyến bay không bao gồm xe trung chuyển đến điểm bay. Khách cần có mặt trước 15 phút để check-in.",
    pickupAddressMissing: "Vui lòng nhập đầy đủ địa chỉ đón cho dịch vụ đã chọn.",
    paragliding: "Bay dù không động cơ",
    paramotor: "Bay dù gắn động cơ",
    notSelected: "Chưa chọn",
    weekday: "Ngày thường",
    weekend: "Cuối tuần",
    holiday: "Ngày lễ",
    selectedCount: "đã chọn",
    additionalServices: "Dịch vụ & tiện ích",
    selectedServices: "Dịch vụ tuỳ chọn",
    hotelTransfer: "Dịch vụ đón trả",
    camera360: "Camera 360",
    drone: "Flycam (drone camera)",
    gopro: "Ảnh & video GoPro",
    drinks: "Đồ uống",
    certificate: "Chứng nhận bay",
    freeTag: "miễn phí",
    includedTag: "đã bao gồm",
    noTag: "không",
    flightCost: "Giá chuyến bay cơ bản",
    includedTitle: "Giá trên đã bao gồm",
    serviceDetails: "Thông tin chuyến bay",
    priceBreakdown: "Chi tiết giá",
    totalCost: "Tổng cộng",
    dayType: "Loại ngày",
    name: "Họ và tên",
    viewMap: "Xem bản đồ",
    cashPayment: "Tiền mặt",
    bankTransfer: "Chuyển khoản",
    paypalPayment: "PayPal",
    creditCard: "Thẻ tín dụng",
    passengerList: "Danh sách khách bay",
    paymentTitle: "Phương thức thanh toán",
    supportNote:
      "Sau khi gửi booking, đội ngũ sẽ liên hệ xác nhận lịch bay, dịch vụ và các điều kiện thời tiết.",
    paymentInfoTitle: "Thông tin thanh toán",
    paymentInfoDescription:
      "Thanh toán sẽ được thực hiện trực tiếp tại điểm bay trước giờ cất cánh. Chúng tôi chấp nhận tiền mặt và các thẻ tín dụng/thẻ ghi nợ phổ biến. Sau khi đặt chỗ, chúng tôi sẽ liên hệ với bạn qua WhatsApp/Zalo hoặc email bạn cung cấp để xác nhận booking.",
    preFlightNotesTitle: "Thông tin lưu ý trước khi bay",
    preFlightNotes: [
      "Vui lòng có mặt tại điểm bay trước giờ cất cánh ít nhất 15 phút để hoàn tất thủ tục check-in.",
      "Mang theo giấy tờ tùy thân (CMND/CCCD hoặc Hộ chiếu) để xác minh thông tin.",
      "Mặc trang phục thoải mái, đi giày thể thao hoặc giày bệt. Tránh mang dép lê, giày cao gót.",
      "Không mang theo vật dụng sắc nhọn, dễ rơi hoặc có giá trị cao khi bay.",
      "Nếu bạn có vấn đề về sức khỏe (tim mạch, huyết áp, động kinh, đang mang thai...), vui lòng thông báo trước cho phi công.",
      "Chuyến bay có thể bị hoãn hoặc hủy do điều kiện thời tiết không đảm bảo an toàn. Trong trường hợp này, bạn sẽ được đổi lịch hoặc hoàn tiền.",
    ],
  },
  en: {
    title: "Review and confirm",
    subtitle:
      "Please review your flight details, passengers, and selected services carefully before confirming.",
    termsTitle: "Terms & Conditions",
    openInNewTab: "Open in new tab",
    close: "Close",
    packageLabel: "Flight package",
    flightTypeLabel: "Flight type",
    pickupDetails: "Pickup details",
    noPickupSelected:
      "This flight does not include transfer to the takeoff point. Please arrive 15 minutes early for check-in.",
    pickupAddressMissing: "Please provide the pickup address for the selected service.",
    paragliding: "Paragliding",
    paramotor: "Paramotor",
    notSelected: "Not selected",
    weekday: "Weekday",
    weekend: "Weekend",
    holiday: "Holiday",
    selectedCount: "selected",
    additionalServices: "Services & perks",
    selectedServices: "Optional services",
    hotelTransfer: "Hotel pickup / drop-off",
    camera360: "360 camera",
    drone: "Flycam (drone camera)",
    gopro: "GoPro photos & video",
    drinks: "Drinks",
    certificate: "Flight certificate",
    freeTag: "free",
    includedTag: "included",
    noTag: "no",
    flightCost: "Base flight price",
    includedTitle: "The price includes",
    serviceDetails: "Flight details",
    priceBreakdown: "Price breakdown",
    totalCost: "Total",
    dayType: "Day type",
    name: "Full name",
    viewMap: "View map",
    cashPayment: "Cash",
    bankTransfer: "Bank transfer",
    paypalPayment: "PayPal",
    creditCard: "Credit card",
    passengerList: "Passenger list",
    paymentTitle: "Payment methods",
    supportNote:
      "After you submit the booking, our team will contact you to confirm schedule, services, and weather conditions.",
    paymentInfoTitle: "Payment information",
    paymentInfoDescription:
      "Payment is made directly at the flight site before takeoff. We accept cash and common credit/debit cards. After booking, we will contact you via WhatsApp/Zalo or the email you provided to confirm your reservation.",
    preFlightNotesTitle: "Pre-flight information",
    preFlightNotes: [
      "Please arrive at the flight site at least 15 minutes before takeoff to complete check-in.",
      "Bring valid ID (National ID or Passport) for verification.",
      "Wear comfortable clothes and sneakers or flat shoes. Avoid flip-flops or high heels.",
      "Do not bring sharp objects, items that may fall, or high-value items during the flight.",
      "If you have any health issues (heart disease, blood pressure, epilepsy, pregnancy...), please inform the pilot in advance.",
      "Flights may be postponed or cancelled due to unsafe weather conditions. In such cases, you can reschedule or get a refund.",
    ],
  },
  fr: {
    title: "Vérification et confirmation",
    subtitle:
      "Veuillez vérifier soigneusement les détails du vol, les passagers et les services sélectionnés avant de confirmer.",
    termsTitle: "Conditions générales",
    openInNewTab: "Ouvrir dans un nouvel onglet",
    close: "Fermer",
    packageLabel: "Forfait de vol",
    flightTypeLabel: "Type de vol",
    pickupDetails: "Informations de prise en charge",
    noPickupSelected:
      "Ce vol ne comprend pas le transfert vers le point de départ. Veuillez arriver 15 minutes à l'avance pour l'enregistrement.",
    pickupAddressMissing:
      "Veuillez renseigner l'adresse de prise en charge pour le service sélectionné.",
    paragliding: "Parapente",
    paramotor: "Paramoteur",
    notSelected: "Non sélectionné",
    weekday: "Jour ouvré",
    weekend: "Week-end",
    holiday: "Jour férié",
    selectedCount: "sélectionné",
    additionalServices: "Services & avantages",
    selectedServices: "Services en option",
    hotelTransfer: "Transfert hôtel",
    camera360: "Caméra 360",
    drone: "Drone (flycam)",
    gopro: "Photos & vidéo GoPro",
    drinks: "Boissons",
    certificate: "Certificat de vol",
    freeTag: "offert",
    includedTag: "inclus",
    noTag: "non",
    flightCost: "Prix de base du vol",
    includedTitle: "Ce prix comprend",
    serviceDetails: "Détails du vol",
    priceBreakdown: "Détail des prix",
    totalCost: "Total",
    dayType: "Type de jour",
    name: "Nom complet",
    viewMap: "Voir la carte",
    cashPayment: "Espèces",
    bankTransfer: "Virement",
    paypalPayment: "PayPal",
    creditCard: "Carte bancaire",
    passengerList: "Liste des passagers",
    paymentTitle: "Modes de paiement",
    supportNote:
      "Après l'envoi de la réservation, notre équipe vous contactera pour confirmer l'horaire, les services et la météo.",
    paymentInfoTitle: "Informations de paiement",
    paymentInfoDescription:
      "Le paiement s'effectue directement sur le site de vol avant le décollage. Nous acceptons les espèces et les cartes de crédit/débit courantes. Après la réservation, nous vous contacterons via WhatsApp/Zalo ou l'e-mail fourni pour confirmer votre réservation.",
    preFlightNotesTitle: "Informations avant le vol",
    preFlightNotes: [
      "Veuillez arriver sur le site de vol au moins 15 minutes avant le décollage pour l'enregistrement.",
      "Apportez une pièce d'identité valide (carte nationale ou passeport) pour vérification.",
      "Portez des vêtements confortables et des chaussures de sport ou plates. Évitez les tongs ou talons hauts.",
      "Ne transportez pas d'objets pointus, d'objets pouvant tomber ou d'objets de grande valeur pendant le vol.",
      "Si vous avez des problèmes de santé (maladies cardiaques, tension artérielle, épilepsie, grossesse...), informez le pilote à l'avance.",
      "Les vols peuvent être reportés ou annulés en raison de conditions météorologiques dangereuses. Dans ce cas, vous pouvez reprogrammer ou obtenir un remboursement.",
    ],
  },
  ru: {
    title: "Проверка и подтверждение",
    subtitle:
      "Пожалуйста, внимательно проверьте детали полёта, пассажиров и выбранные услуги перед подтверждением.",
    termsTitle: "Правила и условия",
    openInNewTab: "Открыть в новой вкладке",
    close: "Закрыть",
    packageLabel: "Пакет полёта",
    flightTypeLabel: "Тип полёта",
    pickupDetails: "Информация о трансфере",
    noPickupSelected:
      "Этот полёт не включает трансфер до точки старта. Пожалуйста, прибудьте за 15 минут до регистрации.",
    pickupAddressMissing: "Пожалуйста, укажите адрес трансфера для выбранной услуги.",
    paragliding: "Параплан",
    paramotor: "Парамотор",
    notSelected: "Не выбрано",
    weekday: "Будний день",
    weekend: "Выходной",
    holiday: "Праздничный день",
    selectedCount: "выбрано",
    additionalServices: "Услуги и бонусы",
    selectedServices: "Дополнительные услуги",
    hotelTransfer: "Трансфер от отеля",
    camera360: "Камера 360",
    drone: "Дрон (flycam)",
    gopro: "Фото и видео GoPro",
    drinks: "Напитки",
    certificate: "Сертификат о полёте",
    freeTag: "бесплатно",
    includedTag: "включено",
    noTag: "нет",
    flightCost: "Базовая стоимость полёта",
    includedTitle: "В цену входит",
    serviceDetails: "Детали полёта",
    priceBreakdown: "Детализация цены",
    totalCost: "Итого",
    dayType: "Тип дня",
    name: "Полное имя",
    viewMap: "Открыть карту",
    cashPayment: "Наличные",
    bankTransfer: "Перевод",
    paypalPayment: "PayPal",
    creditCard: "Карта",
    passengerList: "Список пассажиров",
    paymentTitle: "Способы оплаты",
    supportNote:
      "После отправки бронирования команда свяжется с вами для подтверждения времени, услуг и погодных условий.",
    paymentInfoTitle: "Информация об оплате",
    paymentInfoDescription:
      "Оплата производится непосредственно на месте полета до взлета. Мы принимаем наличные и распространенные кредитные/дебетовые карты. После бронирования мы свяжемся с вами через WhatsApp/Zalo или по указанной электронной почте для подтверждения брони.",
    preFlightNotesTitle: "Информация перед полётом",
    preFlightNotes: [
      "Пожалуйста, прибудьте на место полёта минимум за 15 минут до взлёта для регистрации.",
      "Возьмите с собой удостоверение личности (паспорт или ID-карту) для проверки.",
      "Наденьте удобную одежду и кроссовки или плоскую обувь. Избегайте шлёпанцев или каблуков.",
      "Не берите острые предметы, вещи, которые могут упасть, или ценные вещи на полёт.",
      "Если у вас есть проблемы со здоровьем (сердечные заболевания, давление, эпилепсия, беременность...), сообщите пилоту заранее.",
      "Полёты могут быть отложены или отменены из-за неблагоприятных погодных условий. В таком случае вы можете перенести полёт или получить возврат.",
    ],
  },
  hi: {
    title: "जाँचें और पुष्टि करें",
    subtitle:
      "कृपया पुष्टि करने से पहले फ्लाइट विवरण, यात्रियों और चुनी गई सेवाओं की अच्छी तरह जाँच करें।",
    termsTitle: "नियम और शर्तें",
    openInNewTab: "नए टैब में खोलें",
    close: "बंद करें",
    packageLabel: "फ्लाइट पैकेज",
    flightTypeLabel: "फ्लाइट प्रकार",
    pickupDetails: "पिकअप जानकारी",
    noPickupSelected:
      "इस फ्लाइट में टेकऑफ पॉइंट तक ट्रांसफर शामिल नहीं है। कृपया चेक-इन के लिए 15 मिनट पहले पहुँचें।",
    pickupAddressMissing: "कृपया चुनी गई सेवा के लिए पिकअप पता भरें।",
    paragliding: "पैराग्लाइडिंग",
    paramotor: "पैरामोटर",
    notSelected: "चयन नहीं किया गया",
    weekday: "कार्यदिवस",
    weekend: "सप्ताहांत",
    holiday: "छुट्टी",
    selectedCount: "चयनित",
    additionalServices: "सेवाएँ व सुविधाएँ",
    selectedServices: "वैकल्पिक सेवाएँ",
    hotelTransfer: "होटल पिकअप / ड्रॉप",
    camera360: "360 कैमरा",
    drone: "फ़्लाईकैम (ड्रोन)",
    gopro: "GoPro फ़ोटो व वीडियो",
    drinks: "पेय",
    certificate: "उड़ान प्रमाणपत्र",
    freeTag: "निःशुल्क",
    includedTag: "शामिल",
    noTag: "नहीं",
    flightCost: "मूल उड़ान शुल्क",
    includedTitle: "इस क़ीमत में शामिल है",
    serviceDetails: "उड़ान विवरण",
    priceBreakdown: "मूल्य विवरण",
    totalCost: "कुल",
    dayType: "दिन का प्रकार",
    name: "पूरा नाम",
    viewMap: "नक्शा देखें",
    cashPayment: "नकद",
    bankTransfer: "बैंक ट्रांसफ़र",
    paypalPayment: "PayPal",
    creditCard: "क्रेडिट कार्ड",
    passengerList: "यात्री सूची",
    paymentTitle: "भुगतान के तरीके",
    supportNote:
      "बुकिंग भेजने के बाद हमारी टीम समय, सेवाओं और मौसम की स्थिति की पुष्टि के लिए आपसे संपर्क करेगी।",
    paymentInfoTitle: "भुगतान जानकारी",
    paymentInfoDescription:
      "भुगतान उड़ान स्थल पर टेकऑफ से पहले सीधे किया जाएगा। हम नकद और सामान्य क्रेडिट/डेबिट कार्ड स्वीकार करते हैं। बुकिंग के बाद, आपकी बुकिंग की पुष्टि के लिए हम आपसे WhatsApp/Zalo या दिए गए ईमेल पर संपर्क करेंगे।",
    preFlightNotesTitle: "उड़ान से पहले जानकारी",
    preFlightNotes: [
      "कृपया चेक-इन के लिए टेकऑफ से कम से कम 15 मिनट पहले उड़ान स्थल पर पहुँचें।",
      "सत्यापन के लिए वैध पहचान पत्र (राष्ट्रीय आईडी या पासपोर्ट) साथ लाएं।",
      "आरामदायक कपड़े और स्नीकर्स या फ्लैट जूते पहनें। फ्लिप-फ्लॉप या हाई हील्स से बचें।",
      "उड़ान के दौरान तेज धार वाली वस्तुएं, गिरने वाली वस्तुएं या उच्च मूल्य की वस्तुएं न लाएं।",
      "यदि आपको कोई स्वास्थ्य समस्या है (हृदय रोग, रक्तचाप, मिर्गी, गर्भावस्था...), तो कृपया पायलट को पहले से सूचित करें।",
      "असुरक्षित मौसम के कारण उड़ानें स्थगित या रद्द हो सकती हैं। ऐसे मामलों में, आप पुनर्निर्धारण या रिफंड ले सकते हैं।",
    ],
  },
  zh: {
    title: "确认预订信息",
    subtitle:
      "请在确认前仔细检查飞行信息、乘客信息以及已选择的服务。",
    termsTitle: "条款和条件",
    openInNewTab: "在新标签页中打开",
    close: "关闭",
    packageLabel: "飞行套餐",
    flightTypeLabel: "飞行类型",
    pickupDetails: "接送信息",
    noPickupSelected:
      "该飞行不包含前往起飞点的接送服务。请提前 15 分钟到达办理登记。",
    pickupAddressMissing: "请选择接送服务后填写接送地址。",
    paragliding: "无动力滑翔伞",
    paramotor: "动力伞",
    notSelected: "未选择",
    weekday: "工作日",
    weekend: "周末",
    holiday: "节假日",
    selectedCount: "已选择",
    additionalServices: "服务与福利",
    selectedServices: "可选服务",
    hotelTransfer: "酒店接送",
    camera360: "360 相机",
    drone: "航拍无人机",
    gopro: "GoPro 照片与视频",
    drinks: "饮品",
    certificate: "飞行证书",
    freeTag: "免费",
    includedTag: "已包含",
    noTag: "无",
    flightCost: "基础飞行价格",
    includedTitle: "价格已包含",
    serviceDetails: "飞行信息",
    priceBreakdown: "价格明细",
    totalCost: "总计",
    dayType: "日期类型",
    name: "姓名",
    viewMap: "查看地图",
    cashPayment: "现金",
    bankTransfer: "银行转账",
    paypalPayment: "PayPal",
    creditCard: "信用卡",
    passengerList: "乘客名单",
    paymentTitle: "支付方式",
    supportNote:
      "提交预订后，团队将联系您确认飞行时间、服务内容和天气条件。",
    paymentInfoTitle: "支付信息",
    paymentInfoDescription:
      "请在起飞前于飞行现场直接付款。我们接受现金及常见的信用卡/借记卡。预订后，我们将通过您提供的 WhatsApp/Zalo 或电子邮箱与您联系以确认订单。",
    preFlightNotesTitle: "飞行前须知",
    preFlightNotes: [
      "请至少提前15分钟到达飞行现场完成登记手续。",
      "请携带有效身份证件（身份证或护照）进行验证。",
      "请穿着舒适的衣物和运动鞋或平底鞋。避免穿拖鞋或高跟鞋。",
      "飞行时请勿携带尖锐物品、易掉落物品或贵重物品。",
      "如有健康问题（心脏病、血压问题、癫痫、怀孕等），请提前告知飞行员。",
      "因天气原因不安全时，飞行可能会延期或取消。届时您可以改期或获得退款。",
    ],
  },
};

function getLocalizedText(value: unknown, lang: string, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const obj = value as Record<string, string | undefined>;
    return obj[lang] || obj.en || obj.vi || fallback;
  }

  return fallback;
}

function extractPackages(rawPackages: unknown): PackageLike[] {
  if (Array.isArray(rawPackages)) {
    return rawPackages as PackageLike[];
  }

  if (rawPackages && typeof rawPackages === "object") {
    return Object.values(rawPackages as Record<string, unknown>) as PackageLike[];
  }

  return [];
}

function getFlightTypeLabel(lang: string, key?: string) {
  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  if (key === "paramotor") return ui.paramotor;
  if (key === "paragliding") return ui.paragliding;
  return ui.notSelected;
}

function getHolidayTypeLabel(
  lang: string,
  holidayType?: "weekday" | "weekend" | "holiday",
) {
  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  if (holidayType === "holiday") return ui.holiday;
  if (holidayType === "weekend") return ui.weekend;
  return ui.weekday;
}

/**
 * Nhãn dòng phụ thu ở bảng giá bước 4. Nói rõ "ngày lễ" hay "cuối tuần" theo
 * đúng loại ngày khách chọn, để khách không phải đoán vì sao bị cộng thêm.
 */
const PEAK_SURCHARGE_LABEL: Record<
  string,
  { holiday: string; weekend: string }
> = {
  vi: { holiday: "Phụ thu ngày lễ", weekend: "Phụ thu cuối tuần" },
  en: { holiday: "Public holiday surcharge", weekend: "Weekend surcharge" },
  fr: { holiday: "Supplément jour férié", weekend: "Supplément week-end" },
  ru: { holiday: "Праздничная доплата", weekend: "Доплата за выходные" },
  zh: { holiday: "节假日附加费", weekend: "周末附加费" },
  hi: { holiday: "अवकाश अधिभार", weekend: "सप्ताहांत अधिभार" },
};

function peakSurchargeLabel(
  lang: string,
  holidayType?: "weekday" | "weekend" | "holiday",
) {
  const set = PEAK_SURCHARGE_LABEL[lang] ?? PEAK_SURCHARGE_LABEL.vi;
  return holidayType === "holiday" ? set.holiday : set.weekend;
}

function resolveFlightTypeKey(cfg: any, selected?: string) {
  if (selected === "paramotor" || selected === "paragliding") {
    return selected;
  }

  const candidates = [
    cfg?.defaultFlightTypeKey,
    cfg?.defaultFlightType,
    cfg?.flightTypeKey,
    cfg?.flightType,
    cfg?.type,
  ];

  const found = candidates.find(
    (value) => value === "paramotor" || value === "paragliding",
  );

  return (found as string | undefined) || "paragliding";
}

function formatMoneyVND(n: number) {
  return `${Math.round(Number(n || 0)).toLocaleString("vi-VN")} đ`;
}

function formatMoneyUSD(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


/**
 * Một dòng trong danh sách dịch vụ: dấu ✓ xanh nếu có, ✕ đỏ nếu không.
 * Giữ nguyên một dòng text, không khung, không nền — khối này trước đây mỗi
 * mục là một thẻ có viền nên chiếm gần nửa màn hình chỉ để nói "No".
 */
function ServiceItem({
  ok,
  noLabel,
  children,
}: {
  ok: boolean;
  /** Chữ trong ngoặc cho mục không chọn, ví dụ "(không)". */
  noLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-baseline gap-2 text-sm leading-6">
      <span
        aria-hidden
        className={
          ok
            ? "shrink-0 font-bold text-[#16A34A]"
            : "shrink-0 text-base font-black text-[#DC2626]"
        }
      >
        {ok ? "✔" : "✕"}
      </span>
      <span className={`min-w-0 ${ok ? "text-[#1C2930]" : "text-[#94A3B8]"}`}>
        {children}
        {!ok && noLabel ? (
          <span className="text-[#DC2626]"> ({noLabel})</span>
        ) : null}
      </span>
    </li>
  );
}

type IncludedTag = "none" | "free" | "included";

/**
 * Nhãn cho một mục trong danh sách "đã có trong giá":
 *  - phần tử đầu tiên luôn là chính chuyến bay  -> không gắn nhãn
 *  - đồ uống và ảnh/video quay tặng khách       -> (miễn phí)
 *  - phần còn lại (bảo hiểm, giấy chứng nhận,
 *    xe lên/xuống núi...)                        -> (đã bao gồm)
 *
 * Xét trên chuỗi TIẾNG VIỆT của mục đó (xem includedList) nên chỉ cần một bộ
 * từ khoá, không phải viết lại cho từng ngôn ngữ.
 */
const FREE_KEYWORDS = [
  "gopro",
  "quay phim",
  "chụp hình",
  "nước uống",
  "đồ uống",
  "cà phê",
  "trà",
  "ảnh",
  "video",
];

function includedTagOf(viText: string, index: number): IncludedTag {
  if (index === 0) return "none";
  const lower = viText.toLowerCase();
  return FREE_KEYWORDS.some((k) => lower.includes(k)) ? "free" : "included";
}

/** Số lượng "×2" — cùng màu xanh với các nhãn (miễn phí) / (đã bao gồm). */
function Qty({ n }: { n: number }) {
  return <span className="font-semibold text-[#16A34A]">×{n}</span>;
}

function splitInputEntries(raw?: string) {
  return String(raw || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ReviewConfirmStep() {
  const t = useBookingText();
  const lang = useLangCode();

  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const setBookingResult = useBookingStore((s) => s.setBookingResult);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const ui = UI_I18N[lang] ?? UI_I18N.vi;

  /**
   * Lấy nhãn: ưu tiên bookingTranslations.labels, thiếu thì tra bảng UI_I18N
   * ngay trong file này, cuối cùng mới rơi về chuỗi tiếng Anh.
   *
   * Khai báo ngay đây chứ không để cuối component: các useMemo dựng bảng giá
   * nằm phía trên và chạy ngay lúc render, gọi L() khi nó chưa khởi tạo sẽ
   * lỗi "Cannot access 'L' before initialization" — TypeScript không bắt
   * được vì lời gọi nằm trong hàm mũi tên.
   */
  const L = useCallback(
    (key: string, fallback: string) =>
      ((t as any)?.labels?.[key] as string) ||
      ((ui as any)?.[key] as string) ||
      fallback,
    [t, ui],
  );
  const termsContent = TERMS_HTML[lang as LangCode] || TERMS_HTML.vi;

  const cfg = data.location ? LOCATIONS[data.location] : undefined;

  /**
   * Những gì đã nằm trong giá — lấy theo gói khách chọn, không có thì lấy
   * của điểm bay. Cùng nguồn dữ liệu với thẻ "Đã bao gồm" ở bước 1, để bước
   * xác nhận không nói khác đi so với lúc khách chọn.
   */
  const includedList = useMemo(() => {
    if (!cfg) return [] as Array<{ text: string; tag: IncludedTag }>;

    const pkgCfg = (cfg as any)?.packages?.find(
      (p: any) => p.key === data.packageKey,
    );

    const source = pkgCfg?.included ?? (cfg as any)?.included;
    const items = (source?.[lang] ??
      source?.en ??
      source?.vi ??
      []) as string[];

    // Bản tiếng Việt của CÙNG danh sách, dùng để phân loại nhãn: các mảng
    // ngôn ngữ song song nhau theo chỉ số nên tra được, và như vậy quy tắc
    // phân loại chỉ cần viết một lần cho tiếng Việt.
    const viItems = (source?.vi ?? []) as string[];

    return items.map((text, idx) => ({
      text,
      tag: includedTagOf(viItems[idx] ?? text, idx),
    }));
  }, [cfg, data.packageKey, lang]);

  const packages = useMemo(() => extractPackages(cfg?.packages), [cfg?.packages]);

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => pkg?.key === data.packageKey);
  }, [packages, data.packageKey]);

  const packageLabel = useMemo(() => {
    if (!selectedPackage) return ui.notSelected;

    return getLocalizedText(
      selectedPackage.label || selectedPackage.name || selectedPackage.title,
      lang,
      ui.notSelected,
    );
  }, [selectedPackage, lang, ui.notSelected]);

  const resolvedFlightTypeKey = useMemo(() => {
    return resolveFlightTypeKey(cfg, data.flightTypeKey);
  }, [cfg, data.flightTypeKey]);

  const locationName = useMemo(() => {
    return getLocalizedText(
      cfg?.name,
      lang,
      data.location || ((t as any)?.labels?.flight as string) || "Flight",
    );
  }, [cfg?.name, data.location, lang, t]);

  const visibleSelectedServices = useMemo(() => {
    if (!cfg?.services?.length) return [];

    return cfg.services.filter((svc: any) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return false;
        if (!svc.visibleForPackages.includes(data.packageKey as any)) return false;
      }

      return !!data.services?.[svc.key]?.selected;
    });
  }, [cfg?.services, data.packageKey, data.services]);

  const selectedPickupServices = useMemo(() => {
    return visibleSelectedServices.filter(
      (svc: any) => svc.requiresPickupInput || svc.fixedMapUrl,
    );
  }, [visibleSelectedServices]);

  const missingPickupAddress = useMemo(() => {
    return selectedPickupServices.some((svc: any) => {
      if (svc.fixedMapUrl) return false;
      if (!svc.requiresPickupInput) return false;

      return !(data.services?.[svc.key]?.inputText || "").trim();
    });
  }, [selectedPickupServices, data.services]);

  const guestsCount = Math.max(1, data.guestsCount || 1);

  const serviceLines = useMemo(() => {
    return visibleSelectedServices.map((svc: any) => {
      // Bỏ phần giải thích trong ngoặc — khách đã chọn xong rồi, giữ lại chỉ
      // làm dòng dài gấp đôi mà không thêm thông tin gì.
      const label = shortServiceLabel(
        getLocalizedText(svc.label, lang, String(svc.key)),
      );
      const state = data.services?.[svc.key];
      const inputText = state?.inputText || "";

      /**
       * Số lượng của dịch vụ, để hiện "×2" cho khách biết đã mua mấy suất.
       * Dịch vụ dạng đếm (flycam, camera 360, số chiều xe...) lấy đúng số
       * khách bấm; dịch vụ tính theo đầu người thì bằng số khách bay.
       * Trả 0 khi không có khái niệm số lượng, ví dụ dòng chỉ dẫn bản đồ.
       */
      const qty =
        svc.controlType === "counter"
          ? Math.max(1, Number(state?.qty) || 1)
          : svc.priceVND || svc.priceUSD
            ? guestsCount
            : 0;

      return {
        key: svc.key,
        label,
        inputText,
        qty,
        fixedMapUrl: svc.fixedMapUrl,
      };
    });
  }, [visibleSelectedServices, data.services, lang, guestsCount]);

  // Giảm combo ảnh: khách chọn cả flycam lẫn camera 360°.
  // Cùng quy tắc với bước chọn dịch vụ (lib/booking/image-combo.ts).
  const comboServiceStates = useMemo(
    () =>
      Object.entries((data.services || {}) as Record<string, any>).map(
        ([key, st]) => ({
          key,
          selected: !!st?.selected,
          qty: Math.max(1, Number(st?.qty) || 1),
        }),
      ),
    [data.services],
  );

  const imageComboOffVND = imageComboDiscountVND(comboServiceStates);
  const imageComboOffUSD = imageComboDiscountUSD(comboServiceStates);

  const billVND = useMemo(
    () =>
      computePriceByLang(
        {
          location: data.location,
          guestsCount: data.guestsCount,
          dateISO: data.dateISO,
          packageKey: data.packageKey,
          flightTypeKey: data.flightTypeKey,
          addons: data.addons,
          addonsQty: data.addonsQty,
        },
        "vi",
      ),
    [
      data.location,
      data.guestsCount,
      data.dateISO,
      data.packageKey,
      data.flightTypeKey,
      data.addons,
      data.addonsQty,
    ],
  );

  const billUSD = useMemo(
    () =>
      computePriceByLang(
        {
          location: data.location,
          guestsCount: data.guestsCount,
          dateISO: data.dateISO,
          packageKey: data.packageKey,
          flightTypeKey: data.flightTypeKey,
          addons: data.addons,
          addonsQty: data.addonsQty,
        },
        "en",
      ),
    [
      data.location,
      data.guestsCount,
      data.dateISO,
      data.packageKey,
      data.flightTypeKey,
      data.addons,
      data.addonsQty,
    ],
  );

  const getServiceLineTotalByCurrency = useCallback(
    (svc: any, currency: CurrencyCode): number => {
      const serviceState = data.services?.[svc.key];
      if (!serviceState?.selected) return 0;

      const qty = Math.max(1, serviceState.qty || 1);
      const unitPrice =
        currency === "VND"
          ? Number(svc.priceVND || 0)
          : Number(svc.priceUSD || 0);

      const key = String(svc.key || "");

      if (key === "khau_pha_garrya_pickup") {
        // số xe (4 khách/xe) × số chiều (qty: 1-2) × 500.000 đ/xe/chiều
        const carCount = Math.ceil(guestsCount / 4);
        return currency === "VND"
          ? carCount * qty * 500_000
          : carCount * qty * 20;
      }

      if (key === "ha_noi_private_hotel_pickup") {
        return currency === "VND"
          ? 1_400_000 + Math.max(0, guestsCount - 3) * 350_000
          : 56 + Math.max(0, guestsCount - 3) * 14;
      }

      if (svc.controlType === "counter") {
        return unitPrice * qty;
      }

      return unitPrice * guestsCount;
    },
    [data.services, guestsCount],
  );

  const selectedServicesTotalVND = useMemo(() => {
    if (!cfg?.services?.length) return 0;

    return cfg.services.reduce((sum: number, svc: any) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return sum;
        if (!svc.visibleForPackages.includes(data.packageKey)) return sum;
      }

      if (svc.visibleForFlightTypes?.length) {
        if (!data.flightTypeKey) return sum;
        if (!svc.visibleForFlightTypes.includes(data.flightTypeKey)) return sum;
      }

      const serviceState = data.services?.[svc.key];
      if (!serviceState?.selected) return sum;

      return sum + getServiceLineTotalByCurrency(svc, "VND");
    }, 0);
  }, [
    cfg?.services,
    data.packageKey,
    data.flightTypeKey,
    data.services,
    getServiceLineTotalByCurrency,
  ]);

  const selectedServicesTotalUSD = useMemo(() => {
    if (!cfg?.services?.length) return 0;

    return cfg.services.reduce((sum: number, svc: any) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return sum;
        if (!svc.visibleForPackages.includes(data.packageKey)) return sum;
      }

      if (svc.visibleForFlightTypes?.length) {
        if (!data.flightTypeKey) return sum;
        if (!svc.visibleForFlightTypes.includes(data.flightTypeKey)) return sum;
      }

      const serviceState = data.services?.[svc.key];
      if (!serviceState?.selected) return sum;

      return sum + getServiceLineTotalByCurrency(svc, "USD");
    }, 0);
  }, [
    cfg?.services,
    data.packageKey,
    data.flightTypeKey,
    data.services,
    getServiceLineTotalByCurrency,
  ]);

  const selectedServicesBreakdown = useMemo(() => {
    if (!cfg?.services?.length) {
      return [] as ServiceBreakdownRow[];
    }

    const rows: ServiceBreakdownRow[] = [];

    cfg.services.forEach((svc: any) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return;
        if (!svc.visibleForPackages.includes(data.packageKey)) return;
      }

      if (svc.visibleForFlightTypes?.length) {
        if (!data.flightTypeKey) return;
        if (!svc.visibleForFlightTypes.includes(data.flightTypeKey)) return;
      }

      const serviceState = data.services?.[svc.key];
      if (!serviceState?.selected) return;

      const qty = Math.max(1, serviceState.qty || 1);
      const lineTotal = getServiceLineTotalByCurrency(svc, "VND");
      if (lineTotal <= 0) return;

      const label = getLocalizedText(svc.label, lang, String(svc.key));
      const unitPrice = Number(svc.priceVND || 0);

      const key = String(svc.key || "");
      let detailText = "";

      if (key === "khau_pha_garrya_pickup") {
        const carCount = Math.ceil(guestsCount / 4);
        const carPrice = 500_000;
        detailText = `${formatMoneyVND(carPrice)} × ${carCount} xe × ${qty} chiều`;
      } else if (key === "ha_noi_private_hotel_pickup") {
        detailText = "";
      } else if (svc.controlType === "counter") {
        detailText = `${formatMoneyVND(unitPrice)} × ${qty}`;
      } else {
        detailText = `${formatMoneyVND(unitPrice)} × ${guestsCount}`;
      }

      rows.push({
        key,
        label,
        detail: detailText || undefined,
        lineTotal,
      });
    });

    return rows;
  }, [
    cfg?.services,
    data.packageKey,
    data.flightTypeKey,
    data.services,
    getServiceLineTotalByCurrency,
    lang,
    guestsCount,
  ]);

  const formatDate = (iso?: string) => {
    if (!iso) return ui.notSelected;

    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const pax = data.guestsCount || 1;

  const getAddonQty = (k: AddonKey) => {
    const qty =
      (data.addonsQty?.[k] ?? 0) || (data.addons?.[k] ? data.guestsCount : 0);

    return Math.max(0, Math.min(data.guestsCount || 1, Number(qty) || 0));
  };

  const contactAny = (data as any)?.contact;
  const contactName = (
    contactAny?.fullName ??
    contactAny?.contactName ??
    ""
  ).toString();
  const contactPhone = (contactAny?.phone ?? "").toString();
  const contactEmail = (contactAny?.email ?? "").toString();
  const specialRequest = (contactAny?.specialRequest ?? "").toString();
  const firstGuestName = ((data as any)?.guests?.[0]?.fullName ?? "").toString();

  const termsUrl = `/terms?lang=${lang}`;

  /**
   * Mã vé tính trước ở máy khách bằng ĐÚNG công thức của máy chủ
   * (app/api/booking/create/route.ts → buildBookingCode):
   * [ngày-tháng bay].[số điện thoại kèm mã nước].
   *
   * Nhờ vậy tấm vé vẽ sẵn ở bước này mang đúng mã mà máy chủ sẽ cấp, không
   * lệch với mã in trong email.
   */
  const previewBookingCode = useMemo(() => {
    const d = data.dateISO ? new Date(data.dateISO) : null;
    const datePart =
      d && !Number.isNaN(d.getTime())
        ? `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}`
        : "";

    return `${datePart}.${String(contactPhone || "").replace(/\D/g, "")}`;
  }, [data.dateISO, contactPhone]);

  const hiddenTicketRef = useRef<HTMLDivElement | null>(null);

  /**
   * Vẽ tấm vé thành ảnh PNG để đính kèm email.
   *
   * Vẽ ở ĐÂY chứ không ở bước 5, vì email xác nhận được gửi ngay lúc máy chủ
   * tạo booking — lúc đó bước 5 còn chưa hiện. Vé nằm trong một khối đặt
   * ngoài màn hình, khách không nhìn thấy.
   *
   * Hỏng thì trả chuỗi rỗng: thà email không có ảnh còn hơn hỏng cả booking.
   */
  const renderTicketImage = useCallback(async (): Promise<string> => {
    const node = hiddenTicketRef.current;
    if (!node) return "";

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          doc
            .querySelectorAll('style, link[rel="stylesheet"]')
            .forEach((el) => el.remove());
        },
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("[BookingTicket] render image failed:", err);
      return "";
    }
  }, []);

  const { priceLines, totalTextVND, totalTextUSD } = useMemo(() => {
    const lines: PriceLine[] = [];

    /**
     * Khách chọn gói ở bước 1 rồi mới nhập ngày bay ở bước 2, nên nếu ngày
     * rơi vào cuối tuần hoặc lễ thì giá thu cao hơn con số đã báo. Tách làm
     * hai dòng — giá gói như đã báo, rồi phụ thu — thay vì lặng lẽ hiện một
     * mức giá khác với lúc khách chọn.
     */
    const peakUnit = Number(billVND.peakSurchargePerPerson || 0);
    const flightUnit = peakUnit
      ? Number(billVND.quotedBasePerPerson || 0)
      : Number(billVND.basePricePerPerson || 0);
    const flightSub = flightUnit * pax;

    lines.push({
      label: L("flightCost", "Base flight price"),
      detail: `${formatMoneyVND(flightUnit)} × ${pax}`,
      amountText: formatMoneyVND(flightSub),
      type: "normal",
    });

    if (peakUnit > 0) {
      lines.push({
        label: peakSurchargeLabel(lang, billVND.holidayType),
        detail: `${formatMoneyVND(peakUnit)} × ${pax}`,
        amountText: formatMoneyVND(peakUnit * pax),
        type: "normal",
      });
    }

    if (cfg?.services?.length) {
      cfg.services.forEach((svc: any) => {
        if (svc.visibleForPackages?.length) {
          if (!data.packageKey) return;
          if (!svc.visibleForPackages.includes(data.packageKey)) return;
        }

        if (svc.visibleForFlightTypes?.length) {
          if (!data.flightTypeKey) return;
          if (!svc.visibleForFlightTypes.includes(data.flightTypeKey)) return;
        }

        const serviceState = data.services?.[svc.key];
        if (!serviceState?.selected) return;

        const qty = Math.max(1, serviceState.qty || 1);
        const lineTotal = getServiceLineTotalByCurrency(svc, "VND");
        if (lineTotal <= 0) return;

        const label = getLocalizedText(svc.label, lang, String(svc.key));
        const unitPrice = Number(svc.priceVND || 0);

        const key = String(svc.key || "");
        let detailText = "";

        if (key === "khau_pha_garrya_pickup") {
          const carCount = Math.ceil(guestsCount / 4);
          const carPrice = 500_000;
          detailText = `${formatMoneyVND(carPrice)} × ${carCount} xe × ${qty} chiều`;
        } else if (key === "ha_noi_private_hotel_pickup") {
          detailText = "";
        } else if (svc.controlType === "counter") {
          detailText = `${formatMoneyVND(unitPrice)} × ${qty}`;
        } else {
          detailText = `${formatMoneyVND(unitPrice)} × ${guestsCount}`;
        }

        lines.push({
          label,
          detail: detailText,
          amountText: formatMoneyVND(lineTotal),
          type: "normal",
        });
      });
    }

    const addonLabel: Record<string, string> = {
      pickup: L("hotelTransfer", "Hotel pickup / drop-off"),
      camera360: (t as any)?.labels?.camera360Cost ?? "Camera 360",
      flycam: (t as any)?.labels?.droneCost ?? "Drone/Flycam",
    };

    (["pickup", "camera360", "flycam"] as AddonKey[]).forEach((key) => {
      const qty = Number((billVND as any)?.addonsQty?.[key] || 0);
      if (!qty) return;

      const unit = Number((billVND as any)?.addonsUnitPrice?.[key] || 0);
      const sub =
        Number((billVND as any)?.addonsTotal?.[key] || 0) || unit * qty;

      lines.push({
        label: addonLabel[key] ?? String(key),
        detail: `${formatMoneyVND(unit)} × ${qty}`,
        amountText: formatMoneyVND(sub),
        type: "normal",
      });
    });

    const discountPerPerson = Number(billVND.discountPerPerson || 0);
    if (discountPerPerson > 0) {
      const discountTotal = discountPerPerson * pax;

      lines.push({
        label: (t as any)?.labels?.groupDiscount ?? "Group discount",
        detail: `-${formatMoneyVND(discountPerPerson)} × ${pax}`,
        amountText: `-${formatMoneyVND(discountTotal)}`,
        type: "discount",
      });
    }

    // Giảm combo ảnh (flycam + camera 360°). Trước đây dòng này chỉ được trừ
    // trong payload gửi lên máy chủ, còn tổng tiền hiện trên màn hình lại
    // quên trừ — khách thấy đắt hơn 100k so với số thật trên vé.
    if (imageComboOffVND > 0) {
      lines.push({
        label: imageComboLabel(lang),
        amountText: `-${formatMoneyVND(imageComboOffVND)}`,
        type: "discount",
      });
    }

    const grandTotalVND = Math.max(
      0,
      Number(billVND.totalAfterDiscount || 0) +
        selectedServicesTotalVND -
        imageComboOffVND,
    );
    const grandTotalUSD = Math.max(
      0,
      Number(billUSD.totalAfterDiscount || 0) +
        selectedServicesTotalUSD -
        imageComboOffUSD,
    );

    return {
      priceLines: lines,
      totalTextVND: formatMoneyVND(grandTotalVND),
      totalTextUSD: formatMoneyUSD(grandTotalUSD),
    };
  }, [
    billVND,
    billUSD,
    cfg?.services,
    data.packageKey,
    data.flightTypeKey,
    data.services,
    guestsCount,
    pax,
    lang,
    t,
    L,
    getServiceLineTotalByCurrency,
    selectedServicesTotalVND,
    selectedServicesTotalUSD,
    imageComboOffVND,
    imageComboOffUSD,
  ]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(undefined);

    try {
      const primaryName =
        (data as any)?.contact?.fullName?.trim?.() ||
        (data as any)?.contact?.contactName?.trim?.() ||
        data?.guests?.[0]?.fullName?.trim?.() ||
        "";

      const primaryPhone = (data as any)?.contact?.phone?.trim?.() || "";

      const missing: string[] = [];
      if (!primaryName) missing.push("contact name");
      if (!primaryPhone) missing.push("phone");
      if (!data?.dateISO) missing.push("date");
      if (!data?.location) missing.push("location");
      if (missingPickupAddress) throw new Error(ui.pickupAddressMissing);

      if (missing.length) {
        throw new Error(`Missing ${missing.join(", ")}.`);
      }

      const ticketImageBase64 = await renderTicketImage();

      const payload = {
        ...data,
        // Ảnh vé để máy chủ đính kèm email cho khách. Không lưu vào cơ sở dữ
        // liệu — route tạo booking loại bỏ trường này trước khi ghi.
        ticketImageBase64,
        name: primaryName,
        phone: primaryPhone,
        date: data.dateISO,
        location: data.location,
        locationName,
        packageLabel,
        flightTypeLabel: getFlightTypeLabel(lang, resolvedFlightTypeKey),

        // Ngôn ngữ khách đang dùng -> email và tiêu đề email gửi đúng thứ
        // tiếng đó. Trước đây email luôn tiếng Anh cho mọi khách.
        lang,
        // Danh sách "đã bao gồm" của đúng gói / điểm bay, đã dịch sẵn ở đây
        // để máy chủ khỏi phải tra lại cấu hình.
        includedLines: includedList.map((item) => item.text),
        // Dịch vụ khách chọn thêm, đã dịch sẵn — email hiện thành danh sách
        // có dấu ✓ giống trên vé.
        selectedServiceLines: [
          ...serviceLines.map((sl) => ({
            label: sl.label,
            qty: sl.qty,
            note: splitInputEntries(sl.inputText).join(" · "),
          })),
          ...(!hasPickupServiceLine && pickupAddonQty
            ? [{ label: L("hotelTransfer", "Pickup"), qty: pickupAddonQty }]
            : []),
          ...(!hasCameraServiceLine && camera360Qty
            ? [{ label: L("camera360", "360 camera"), qty: camera360Qty }]
            : []),
          ...(!hasFlycamServiceLine && flycamQty
            ? [{ label: L("drone", "Flycam"), qty: flycamQty }]
            : []),
        ],

        price: {
          currency: "VND",
          perPerson: billVND.totalPerPerson,
          basePerPerson: billVND.basePricePerPerson,
          discountPerPerson: billVND.discountPerPerson,
          addonsQty: (billVND as any).addonsQty,
          addonsUnitPrice: (billVND as any).addonsUnitPrice,
          addonsTotal: (billVND as any).addonsTotal,
          servicesBreakdown: imageComboOffVND
            ? [
                ...selectedServicesBreakdown,
                {
                  key: "image_combo_discount",
                  label: imageComboLabel(lang),
                  lineTotal: -imageComboOffVND,
                },
              ]
            : selectedServicesBreakdown,
          servicesTotal: selectedServicesTotalVND - imageComboOffVND,
          total: Math.max(
            0,
            Number(billVND.totalAfterDiscount || 0) +
              selectedServicesTotalVND -
              imageComboOffVND,
          ),
          usdTotal: Math.max(
            0,
            Number(billUSD.totalAfterDiscount || 0) +
              selectedServicesTotalUSD -
              imageComboOffUSD,
          ),
          usdPerPerson: billUSD.totalPerPerson,
        },

        selectedServices: serviceLines,
        holidayType: billVND.holidayType,
        createdAt: new Date().toISOString(),
      };

      const createResp: any = await createBooking(payload, turnstileToken);

      if (!createResp?.ok) {
        const serverMsg = createResp?.message || "Create booking failed";
        const serverErrs = createResp?.errors
          ? `\n${JSON.stringify(createResp.errors)}`
          : "";

        throw new Error(`${serverMsg}${serverErrs}`);
      }

      setBookingResult(createResp.booking || payload);

      try {
        await notifyTelegram({
          ...payload,
          ...(createResp.booking || {}),
          bookingId:
            createResp?.bookingId ||
            createResp?.booking?._id,
        });
      } catch (tgErr: any) {
        console.warn("Telegram failed:", tgErr?.message || tgErr);
      }

      next();
    } catch (e: any) {
      console.error("Booking confirmation failed:", e);

      const isTurnstileError =
        e?.status === 403 || e?.data?.error === "TURNSTILE_FAILED";

      if (isTurnstileError) {
        setError(
          e?.data?.message || "Turnstile validation failed. Please try again.",
        );
      } else {
        setError(e?.message || "Unable to submit. Please try again.");
      }

      setTurnstileToken("");
      setTurnstileKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const pickupAddonQty = getAddonQty("pickup");
  const camera360Qty = getAddonQty("camera360");
  const flycamQty = getAddonQty("flycam");

  const hasPackages = cfg?.packages && cfg.packages.length > 0;
  const showPackageRow = hasPackages || data.location === "khau_pha";
  /**
   * Hạng mục đón trả / camera 360 / flycam có thể do dịch vụ riêng của điểm
   * bay đảm nhiệm. Nhận diện theo BẢN CHẤT chứ không theo tên khoá: dịch vụ
   * "khau_pha_shuttle" (Xe trung chuyển xã Tú Lệ) không có chữ "pickup" trong
   * khoá nên bản cũ bỏ sót, khiến vé vừa ghi có xe đón vừa ghi
   * "Đón / trả tận nơi (không)" — hai dòng nói ngược nhau.
   */
  const hasPickupServiceLine = visibleSelectedServices.some((svc: any) => {
    const key = String(svc?.key || "").toLowerCase();
    const group = String(svc?.exclusiveGroup || "").toLowerCase();
    return (
      key.includes("pickup") ||
      group.includes("pickup") ||
      !!svc?.requiresPickupInput ||
      !!svc?.fixedMapUrl
    );
  });

  const hasCameraServiceLine = visibleSelectedServices.some((svc: any) => {
    const key = String(svc?.key || "").toLowerCase();
    return key.includes("camera360") || key.includes("camera_360");
  });

  const hasFlycamServiceLine = visibleSelectedServices.some((svc: any) => {
    const key = String(svc?.key || "").toLowerCase();
    return key.includes("flycam") || key.includes("drone");
  });

  const serviceDetails = [
    {
      label: L("location", "Flight location"),
      value: locationName,
    },
    {
      label: L("numGuests", "Passengers"),
      value: String(data.guestsCount || 1),
    },
    {
      label: L("date", "Date"),
      value: formatDate(data.dateISO),
    },
    {
      label: L("timeSlot", "Time"),
      value: data.timeSlot || ui.notSelected,
    },
    ...(showPackageRow
      ? [
          {
            label: ui.packageLabel,
            value: packageLabel,
          },
          {
            label: ui.flightTypeLabel,
            value: getFlightTypeLabel(lang, resolvedFlightTypeKey),
          },
          {
            label: L("dayType", "Day type"),
            value: getHolidayTypeLabel(lang, billVND.holidayType),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-sm">
        <div className="border-b border-[#DCE7F3] bg-[#0194F3] px-3 py-2.5 md:px-3">
          <h3 className="text-lg font-bold text-white md:text-xl">{ui.title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-white/90">{ui.subtitle}</p>
        </div>

        <div className="space-y-2 bg-[#F5F7FA] p-2.5 md:p-3">
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1.2fr_0.95fr]">
            <section className="rounded-xl border border-[#DCE7F3] bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0194F3]">
                {L("serviceDetails", "Service details")}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3">
                {serviceDetails.map((item) => (
                  <InfoBox
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#DCE7F3] bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0194F3]">
                {L("contactInfo", "Contact information")}
              </div>

              <div className="mt-2 space-y-1.5">
                <InfoLine
                  label={L("name", "Name")}
                  value={contactName || firstGuestName || ""}
                />
                <InfoLine
                  label={L("email", "Email")}
                  value={contactEmail || ""}
                />
                <InfoLine
                  label={L("phone", "Phone")}
                  value={contactPhone || ""}
                />
              </div>

              {/* Đổi từ xanh nhạt sang đỏ: đây là lời hứa liên hệ lại, khách
                  cần đọc thấy chứ không được lướt qua như một ghi chú phụ. */}
              <div className="mt-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-2.5 py-2 text-sm font-semibold text-[#B91C1C]">
                {ui.supportNote}
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white">
            {/* Luôn hiện, không gập lại: đây là phần khách cần soát kỹ nhất
                trước khi bấm xác nhận, bắt bấm thêm một lần là dễ bỏ qua. */}
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0194F3]">
                {ui.passengerList}
              </div>
              <span className="rounded-full bg-[#EAF4FE] px-2 py-0.5 text-xs font-semibold text-[#0194F3]">
                {(data.guests ?? []).length}
              </span>
            </div>

            {
              /* Mỗi khách một dòng: số thứ tự, tên in đậm, rồi các thông tin
                 phụ nối bằng dấu · và chỉ hiện những mục KHÁCH ĐÃ NHẬP. Trước
                 đây mỗi khách là một thẻ chứa 5 ô con, luôn hiện cả những ô
                 "Chưa chọn" — bốn khách là kín cả màn hình. */
              <ul className="divide-y divide-[#EDF2F7] border-t border-[#DCE7F3]">
                {(data.guests ?? []).map((guest: any, index: number) => {
                  const details = [
                    guest.dob,
                    guest.gender,
                    guest.weightKg ? `${guest.weightKg} kg` : "",
                    guest.nationality,
                    guest.idNumber,
                  ].filter(Boolean);

                  return (
                    <li
                      key={index}
                      className="flex items-baseline gap-2 px-3 py-2 text-sm leading-6"
                    >
                      <span className="shrink-0 font-bold text-[#0194F3]">
                        {index + 1}.
                      </span>

                      <span className="min-w-0">
                        <span className="font-semibold text-[#1C2930]">
                          {guest.fullName || ui.notSelected}
                        </span>
                        {details.length ? (
                          <span className="text-[#5B6B7A]">
                            {" — "}
                            {details.join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            }
          </section>

          {!!specialRequest && (
            <div className="rounded-lg border border-[#FF5E1F] bg-[#FFF4ED] p-3">
              <p className="mb-1 text-xs font-semibold text-[#FF5E1F]">
                {L("specialRequest", "Special requests")}
              </p>
              <p className="break-words text-sm text-[#1C2930]">{specialRequest}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-xl border border-[#DCE7F3] bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0194F3]">
                {L("additionalServices", "Additional services")}
              </div>

              {/* Một dòng text cho mỗi mục thay vì mỗi mục một thẻ có khung:
                  dấu ✕ đỏ cho thứ không chọn, ✓ xanh cho thứ có. Số lượng ghi
                  thẳng dạng "×2" nên không phải xuống dòng. */}
              {/* Thứ tự: những gì đã có trong giá (chuyến bay đứng đầu) →
                  dịch vụ khách chọn thêm → cuối cùng mới tới những mục KHÔNG
                  chọn, để mắt đọc từ trên xuống thấy ngay cái mình có.

                  Mỗi mục một dòng text, dấu ✕ đỏ cho thứ không chọn và ✓ xanh
                  cho thứ có; số lượng ghi thẳng dạng "×2" nên không xuống dòng. */}
              <ul className="mt-3 space-y-1">
                {/* 1. Đã nằm trong giá — lấy từ cấu hình gói / điểm bay (cùng
                       nguồn với thẻ "Đã bao gồm" ở bước 1), nên Khau Phạ và
                       Trạm Tấu tự có thêm dòng xe lên/xuống núi. */}
                {includedList.map((item, idx) => (
                  <ServiceItem key={`inc-${idx}`} ok>
                    <span className="font-semibold">{item.text}</span>
                    {item.tag !== "none" ? (
                      <span className="text-[#16A34A]">
                        {" "}
                        (
                        {item.tag === "free"
                          ? L("freeTag", "free")
                          : L("includedTag", "included")}
                        )
                      </span>
                    ) : null}
                  </ServiceItem>
                ))}

                {/* 2. Dịch vụ khách chọn thêm ở bước 1 */}
                {serviceLines.map((sl) => {
                  // Số lượng đứng trước, rồi mới tới ghi chú khách nhập
                  // (địa chỉ đón, ghi chú riêng...) — nối bằng dấu · để tất
                  // cả nằm gọn trên một dòng.
                  const notes = splitInputEntries(sl.inputText);

                  // Dịch vụ đón tại điểm cố định: "Xem bản đồ" phải là LINK
                  // bấm được, trước đây chỉ là chữ nên khách bấm không ra gì.
                  const showMap = notes.length === 0 && !!sl.fixedMapUrl;
                  const hasExtra = notes.length > 0 || showMap;

                  return (
                    <ServiceItem key={sl.key} ok>
                      <span className="font-semibold">{sl.label}</span>
                      {sl.qty > 0 || hasExtra ? ": " : ""}
                      {sl.qty > 0 ? <Qty n={sl.qty} /> : null}
                      {sl.qty > 0 && hasExtra ? " · " : ""}
                      {notes.join(" · ")}
                      {showMap ? (
                        <a
                          href={sl.fixedMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#0194F3] underline underline-offset-2"
                        >
                          {L("viewMap", "Xem bản đồ")}
                        </a>
                      ) : null}
                    </ServiceItem>
                  );
                })}

                {!hasPickupServiceLine && !!pickupAddonQty && (
                  <ServiceItem ok>
                    <span className="font-semibold">
                      {L("hotelTransfer", "Hotel pickup / drop-off")}
                    </span>
                    {": "}
                    <Qty n={pickupAddonQty} />
                  </ServiceItem>
                )}

                {!hasCameraServiceLine && !!camera360Qty && (
                  <ServiceItem ok>
                    <span className="font-semibold">
                      {L("camera360", "360 camera")}
                    </span>
                    {": "}
                    <Qty n={camera360Qty} />
                  </ServiceItem>
                )}

                {!hasFlycamServiceLine && !!flycamQty && (
                  <ServiceItem ok>
                    <span className="font-semibold">
                      {L("drone", "Flycam (drone camera)")}
                    </span>
                    {": "}
                    <Qty n={flycamQty} />
                  </ServiceItem>
                )}

                {/* 3. Không chọn — dồn hết xuống cuối */}
                {serviceLines.length === 0 && (
                  <ServiceItem ok={false} noLabel={L("noTag", "no")}>
                    {L("selectedServices", "Optional services")}
                  </ServiceItem>
                )}

                {!hasPickupServiceLine && !pickupAddonQty && (
                  <ServiceItem ok={false} noLabel={L("noTag", "no")}>
                    {L("hotelTransfer", "Hotel pickup / drop-off")}
                  </ServiceItem>
                )}

                {!hasCameraServiceLine && !camera360Qty && (
                  <ServiceItem ok={false} noLabel={L("noTag", "no")}>
                    {L("camera360", "360 camera")}
                  </ServiceItem>
                )}

                {!hasFlycamServiceLine && !flycamQty && (
                  <ServiceItem ok={false} noLabel={L("noTag", "no")}>
                    {L("drone", "Flycam (drone camera)")}
                  </ServiceItem>
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-[#D6EAFB] bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#0194F3]">
                {L("priceBreakdown", "Price breakdown")}
              </div>

              <div className="mt-2 space-y-1.5">
                {priceLines.map((line, index) => (
                  <div
                    key={index}
                    className={`flex items-start justify-between gap-2 ${
                      line.type === "discount" ? "text-[#16A34A]" : "text-[#1C2930]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-[#1C2930]">
                        {line.label}
                      </p>
                      {line.detail ? (
                        <p className="break-words text-xs text-[#94A3B8]">
                          {line.detail}
                        </p>
                      ) : null}
                    </div>

                    <span className="whitespace-nowrap text-sm font-semibold">
                      {line.amountText}
                    </span>
                  </div>
                ))}

                <div className="h-px bg-[#DCE7F3]" />

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-bold text-[#1C2930]">
                    {L("totalCost", "Total")}
                  </span>

                  <span className="text-right">
                    <span className="text-xl font-bold text-[#FF5E1F]">
                      {totalTextVND}
                    </span>{" "}
                    <span className="text-sm font-semibold text-[#5B6B7A]">
                      ({totalTextUSD})
                    </span>
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-[#DCE7F3] bg-white p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-[#0194F3]">
              {ui.paymentTitle}
            </div>

            {/* 2 cột trên máy nhỏ, 4 cột từ sm trở lên — trước đây tối đa 2
                cột nên bốn phương thức chiếm hai hàng ngay cả trên desktop. */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#5B6B7A] sm:grid-cols-4">
              <PaymentItem text={L("cashPayment", "Cash payment")} />
              <PaymentItem text={L("bankTransfer", "Bank transfer")} />
              <PaymentItem text={L("paypalPayment", "PayPal")} />
              <PaymentItem text={L("creditCard", "Credit card")} />
            </div>
          </section>

          <section className="rounded-xl border border-[#F3E38F] bg-[#FFF9DB] p-3">
            <p className="text-sm font-semibold text-[#7A5414]">
              {ui.paymentInfoTitle}:
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#7A5414]">
              {ui.paymentInfoDescription}
            </p>
          </section>

          <section className="rounded-xl border border-[#DCE7F3] bg-white p-3">
            <TurnstileWidget
              key={turnstileKey}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
              lang={lang}
              theme="light"
            />
          </section>

          {/* Điều khoản hiện thẳng ra để khách cuộn đọc tại chỗ. Trước đây
              phải bấm link mới bung hộp thoại — thêm một bước mà hầu như
              không ai bấm, nên chữ ký đồng ý ở dưới thành ra ký khống. */}
          <section className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE7F3] bg-[#F5F7FA] px-3 py-2">
              <span className="text-sm font-semibold text-[#1C2930]">
                {ui.termsTitle}
              </span>
              <a
                href={termsUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-[#0194F3] underline underline-offset-2"
              >
                {ui.openInNewTab}
              </a>
            </div>

            <div
              className="prose prose-sm max-w-none h-56 overflow-y-auto px-3 py-2.5 text-[13px] leading-relaxed text-[#42555F]
                [&_h1]:mb-3 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-[#1C2930]
                [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-[#1C2930]
                [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#1C2930]
                [&_p]:mb-2
                [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5
                [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: termsContent }}
            />

            <label className="flex cursor-pointer items-start gap-3 border-t border-[#DCE7F3] bg-[#F8FBFF] p-3 transition hover:bg-[#EAF4FE]">
              <input
                type="checkbox"
                checked={!!data.acceptedTerms}
                onChange={(e) => update({ acceptedTerms: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-[#DCE7F3] text-[#0194F3] focus:ring-[#0194F3]"
              />
              <span className="text-sm text-[#1C2930]">
                {(t as any)?.labels?.termsText ?? "I have read and agree to the"}{" "}
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0194F3] underline underline-offset-2 hover:text-[#0B6FC4]"
                >
                  {(t as any)?.labels?.viewTerms ?? "terms of service"}
                </a>
              </span>
            </label>
          </section>
        </div>
      </div>

      {/* Vé vẽ sẵn để chụp thành ảnh đính kèm email. Đặt ngoài màn hình chứ
          không dùng display:none — html2canvas không chụp được phần tử ẩn. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 760,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div ref={hiddenTicketRef} style={{ background: "#ffffff", padding: 14 }}>
          <BookingTicket
            booking={data as any}
            totals={billVND}
            lang={lang as any}
            bookingResult={{ bookingCode: previewBookingCode }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#DC2626] bg-red-50 p-3 text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Trước đây justify-between đẩy "Quay lại" và "Tiếp theo" ra hai mép,
          trên màn hình rộng hai nút cách nhau cả gang tay. Nay cụm nút nằm
          giữa trang và sát nhau. */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={back}
          className="cta-btn h-12 min-w-[130px] rounded-xl border border-[#DCE7F3] bg-white px-6 text-base font-medium text-[#5B6B7A] transition hover:border-[#B9DDFB] hover:bg-[#F5F7FA]"
        >
          {t.buttons.back}
        </button>

        <button
          type="button"
          disabled={
            !data.acceptedTerms ||
            !turnstileToken ||
            submitting ||
            missingPickupAddress
          }
          onClick={handleConfirm}
          className="cta-btn h-12 min-w-[170px] rounded-xl bg-[#0194F3] px-6 text-base font-semibold text-white shadow-md transition hover:bg-[#0B83D9] disabled:bg-[#B9DDFB] disabled:shadow-none"
        >
          {submitting ? t.buttons.processing : t.buttons.confirm}
        </button>
      </div>

    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-2.5 py-1.5">
      <div className="text-[11px] uppercase tracking-wide text-[#5B6B7A]">
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-[#1C2930]">
        {value}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-2.5 py-1.5">
      <span className="text-sm text-[#5B6B7A]">{label}</span>
      <span className="break-words text-right text-sm font-semibold text-[#1C2930]">
        {value}
      </span>
    </div>
  );
}



function PaymentItem({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-2 py-2 text-center">
      <span className="shrink-0 text-[#16A34A]">✔</span>
      <span className="text-[#1C2930]">{text}</span>
    </div>
  );
}