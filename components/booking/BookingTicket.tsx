"use client";

import React, { useMemo } from "react";
import type { BookingData } from "@/store/booking-store";
import {
  LOCATIONS,
  formatByLang,
  type AddonKey,
  type ComputeResult,
} from "@/lib/booking/calculate-price";
import type { LangCode } from "@/lib/booking/translations-booking";
import { bookingTranslations } from "@/lib/booking/translations-booking";

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

type Props = {
  booking: BookingData;
  totals: ComputeResult;
  lang: LangCode;
  bookingResult?: any;
};

type PriceLine = {
  label: string;
  detail?: string;
  amountText: string;
  type?: "normal" | "discount";
};

const C = {
  bg: "#ffffff",
  card: "#F5F7FA",
  text: "#1C2930",
  subtext: "#5B6B7A",
  muted: "#5B6B7A",
  border: "#DCE7F3",
  line: "#DCE7F3",
  accent: "#0194F3",
  accentDark: "#0B83D9",
  accentSoft: "#EAF4FE",
  success: "#16A34A",
  warningBg: "#FFF4ED",
  warningBorder: "#FF5E1F",
  warningText: "#9a3412",
  totalBg: "#0194F3",
  white: "#ffffff",
  badgeBg: "#EAF4FE",
  badgeText: "#0194F3",
  orange: "#FF5E1F",
  orangeSoft: "#FFF4ED",
};

function digitsOnly(s: string) {
  return (s || "").replace(/\D+/g, "");
}

function normalizeDateToYYYYMMDD(dateISO?: string) {
  const raw = (dateISO || "").trim();
  if (!raw) return "";
  const parts = raw.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length !== 3) return "";
  if (parts[0].length === 4) {
    const [yyyy, mm, dd] = parts;
    return `${yyyy}${mm.padStart(2, "0")}${dd.padStart(2, "0")}`;
  }
  if (parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}${mm.padStart(2, "0")}${dd.padStart(2, "0")}`;
  }
  return "";
}

function formatDateDisplay(dateISO?: string) {
  const raw = (dateISO || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function splitInputEntries(raw?: string) {
  return String(raw || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBookingRef(dateISO?: string, phone?: string) {
  const ymd = normalizeDateToYYYYMMDD(dateISO);
  const phoneDigits = digitsOnly(phone || "");
  const last4 = phoneDigits ? phoneDigits.slice(-4) : "";
  if (ymd && last4) return `${ymd}-${last4}`;
  return `MBL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

type IncludedTag = "none" | "free" | "included";

/**
 * Nhãn cho một mục trong danh sách đã có trong giá:
 * mục đầu tiên là chính chuyến bay (không nhãn), đồ uống và ảnh/video là quà
 * tặng kèm -> (miễn phí), phần còn lại -> (đã bao gồm).
 * Giống quy tắc ở components/booking/review-confirm-step.tsx.
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
  const lower = String(viText || "").toLowerCase();
  return FREE_KEYWORDS.some((k) => lower.includes(k)) ? "free" : "included";
}

/**
 * Ngày giờ hiển thị trên vé, luôn theo giờ Việt Nam (UTC+7).
 *
 * Máy chủ lưu createdAt dạng ISO UTC ("2026-08-08T08:24:24.556Z"); in thẳng
 * ra vé thì vừa khó đọc vừa lệch 7 tiếng so với giờ khách đặt. Ép múi giờ
 * Asia/Ho_Chi_Minh chứ không dùng múi giờ máy khách, để vé của khách nước
 * ngoài cũng ghi đúng giờ tại điểm bay.
 */
function formatVietnamDateTime(value?: string): string {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return String(value ?? "");

  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function useTicketLabels(lang: LangCode) {
  const L = lang as unknown as string;
  const t = (bookingTranslations as any)[L] ?? bookingTranslations.en;

  const isVI = L === "vi";
  const isFR = L === "fr";
  const isRU = L === "ru";
  const isHI = L === "hi";
  const isZH = L === "zh" || L === "zh-CN" || L === "zh-Hans";
  const isZHTW = L === "zh-TW" || L === "zh-Hant";

  const zh = (simplified: string, traditional: string) =>
    isZHTW ? traditional : simplified;

  return {
    title: isVI
      ? "VÉ BAY DÙ LƯỢN"
      : isFR
        ? "Billet de réservation"
        : isRU
          ? "Билет на полёт"
          : isHI
            ? "बुकिंग टिकट"
            : isZH || isZHTW
              ? zh("预订票", "預訂票")
              : "Booking Ticket",
    subtitle: isVI
      ? "Xác nhận thông tin đặt bay"
      : isFR
        ? "Confirmation des détails"
        : isRU
          ? "Подтверждение dữ liệu"
          : isHI
            ? "बुकिंग विवरण पुष्टि"
            : isZH || isZHTW
              ? zh("请确认预订信息", "請確認預訂資訊")
              : "Booking details confirmed",
    created: isVI
      ? "Tạo lúc"
      : isFR
        ? "Créé le"
        : isRU
          ? "Создано"
          : isHI
            ? "बनाया गया"
            : isZH || isZHTW
              ? zh("创建时间", "建立時間")
              : "Created",
    confirmed: isVI
      ? "Đã xác nhận"
      : isFR
        ? "Confirmé"
        : isRU
          ? "Подтверждено"
          : isHI
            ? "पुष्ट"
            : isZH || isZHTW
              ? zh("已确认", "已確認")
              : "Confirmed",
    brandName: "MEBAYLUON PARAGLIDING",
    serviceDetails: isVI ? "Thông tin chuyến bay" : isFR ? "Détails du vol" : isRU ? "Детали полёта" : isHI ? "फ्लाइट विवरण" : isZH || isZHTW ? zh("飞行信息", "飛行資訊") : "Flight details",
    contactInfo: (t as any)?.labels?.contactInfo ?? "Contact information",
    passengersList: isVI ? "Danh sách khách bay" : isFR ? "Liste des passagers" : isRU ? "Список пассажиров" : isHI ? "यात्रियों की सूची" : isZH || isZHTW ? zh("乘客名单", "乘客名單") : "Passengers",
    additionalServices: isVI ? "Dịch vụ đã chọn" : isFR ? "Services sélectionnés" : isRU ? "Выбранные услуги" : isHI ? "चयनित सेवाएँ" : isZH || isZHTW ? zh("已选服务", "已選服務") : "Selected services",
    priceBreakdown: isVI ? "Chi tiết giá" : isFR ? "Détail des prix" : isRU ? "Детализация цены" : isHI ? "मूल्य विवरण" : isZH || isZHTW ? zh("价格明细", "價格明細") : "Price breakdown",
    total: isVI ? "Tổng cộng" : isFR ? "Total" : isRU ? "Итого" : isHI ? "कुल" : isZH || isZHTW ? zh("总计", "總計") : "Total",
    service: isVI ? "Điểm bay" : isFR ? "Site" : isRU ? "Локация" : isHI ? "स्थान" : isZH || isZHTW ? zh("飞行点", "飛行點") : "Location",
    date: (t as any)?.labels?.date ?? "Date",
    time: (t as any)?.labels?.timeSlot ?? "Time",
    location: (t as any)?.labels?.location ?? "Location",
    guests: (t as any)?.labels?.numGuests ?? "Passengers",
    packageLabel: isVI ? "Gói bay" : isFR ? "Forfait" : isRU ? "Пакет" : isHI ? "पैकेज" : isZH || isZHTW ? zh("套餐", "套餐") : "Package",
    flightTypeLabel: isVI ? "Loại bay" : isFR ? "Type de vol" : isRU ? "Тип полёта" : isHI ? "फ्लाइट प्रकार" : isZH || isZHTW ? zh("飞行类型", "飛行類型") : "Flight type",
    dayTypeLabel: isVI ? "Loại ngày" : isFR ? "Type de jour" : isRU ? "Тип дня" : isHI ? "दिन का प्रकार" : isZH || isZHTW ? zh("日期类型", "日期類型") : "Day type",
    name: isVI ? "Tên" : "Name",
    phone: (t as any)?.labels?.phone ?? "Phone",
    email: "Email",
    pickupLocation: isVI ? "Đón / trả" : isFR ? "Prise en charge" : isRU ? "Трансфер" : isHI ? "पिकअप" : isZH || isZHTW ? zh("接送", "接送") : "Pickup",
    selectedServicesList: isVI ? "Danh sách dịch vụ" : isFR ? "Liste des services" : isRU ? "Список услуг" : isHI ? "सेवा सूची" : isZH || isZHTW ? zh("服务列表", "服務列表") : "Service list",
    specialRequests: isVI ? "Yêu cầu đặc biệt" : isFR ? "Demandes spéciales" : isRU ? "Особые запросы" : isHI ? "विशेष अनुरोध" : isZH || isZHTW ? zh("特殊要求", "特殊要求") : "Special requests",
    flightCost: isVI ? "Giá bay" : isFR ? "Prix du vol" : isRU ? "Стоимость полёта" : isHI ? "फ्लाइट शुल्क" : isZH || isZHTW ? zh("飞行费用", "飛行費用") : "Flight cost",
    surcharge: isVI ? "Phụ thu" : isFR ? "Supplément" : isRU ? "Доплата" : isHI ? "अधिभार" : isZH || isZHTW ? zh("附加费", "附加費") : "Surcharge",
    camera360Cost: isVI ? "Camera 360" : "Camera 360",
    droneCost: isVI ? "Flycam / Drone" : "Drone / Flycam",
    groupDiscount: (t as any)?.labels?.groupDiscount ?? (isVI ? "Giảm giá nhóm" : "Group discount"),
    freeTag: isVI ? "miễn phí" : isFR ? "offert" : isRU ? "бесплатно" : isHI ? "निःशुल्क" : isZH || isZHTW ? zh("免费", "免費") : "free",
    includedTag: isVI ? "đã bao gồm" : isFR ? "inclus" : isRU ? "включено" : isHI ? "शामिल" : isZH || isZHTW ? zh("已包含", "已包含") : "included",
    noTag: isVI ? "không" : isFR ? "non" : isRU ? "нет" : isHI ? "नहीं" : isZH || isZHTW ? zh("无", "無") : "no",

    // Hướng dẫn nhanh in ngay trên vé
    quickGuideTitle: isVI ? "Hướng dẫn nhanh khi đi bay" : isFR ? "Aide-mémoire avant le vol" : isRU ? "Памятка перед полётом" : isHI ? "उड़ान से पहले संक्षिप्त गाइड" : isZH || isZHTW ? zh("飞行前速查", "飛行前速查") : "Quick pre-flight guide",
    guideWearTitle: isVI ? "Trang phục" : isFR ? "Tenue" : isRU ? "Одежда" : isHI ? "पहनावा" : isZH || isZHTW ? zh("着装", "著裝") : "What to wear",
    guideBringTitle: isVI ? "Nên mang theo" : isFR ? "À emporter" : isRU ? "Взять с собой" : isHI ? "साथ लाएँ" : isZH || isZHTW ? zh("建议携带", "建議攜帶") : "What to bring",
    guideAvoidTitle: isVI ? "Không mang theo" : isFR ? "À éviter" : isRU ? "Не брать" : isHI ? "न लाएँ" : isZH || isZHTW ? zh("请勿携带", "請勿攜帶") : "What to leave behind",

    guideWear: isVI
      ? ["Quần dài, áo tay dài, gọn gàng", "Giày thể thao hoặc giày leo núi", "Không mặc váy, không đi cao gót / dép lê"]
      : isFR
        ? ["Pantalon et manches longues", "Baskets ou chaussures de randonnée", "Ni jupe, ni talons, ni tongs"]
        : isRU
          ? ["Длинные брюки и рукава", "Кроссовки или треккинговая обувь", "Без юбки, каблуков и шлёпанцев"]
          : isHI
            ? ["लंबी पैंट और पूरी बाँह", "स्नीकर्स या ट्रेकिंग जूते", "स्कर्ट, हील्स या चप्पल नहीं"]
            : isZH || isZHTW
              ? [zh("长裤、长袖，衣着利落", "長褲、長袖，衣著俐落"), zh("运动鞋或登山鞋", "運動鞋或登山鞋"), zh("勿穿裙子、高跟鞋或拖鞋", "勿穿裙子、高跟鞋或拖鞋")]
              : ["Long trousers and sleeves", "Trainers or hiking shoes", "No skirts, heels or flip-flops"],

    guideBring: isVI
      ? ["Giấy tờ tuỳ thân (CCCD / Hộ chiếu)", "Kính râm, áo khoác mỏng", "Túi nhỏ 1–2 kg cho đồ cá nhân"]
      : isFR
        ? ["Pièce d'identité ou passeport", "Lunettes de soleil, veste légère", "Petit sac de 1 à 2 kg"]
        : isRU
          ? ["Паспорт или удостоверение", "Очки от солнца, лёгкая куртка", "Небольшая сумка 1–2 кг"]
          : isHI
            ? ["पहचान पत्र या पासपोर्ट", "धूप का चश्मा, हल्की जैकेट", "1–2 किग्रा का छोटा बैग"]
            : isZH || isZHTW
              ? [zh("身份证件或护照", "身分證件或護照"), zh("墨镜、薄外套", "墨鏡、薄外套"), zh("1–2 公斤随身小包", "1–2 公斤隨身小包")]
              : ["ID card or passport", "Sunglasses and a light jacket", "A small 1–2 kg bag"],

    guideAvoid: isVI
      ? ["Vật sắc nhọn, gậy selfie", "Đồ dễ rơi: mũ rộng vành, khăn choàng", "Tư trang giá trị cao"]
      : isFR
        ? ["Objets pointus, perche à selfie", "Objets qui tombent : chapeau, écharpe", "Objets de valeur"]
        : isRU
          ? ["Острые предметы, селфи-палка", "То, что легко потерять: шляпа, шарф", "Ценные вещи"]
          : isHI
            ? ["नुकीली चीज़ें, सेल्फ़ी स्टिक", "गिरने वाली चीज़ें: टोपी, स्कार्फ़", "क़ीमती सामान"]
            : isZH || isZHTW
              ? [zh("尖锐物品、自拍杆", "尖銳物品、自拍桿"), zh("易掉落物：宽檐帽、围巾", "易掉落物：寬簷帽、圍巾"), zh("贵重物品", "貴重物品")]
              : ["Sharp objects, selfie sticks", "Loose items: wide hats, scarves", "Valuables"],

    guideNote: isVI
      ? "Có mặt trước giờ bay 15 phút. Nếu bạn có vấn đề tim mạch, huyết áp, động kinh hoặc đang mang thai, vui lòng báo phi công trước khi bay."
      : isFR
        ? "Arrivez 15 minutes avant le vol. En cas de problème cardiaque, de tension, d'épilepsie ou de grossesse, prévenez le pilote avant le décollage."
        : isRU
          ? "Приходите за 15 минут до полёта. При проблемах с сердцем, давлением, эпилепсии или беременности предупредите пилота заранее."
          : isHI
            ? "उड़ान से 15 मिनट पहले पहुँचें। हृदय, रक्तचाप, मिर्गी की समस्या या गर्भावस्था हो तो पायलट को पहले बताएँ।"
            : isZH || isZHTW
              ? zh("请提前 15 分钟抵达。如有心脏、血压、癫痫问题或正在怀孕，请飞行前告知飞行员。", "請提前 15 分鐘抵達。如有心臟、血壓、癲癇問題或正在懷孕，請飛行前告知飛行員。")
              : "Arrive 15 minutes before your flight. If you have heart or blood-pressure conditions, epilepsy, or are pregnant, tell your pilot beforehand.",
    free: isVI ? "Miễn phí" : "Free",
    included: isVI ? "Bao gồm" : "Included",
    yes: isVI ? "Có" : "Yes",
    no: isVI ? "Không" : "No",
    notProvided: isVI ? "Chưa cung cấp" : isFR ? "Non fourni" : isRU ? "Не указано" : isHI ? "प्रदान नहीं" : isZH || isZHTW ? zh("未提供", "未提供") : "Not provided",
    pax: isVI ? "khách" : isFR ? "pers" : isRU ? "чел" : isHI ? "यात्री" : isZH || isZHTW ? zh("人", "人") : "pax",
    weekday: isVI ? "Ngày thường" : isFR ? "Jour ouvré" : isRU ? "Будний день" : isHI ? "कार्यदिवस" : isZH || isZHTW ? zh("工作日", "工作日") : "Weekday",
    weekend: isVI ? "Cuối tuần" : isFR ? "Week-end" : isRU ? "Выходной" : isHI ? "सप्ताहांत" : isZH || isZHTW ? zh("周末", "週末") : "Weekend",
    holiday: isVI ? "Ngày lễ" : isFR ? "Jour férié" : isRU ? "Праздничный день" : isHI ? "छुट्टी" : isZH || isZHTW ? zh("节假日", "節假日") : "Holiday",
    paragliding: isVI ? "Bay dù không động cơ" : isFR ? "Parapente" : isRU ? "Параплан" : isHI ? "पैराग्लाइडिंग" : isZH || isZHTW ? zh("无动力滑翔伞", "無動力滑翔傘") : "Paragliding",
    paramotor: isVI ? "Bay dù gắn động cơ" : isFR ? "Paramoteur" : isRU ? "Парамотор" : isHI ? "पैरामोटर" : isZH || isZHTW ? zh("动力伞", "動力傘") : "Paramotor",
    notSelected: isVI ? "Chưa chọn" : isFR ? "Non sélectionné" : isRU ? "Не выбрано" : isHI ? "चयन नहीं" : isZH || isZHTW ? zh("未选择", "未選擇") : "Not selected",
    safetyNote: isVI
      ? "Vui lòng có mặt trước 15 phút để briefing an toàn."
      : isFR
        ? "Veuillez arriver 15 minutes à l'avance pour le briefing de sécurité."
        : isRU
          ? "Пожалуйста, прибудьте за 15 минут до инструктажа по безопасности."
          : isHI
            ? "कृपया सुरक्षा ब्रीफिंग के लिए 15 मिनट पहले पहुँचें।"
            : isZH || isZHTW
              ? zh("请提前15分钟到达参加安全简报。", "請提前15分鐘到達參加安全簡報。")
              : "Please arrive 15 minutes early for safety briefing.",
  };
}

function getFlightTypeLabel(
  labels: ReturnType<typeof useTicketLabels>,
  key?: string
) {
  if (key === "paramotor") return labels.paramotor;
  if (key === "paragliding") return labels.paragliding;
  return labels.notSelected;
}

function getHolidayTypeLabel(
  labels: ReturnType<typeof useTicketLabels>,
  holidayType?: "weekday" | "weekend" | "holiday"
) {
  if (holidayType === "holiday") return labels.holiday;
  if (holidayType === "weekend") return labels.weekend;
  return labels.weekday;
}

/** Nhãn dòng phụ thu trên vé — cùng chữ với bảng giá ở bước 4. */
function getPeakSurchargeLabel(
  labels: ReturnType<typeof useTicketLabels>,
  holidayType?: "weekday" | "weekend" | "holiday",
) {
  return `${labels.surcharge} ${getHolidayTypeLabel(labels, holidayType)}`;
}

export default function BookingTicket({
  booking,
  totals,
  lang,
  bookingResult,
}: Props) {
  const cfg = LOCATIONS[booking.location];
  const labels = useTicketLabels(lang);

  const contact: any = booking?.contact || {};
  const contactName = (
    contact?.fullName ??
    contact?.contactName ??
    ""
  ).toString();
  const contactPhone = (contact?.phone ?? "").toString();
  const contactEmail = (contact?.email ?? "").toString();
  const specialRequest = (
    contact?.specialRequest ??
    bookingResult?.specialRequest ??
    ""
  ).toString();

  const createdAt = formatVietnamDateTime(
    bookingResult?.createdAt || bookingResult?.createdAtISO,
  );

  const locationName = cfg?.name?.[lang] || cfg?.name?.vi || "—";
  const hasPackages = !!(cfg?.packages && cfg.packages.length > 0);

  const bookingRef = buildBookingRef(booking.dateISO, contactPhone);
  const passengers: any[] = (booking as any)?.guests ?? [];
  const guestsCount = Math.max(1, booking.guestsCount || 1);

  const packageLabel =
    cfg?.packages?.find((p: any) => p.key === booking.packageKey)?.label?.[lang] ??
    cfg?.packages?.find((p: any) => p.key === booking.packageKey)?.label?.vi ??
    labels.notSelected;

  const flightTypeLabel =
    booking.location === "khau_pha"
      ? getFlightTypeLabel(labels, booking.flightTypeKey)
      : getFlightTypeLabel(labels, "paragliding");

  const selectedServices = useMemo(() => {
    const services = cfg?.services || [];
    return services
      .filter((svc: any) => {
        if (svc.visibleForPackages?.length) {
          if (!booking.packageKey) return false;
          if (!svc.visibleForPackages.includes(booking.packageKey)) return false;
        }
        return !!booking.services?.[svc.key]?.selected;
      })
      .map((svc: any) => ({
        key: svc.key,
        label: svc.label?.[lang] ?? svc.label?.vi ?? svc.key,
        inputText: booking.services?.[svc.key]?.inputText || "",
        qty: Math.max(1, Number(booking.services?.[svc.key]?.qty || 1)),
        controlType: svc.controlType,
        priceVND: Number(svc.priceVND || 0),
        priceUSD: Number(svc.priceUSD || 0),
        requiresPickupInput: !!svc.requiresPickupInput,
        fixedMapUrl: svc.fixedMapUrl || "",
      }));
  }, [booking.packageKey, booking.services, cfg?.services, lang]);


  const selectedAddonItems = useMemo(() => {
    const hasCameraService = selectedServices.some((svc) =>
      String(svc.key || "").toLowerCase().includes("camera360"),
    );
    const hasFlycamService = selectedServices.some((svc) => {
      const key = String(svc.key || "").toLowerCase();
      return key.includes("flycam") || key.includes("drone");
    });

    return ADDON_KEYS.map((k) => {
      const qty = Number(totals.addonsQty?.[k] || 0);
      if (qty <= 0) return null;

      if (k === "camera360" && hasCameraService) return null;
      if (k === "flycam" && hasFlycamService) return null;

      const label =
        cfg?.addons?.[k]?.label?.[lang] ??
        cfg?.addons?.[k]?.label?.vi ??
        String(k);

      return {
        key: `addon-${k}`,
        label: String(label),
        detail: `${qty} ${labels.pax}`,
      };
    }).filter(Boolean) as Array<{ key: string; label: string; detail?: string }>;
  }, [selectedServices, totals.addonsQty, cfg?.addons, lang, labels.pax]);

  /**
   * Những gì đã nằm trong giá, kèm nhãn (miễn phí) / (đã bao gồm) — giống hệt
   * cách bước 4 hiển thị, để vé và màn hình xác nhận không nói khác nhau.
   * Phân loại xét trên chuỗi tiếng Việt của cùng chỉ số (các mảng ngôn ngữ
   * song song nhau), nên chỉ cần một bộ từ khoá.
   */
  const includedItems = useMemo(() => {
    const pkgCfg = (cfg as any)?.packages?.find(
      (pk: any) => pk.key === booking.packageKey,
    );
    const source = pkgCfg?.included ?? (cfg as any)?.included;
    const items = (source?.[lang] ?? source?.vi ?? []) as string[];
    const viItems = (source?.vi ?? []) as string[];

    return items.map((text, idx) => ({
      text,
      tag: includedTagOf(viItems[idx] ?? text, idx),
    }));
  }, [cfg, booking.packageKey, lang]);

  /** Dịch vụ khách CÓ chọn: tên + số lượng + ghi chú khách nhập. */
  const chosenServiceRows = useMemo(() => {
    const fromServices = selectedServices.map((svc) => {
      const notes = splitInputEntries(svc.inputText);
      if (!notes.length && svc.fixedMapUrl) {
        notes.push(lang === "vi" ? "Xem bản đồ" : "View map");
      }

      const qty =
        svc.controlType === "counter"
          ? Math.max(1, Number(svc.qty) || 1)
          : svc.priceVND || svc.priceUSD
            ? guestsCount
            : 0;

      return { key: String(svc.key), label: String(svc.label), qty, notes };
    });

    const fromAddons = selectedAddonItems.map((a) => ({
      key: a.key,
      label: a.label,
      qty: Number(String(a.detail || "").replace(/\D/g, "")) || 0,
      notes: [] as string[],
    }));

    return [...fromServices, ...fromAddons];
  }, [selectedServices, selectedAddonItems, lang, guestsCount]);

  /** Dịch vụ tuỳ chọn khách KHÔNG chọn — vé vẫn ghi để khách khỏi thắc mắc. */
  const missingServiceRows = useMemo(() => {
    const taken = new Set(
      chosenServiceRows.map((r) => r.label.toLowerCase()),
    );

    return ADDON_KEYS.map((k) => {
      if (Number(totals.addonsQty?.[k] || 0) > 0) return null;

      const label = String(
        cfg?.addons?.[k]?.label?.[lang] ?? cfg?.addons?.[k]?.label?.vi ?? k,
      );
      if (taken.has(label.toLowerCase())) return null;

      return { key: `miss-${k}`, label };
    }).filter(Boolean) as Array<{ key: string; label: string }>;
  }, [chosenServiceRows, totals.addonsQty, cfg?.addons, lang]);


  const selectedServicePriceRows = useMemo(() => {
    return selectedServices
      .map((svc) => {
        const baseUnit = lang === "vi" ? Number(svc.priceVND || 0) : Number(svc.priceUSD || 0);
        const qty = Math.max(1, Number(svc.qty || 1));

        const serviceKey = String(svc.key || "");
        let lineTotal =
          svc.controlType === "counter" ? baseUnit * qty : baseUnit * guestsCount;
        let detail: string | undefined =
          svc.controlType === "counter"
            ? `${formatByLang(lang, baseUnit, baseUnit)} × ${qty}`
            : `${formatByLang(lang, baseUnit, baseUnit)} × ${guestsCount}`;

        if (serviceKey === "khau_pha_garrya_pickup") {
          // số xe × số chiều (qty: 1-2) × 500.000 đ/xe/chiều
          const carCount = Math.ceil(guestsCount / 4);
          const carPrice = lang === "vi" ? 500_000 : 20;
          lineTotal = carCount * qty * carPrice;
          detail = `${formatByLang(lang, carPrice, carPrice)} × ${carCount} ${lang === "vi" ? "xe" : "car"} × ${qty} ${lang === "vi" ? "chiều" : "way"}`;
        }

        if (serviceKey === "ha_noi_private_hotel_pickup") {
          lineTotal = lang === "vi"
            ? 1_400_000 + Math.max(0, guestsCount - 3) * 350_000
            : 56 + Math.max(0, guestsCount - 3) * 14;
          detail = undefined;
        }

        if (lineTotal <= 0) return null;

        return {
          label: String(svc.label),
          detail,
          lineTotal,
        };
      })
      .filter(Boolean) as Array<{ label: string; detail?: string; lineTotal: number }>;
  }, [selectedServices, lang, guestsCount]);

  const bookingPrice = useMemo(() => bookingResult?.price || {}, [bookingResult?.price]);
  
  const servicesBreakdownFromResult = useMemo(() => {
    return Array.isArray(bookingPrice?.servicesBreakdown)
      ? bookingPrice.servicesBreakdown
      : [];
  }, [bookingPrice]);

  const hasServicesBreakdownFromResult = servicesBreakdownFromResult.length > 0;
  const servicesTotalFromResult = Number(bookingPrice?.servicesTotal);
  const hasServicesTotalFromResult = Number.isFinite(servicesTotalFromResult) && servicesTotalFromResult > 0;
  const totalFromResult = Number(bookingPrice?.total);
  const hasTotalFromResult = Number.isFinite(totalFromResult) && totalFromResult > 0;

  const selectedServicesTotal = useMemo(() => {
    if (hasServicesTotalFromResult) return servicesTotalFromResult;
    return selectedServicePriceRows.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0);
  }, [hasServicesTotalFromResult, servicesTotalFromResult, selectedServicePriceRows]);

  const totalWithSelectedServices = hasTotalFromResult
    ? totalFromResult
    : Number(totals.totalAfterDiscount || 0) + selectedServicesTotal;

  const addonRows = useMemo(() => {
    return ADDON_KEYS.map((k) => {
      const qty = totals.addonsQty?.[k] || 0;
      const unit = totals.addonsUnitPrice?.[k] || 0;
      const total = totals.addonsTotal?.[k] || 0;
      const label =
        cfg?.addons?.[k]?.label?.[lang] ??
        cfg?.addons?.[k]?.label?.vi ??
        String(k);
      return { key: k, qty, unit, total, label };
    }).filter((x) => x.qty > 0);
  }, [cfg?.addons, lang, totals.addonsQty, totals.addonsTotal, totals.addonsUnitPrice]);

  const priceLines: PriceLine[] = useMemo(() => {
    const rows: PriceLine[] = [];

    // Tách phụ thu cuối tuần & lễ ra dòng riêng, khớp với bảng giá khách đã
    // xem ở bước 4 — nếu gộp vào "Giá bay" thì con số trên vé sẽ khác con số
    // khách bấm đồng ý.
    const peakUnit = Number(totals.peakSurchargePerPerson || 0);
    const flightUnit = peakUnit
      ? Number(totals.quotedBasePerPerson || 0)
      : guestsCount > 0
        ? Math.round((totals.baseTotal || 0) / guestsCount)
        : 0;
    const flightSub = flightUnit * guestsCount;

    rows.push({
      label: labels.flightCost,
      detail: `${formatByLang(lang, flightUnit, flightUnit)} × ${guestsCount}`,
      amountText: formatByLang(lang, flightSub, flightSub),
    });

    if (peakUnit > 0) {
      const peakSub = peakUnit * guestsCount;
      rows.push({
        label: getPeakSurchargeLabel(labels, totals.holidayType),
        detail: `${formatByLang(lang, peakUnit, peakUnit)} × ${guestsCount}`,
        amountText: formatByLang(lang, peakSub, peakSub),
      });
    }

    if (hasServicesBreakdownFromResult) {
      servicesBreakdownFromResult.forEach((row: any) => {
        const lineTotal = Number(row?.lineTotal || 0);
        // Cho phép cả dòng âm (giảm combo ảnh) — trước đây lọc `<= 0` nên
        // dòng giảm giá biến mất khỏi vé mà tổng tiền vẫn đã trừ.
        if (lineTotal === 0) return;

        rows.push({
          label: String(row?.label || labels.additionalServices),
          detail: row?.detail ? String(row.detail) : undefined,
          amountText: formatByLang(lang, lineTotal, lineTotal),
        });
      });
    } else if (hasServicesTotalFromResult) {
      rows.push({
        label: labels.additionalServices,
        amountText: formatByLang(lang, servicesTotalFromResult, servicesTotalFromResult),
      });
    } else {
      selectedServicePriceRows.forEach((row) => {
        rows.push({
          label: row.label,
          detail: row.detail,
          amountText: formatByLang(lang, row.lineTotal, row.lineTotal),
        });
      });
    }

    addonRows.forEach((a) => {
      rows.push({
        label: a.label,
        detail: `${formatByLang(lang, a.unit, a.unit)} × ${a.qty}`,
        amountText: formatByLang(lang, a.total, a.total),
      });
    });

    if ((totals.discountTotal || 0) > 0) {
      const perPax =
        guestsCount > 0
          ? Math.round((totals.discountTotal || 0) / guestsCount)
          : totals.discountTotal || 0;

      rows.push({
        label: labels.groupDiscount,
        detail: `-${formatByLang(lang, perPax, perPax)} × ${guestsCount}`,
        amountText: `-${formatByLang(lang, totals.discountTotal, totals.discountTotal)}`,
        type: "discount",
      });
    }

    return rows;
  }, [
    addonRows,
    guestsCount,
    lang,
    hasServicesBreakdownFromResult,
    servicesBreakdownFromResult,
    hasServicesTotalFromResult,
    servicesTotalFromResult,
    selectedServicePriceRows,
    totals.baseTotal,
    totals.discountTotal,
    totals.peakSurchargePerPerson,
    totals.quotedBasePerPerson,
    totals.holidayType,
    labels,
  ]);

  return (
    <div
      data-ticket
      style={{
        background: C.bg,
        color: C.text,
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        boxShadow: "0 18px 48px rgba(28,41,48,0.08)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #0194F3 0%, #0B83D9 100%)",
          color: C.white,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="MBL"
                crossOrigin="anonymous"
                style={{ width: 30, height: 30, objectFit: "contain" }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  opacity: 0.95,
                }}
              >
                {labels.brandName}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginTop: 4,
                }}
              >
                {labels.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.92, marginTop: 4 }}>
                {labels.subtitle}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              ✓ {labels.confirmed}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 1,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {bookingRef}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.94 }}>
          {labels.created}: {createdAt}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {/* Một khối duy nhất cho chuyến bay + liên hệ. Trước đây hai khối
            nằm rời nhau, mỗi khối một khung, khiến vé dài gấp đôi mà thông
            tin thì rời rạc. */}
        <SectionCard title={labels.serviceDetails}>
          <PillRow
            items={[
              { label: labels.service, value: locationName },
              { label: labels.date, value: formatDateDisplay(booking.dateISO) },
              { label: labels.time, value: booking.timeSlot || "—" },
              { label: labels.guests, value: String(booking.guestsCount ?? "—") },
              ...(hasPackages
                ? [
                    { label: labels.packageLabel, value: packageLabel },
                    { label: labels.flightTypeLabel, value: flightTypeLabel },
                    {
                      label: labels.dayTypeLabel,
                      value: getHolidayTypeLabel(labels, totals.holidayType),
                    },
                  ]
                : []),
              { label: labels.name, value: contactName || passengers?.[0]?.fullName || "—" },
              { label: labels.phone, value: contactPhone || "—" },
              { label: labels.email, value: contactEmail || "—" },
            ]}
          />
        </SectionCard>

        {passengers.length > 0 && (
          <>
            <SectionSpacer />
            <SectionCard
              title={labels.passengersList}
              rightBadge={String(passengers.length)}
            >
              {/* Mỗi khách một dòng, chỉ ghi những mục đã nhập — trước đây
                  mỗi khách là một thẻ chứa 5 ô con, luôn hiện cả ô trống. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {passengers.map((pax, idx) => {
                  const details = [
                    pax.dob ? formatDateDisplay(pax.dob) : "",
                    pax.gender || "",
                    pax.weightKg ? `${pax.weightKg} kg` : "",
                    pax.nationality || "",
                    pax.idNumber || "",
                  ].filter(Boolean);

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 6,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: C.accent, fontWeight: 900, flexShrink: 0 }}>
                        {idx + 1}.
                      </span>
                      <span style={{ minWidth: 0, wordBreak: "break-word" }}>
                        <span style={{ fontWeight: 800, color: C.text }}>
                          {pax.fullName || "—"}
                        </span>
                        {details.length ? (
                          <span style={{ color: C.subtext }}>
                            {" — "}
                            {details.join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </>
        )}

        <SectionSpacer />

        {/* Một danh sách duy nhất cho dịch vụ, thay cho hai khối "Dịch vụ bao
            gồm" và "Additional services" trước đây. Thứ tự và cách ghi giống
            hệt bước 4: đã có trong giá trước, rồi dịch vụ chọn thêm kèm ×N,
            cuối cùng là những mục không chọn với dấu ✕ đỏ. */}
        <SectionCard title={labels.additionalServices}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {includedItems.map((item, idx) => (
              <TicketServiceLine
                key={`inc-${idx}`}
                ok
                label={item.text}
                tag={
                  item.tag === "free"
                    ? labels.freeTag
                    : item.tag === "included"
                      ? labels.includedTag
                      : undefined
                }
              />
            ))}

            {chosenServiceRows.map((row) => (
              <TicketServiceLine
                key={row.key}
                ok
                label={row.label}
                qty={row.qty}
                notes={row.notes}
              />
            ))}

            {missingServiceRows.map((row) => (
              <TicketServiceLine
                key={row.key}
                ok={false}
                label={row.label}
                tag={labels.noTag}
              />
            ))}
          </div>
        </SectionCard>

        {!!specialRequest && (
          <>
            <SectionSpacer />
            <div
              style={{
                background: C.orangeSoft,
                border: `1px solid ${C.orange}`,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: C.warningText,
                }}
              >
                {labels.specialRequests}
              </div>
              <div
                style={{
                  marginTop: 3,
                  color: C.warningText,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {specialRequest}
              </div>
            </div>
          </>
        )}

        <SectionSpacer />

        <div
          style={{
            background: C.totalBg,
            color: C.white,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              opacity: 0.85,
              fontWeight: 900,
            }}
          >
            {labels.priceBreakdown}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {priceLines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        line.type === "discount"
                          ? "#bbf7d0"
                          : "rgba(255,255,255,0.95)",
                    }}
                  >
                    {line.label}
                  </div>
                  {line.detail ? (
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      {line.detail}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    color: line.type === "discount" ? "#bbf7d0" : C.white,
                  }}
                >
                  {line.amountText}
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 4,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 900 }}>{labels.total}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.white }}>
                {formatByLang(
                  lang,
                  totalWithSelectedServices,
                  totalWithSelectedServices,
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              fontSize: 10,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.5,
            }}
          >
            {labels.safetyNote}
          </div>
        </div>

        <SectionSpacer />

        {/* Hướng dẫn nhanh cho khách đọc ngay trên vé — trước đây khách phải
            mở lại trang web mới biết mặc gì, mang gì. */}
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: C.accent,
            }}
          >
            {labels.quickGuideTitle}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[
              { title: labels.guideWearTitle, items: labels.guideWear, tone: C.accent },
              { title: labels.guideBringTitle, items: labels.guideBring, tone: C.success },
              { title: labels.guideAvoidTitle, items: labels.guideAvoid, tone: C.orange },
            ].map((block) => (
              <div
                key={block.title}
                style={{
                  flex: "1 1 180px",
                  minWidth: 160,
                  background: C.card,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: block.tone,
                    marginBottom: 4,
                  }}
                >
                  {block.title}
                </div>
                {block.items.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 5,
                      fontSize: 11,
                      lineHeight: 1.45,
                      color: C.text,
                    }}
                  >
                    <span style={{ color: block.tone, flexShrink: 0 }}>•</span>
                    <span style={{ minWidth: 0 }}>{line}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              lineHeight: 1.5,
              color: C.warningText,
              background: C.warningBg,
              border: `1px solid ${C.warningBorder}`,
              borderRadius: 8,
              padding: "6px 8px",
              fontWeight: 700,
            }}
          >
            {labels.guideNote}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontSize: 11,
            color: C.text,
            lineHeight: 1.6,
            fontWeight: 700,
          }}
        >
          Hotline: 0964.073.555 — 0385.907.789
          <br />
          <span style={{ color: C.muted, fontWeight: 500 }}>
            Zalo / WhatsApp / Telegram — mebayluon.com
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Một dòng dịch vụ trên vé — cùng cách đọc với bước 4: ✓ xanh cho thứ có,
 * ✕ đỏ cho thứ không, số lượng "×2" và nhãn (miễn phí)/(đã bao gồm)/(không)
 * đều màu theo trạng thái.
 */
function TicketServiceLine({
  ok,
  label,
  qty,
  notes,
  tag,
}: {
  ok: boolean;
  label: string;
  qty?: number;
  notes?: string[];
  tag?: string;
}) {
  const tone = ok ? C.success : "#DC2626";

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.55,
        color: ok ? C.text : C.muted,
      }}
    >
      <span style={{ color: tone, fontWeight: 900, flexShrink: 0 }}>
        {ok ? "✓" : "✕"}
      </span>

      <span style={{ minWidth: 0, wordBreak: "break-word" }}>
        <span style={{ fontWeight: 800 }}>{label}</span>

        {qty && qty > 0 ? (
          <>
            {": "}
            <span style={{ color: C.success, fontWeight: 800 }}>×{qty}</span>
          </>
        ) : null}

        {notes && notes.length ? (
          <span style={{ color: C.subtext }}>
            {qty && qty > 0 ? " · " : ": "}
            {notes.join(" · ")}
          </span>
        ) : null}

        {tag ? <span style={{ color: tone }}> ({tag})</span> : null}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
  rightBadge,
}: {
  title: string;
  children: React.ReactNode;
  rightBadge?: string;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: C.accentDark,
          }}
        >
          {title}
        </div>

        {rightBadge ? (
          <div
            style={{
              background: C.accentSoft,
              color: C.accent,
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {rightBadge}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function PillRow({
  items,
  soft = false,
}: {
  items: Array<{ label: string; value: string }>;
  soft?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          style={{
            minWidth: 120,
            flex: "1 1 180px",
            background: soft ? C.accentSoft : C.bg,
            border: `1px solid ${soft ? "#B9DDFB" : C.border}`,
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>
            {item.label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: C.text,
              fontWeight: 900,
              wordBreak: "break-word",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}


function SectionSpacer() {
  return <div style={{ height: 12 }} />;
}
