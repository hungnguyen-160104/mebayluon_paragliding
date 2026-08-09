"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { BookingData } from "@/store/booking-store";
import {
  LOCATIONS,
  formatVND,
  formatUSD,
  type AddonKey,
  type ComputeResult,
} from "@/lib/booking/calculate-price";
import type { LangCode } from "@/lib/booking/translations-booking";
import { bookingTranslations } from "@/lib/booking/translations-booking";
import { shortServiceLabel } from "@/lib/booking/service-label";
import { isPickupService, resolvePickup } from "@/lib/booking/pickup";
import { spotPageForBooking } from "@/lib/booking/spot-to-location";
import { SITE_URL } from "@/lib/site-config";

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

type Props = {
  booking: BookingData;
  /** Luôn là kết quả tính bằng VNĐ — đơn vị chính của vé. */
  totals: ComputeResult;
  /** Bản quy đổi USD, chỉ dùng làm số tham chiếu cạnh tổng tiền. */
  totalsUSD?: ComputeResult;
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


type InfoItem = { icon: string; label: string; value: string };

/**
 * Nhãn gói bay RÚT GỌN cho vé.
 *
 * Nhãn trong cấu hình viết để khách cân nhắc lúc chọn gói ("Cất cánh từ 850m
 * – Điểm dù lượn cao nhất Hà Nội"), dài gần bằng cả dòng và đẩy phần còn lại
 * xuống hàng. Vé đã chốt rồi thì chỉ cần đủ để phân biệt hai gói.
 */
const SHORT_PACKAGE: Record<string, Record<LangCode, string>> = {
  ha_noi_850m: {
    vi: "850m cao nhất HN",
    en: "850m – highest in Hanoi",
    fr: "850m – le plus haut de Hanoï",
    ru: "850м – высшая точка Ханоя",
    zh: "850米 – 河内最高",
    hi: "850m – हनोई में सबसे ऊँचा",
  },
  ha_noi_650m: {
    vi: "650m tiêu chuẩn",
    en: "650m standard",
    fr: "650m standard",
    ru: "650м стандарт",
    zh: "650米标准",
    hi: "650m मानक",
  },
};

/**
 * Gói theo quy ước *_pkg_1 / *_pkg_2 dùng luôn nhãn ngắn của Loại ngày.
 * Gói có tên riêng thì tra bảng trên; không có thì giữ nguyên nhãn gốc.
 */
function shortPackageLabel(
  packageKey: string | undefined,
  fallback: string,
  labels: ReturnType<typeof useTicketLabels>,
  lang: LangCode,
): string {
  const key = String(packageKey || "");
  if (key.endsWith("_pkg_2")) return labels.weekend;
  if (key.endsWith("_pkg_1")) return labels.weekday;
  return SHORT_PACKAGE[key]?.[lang] ?? SHORT_PACKAGE[key]?.en ?? fallback;
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
              : "Paragliding Ticket",
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
    readyLine: isVI ? "Bạn đã sẵn sàng cất cánh!" : isFR ? "Prêt pour le décollage !" : isRU ? "Вы готовы к взлёту!" : isHI ? "आप उड़ान के लिए तैयार हैं!" : isZH || isZHTW ? zh("准备起飞啦！", "準備起飛囉！") : "You are ready for take-off!",
    funLine: isVI
      ? "Mặc thật xinh nhé — trên trời, máy ảnh không biết nói dối đâu! 📸"
      : isFR
        ? "Mettez votre plus belle tenue — là-haut, l'appareil photo ne ment jamais ! 📸"
        : isRU
          ? "Оденьтесь понаряднее — в небе камера не умеет врать! 📸"
          : isHI
            ? "अच्छे कपड़े पहनिए — ऊपर कैमरा झूठ नहीं बोलता! 📸"
            : isZH || isZHTW
              ? zh("穿得美一点——在天上，镜头可不会骗人！📸", "穿得美一點——在天上，鏡頭可不會騙人！📸")
              : "Dress your best — up there, the camera never lies! 📸",
    colDob: (t as any)?.labels?.dob ?? (isVI ? "Ngày sinh" : "Date of birth"),
    colGender: (t as any)?.labels?.gender ?? (isVI ? "Giới tính" : "Gender"),
    /* Không dùng labels.weightKg ("Cân nặng (kg)"): phần "(kg)" làm tiêu đề
       cột gãy hai dòng, mà đơn vị đã nằm sẵn trong giá trị ("68 kg"). Ô nhập
       ở bước 3 vẫn giữ nhãn có đơn vị vì ở đó nó là gợi ý cần thiết. */
    colWeight: isVI ? "Cân nặng" : isFR ? "Poids" : isRU ? "Вес" : isHI ? "वज़न" : isZH || isZHTW ? zh("体重", "體重") : "Weight",
    colNationality:
      (t as any)?.labels?.nationality ?? (isVI ? "Quốc tịch" : "Nationality"),
    /* Cùng lý do với colWeight: nhãn ở bước 3 là "Số CCCD/Passport", bỏ chữ
       "Số" cho tiêu đề cột đỡ dài. */
    colId: isVI ? "CCCD/Passport" : isFR ? "CNI / Passeport" : isRU ? "Паспорт" : isHI ? "आईडी / पासपोर्ट" : isZH || isZHTW ? zh("证件号", "證件號") : "ID / Passport",
    spotMore: isVI ? "Xem thêm thông tin về điểm bay" : isFR ? "En savoir plus sur le site de vol" : isRU ? "Подробнее о площадке" : isHI ? "उड़ान स्थल के बारे में और जानें" : isZH || isZHTW ? zh("了解更多飞行点信息", "了解更多飛行點資訊") : "More about this flying site",
    qrHint: isVI ? "Quét để mở bản đồ điểm hẹn" : isFR ? "Scannez pour ouvrir la carte" : isRU ? "Отсканируйте, чтобы открыть карту" : isHI ? "नक्शा खोलने के लिए स्कैन करें" : isZH || isZHTW ? zh("扫码打开地图", "掃碼開啟地圖") : "Scan to open the map",
    viewMap: isVI ? "Xem bản đồ" : isFR ? "Voir la carte" : isRU ? "Открыть карту" : isHI ? "नक्शा देखें" : isZH || isZHTW ? zh("查看地图", "查看地圖") : "View map",
    pickupPrivate: isVI ? "xe riêng" : isFR ? "privé" : isRU ? "индивидуальный" : isHI ? "प्राइवेट" : isZH || isZHTW ? zh("专车", "專車") : "private",
    pickupShared: isVI ? "xe ghép" : isFR ? "partagé" : isRU ? "групповой" : isHI ? "शेयर्ड" : isZH || isZHTW ? zh("拼车", "拼車") : "shared",
    pickupPointLabel: isVI ? "Điểm đón" : isFR ? "Point de prise en charge" : isRU ? "Место посадки" : isHI ? "पिकअप स्थान" : isZH || isZHTW ? zh("接送地点", "接送地點") : "Pickup point",
    meetingPointLabel: isVI ? "Điểm hẹn" : isFR ? "Point de rendez-vous" : isRU ? "Место встречи" : isHI ? "मिलन स्थल" : isZH || isZHTW ? zh("集合地点", "集合地點") : "Meeting point",
    pickupOneHourNote: isVI
      ? "Xe đón trước giờ bay khoảng 1 tiếng, tài xế sẽ gọi trước khi tới."
      : isFR
        ? "La navette passe environ 1 heure avant le vol ; le chauffeur vous appellera."
        : isRU
          ? "Трансфер подаётся примерно за 1 час до полёта, водитель позвонит заранее."
          : isHI
            ? "गाड़ी उड़ान से क़रीब 1 घंटा पहले आएगी; ड्राइवर पहले कॉल करेगा।"
            : isZH || isZHTW
              ? zh("车辆约在飞行前 1 小时来接，司机会提前致电。", "車輛約在飛行前 1 小時來接，司機會提前致電。")
              : "The car picks you up about 1 hour before the flight; the driver will call ahead.",
    meetingAtSite: isVI
      ? "Khách tự tới điểm bay"
      : isFR
        ? "Le client se rend au site par ses propres moyens"
        : isRU
          ? "Гость добирается до площадки самостоятельно"
          : isHI
            ? "मेहमान स्वयं उड़ान स्थल पर पहुँचें"
            : isZH || isZHTW
              ? zh("客人自行前往飞行点", "客人自行前往飛行點")
              : "Guest makes their own way to the site",
    meetingHanoi: isVI
      ? "Điểm bay Đồi Bù | Viên Nam"
      : isFR
        ? "Site de vol Doi Bu | Vien Nam"
        : isRU
          ? "Площадка Дой Бу | Виен Нам"
          : isHI
            ? "उड़ान स्थल दोई बू | वियन नाम"
            : isZH || isZHTW
              ? zh("堆布山 | 员南飞行点", "堆布山 | 員南飛行點")
              : "Doi Bu | Vien Nam flying site",
    bookingRefLabel: isVI ? "Mã vé" : isFR ? "N° de billet" : isRU ? "Номер билета" : isHI ? "टिकट क्रमांक" : isZH || isZHTW ? zh("票号", "票號") : "Ticket no.",
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
    name: isVI ? "Tên" : isFR ? "Nom" : isRU ? "Имя" : isHI ? "नाम" : isZH || isZHTW ? zh("姓名", "姓名") : "Name",
    phone: (t as any)?.labels?.phone ?? "Phone",
    email: "Email",
    pickupLocation: isVI ? "Dịch vụ đón trả" : isFR ? "Prise en charge" : isRU ? "Трансфер" : isHI ? "पिकअप" : isZH || isZHTW ? zh("接送", "接送") : "Pickup",
    selectedServicesList: isVI ? "Danh sách dịch vụ" : isFR ? "Liste des services" : isRU ? "Список услуг" : isHI ? "सेवा सूची" : isZH || isZHTW ? zh("服务列表", "服務列表") : "Service list",
    specialRequests: isVI ? "Yêu cầu đặc biệt" : isFR ? "Demandes spéciales" : isRU ? "Особые запросы" : isHI ? "विशेष अनुरोध" : isZH || isZHTW ? zh("特殊要求", "特殊要求") : "Special requests",
    flightCost: isVI ? "Giá bay" : isFR ? "Prix du vol" : isRU ? "Стоимость полёта" : isHI ? "फ्लाइट शुल्क" : isZH || isZHTW ? zh("飞行费用", "飛行費用") : "Flight cost",
    surcharge: isVI ? "Phụ thu" : isFR ? "Supplément" : isRU ? "Доплата" : isHI ? "अधिभार" : isZH || isZHTW ? zh("附加费", "附加費") : "Surcharge",
    camera360Cost: isVI ? "Camera 360" : "Camera 360",
    droneCost: isVI ? "Flycam / Drone" : "Drone / Flycam",
    groupDiscount: (t as any)?.labels?.groupDiscount ?? (isVI ? "Giảm giá nhóm" : "Group discount"),
    flightLine: isVI ? "Bay dù lượn" : isFR ? "Vol en parapente" : isRU ? "Полёт на параплане" : isHI ? "पैराग्लाइडिंग उड़ान" : isZH || isZHTW ? zh("滑翔伞飞行", "滑翔傘飛行") : "Paragliding flight",
    flightLinePPG: isVI ? "Bay dù lượn có động cơ" : isFR ? "Vol en paramoteur" : isRU ? "Полёт на парамоторе" : isHI ? "पैरामोटर उड़ान" : isZH || isZHTW ? zh("动力滑翔伞飞行", "動力滑翔傘飛行") : "Paramotor flight",
    freeTag: isVI ? "miễn phí" : isFR ? "offert" : isRU ? "бесплатно" : isHI ? "निःशुल्क" : isZH || isZHTW ? zh("免费", "免費") : "free",
    includedTag: isVI ? "đã bao gồm" : isFR ? "inclus" : isRU ? "включено" : isHI ? "शामिल" : isZH || isZHTW ? zh("已包含", "已包含") : "included",
    noTag: isVI ? "không" : isFR ? "non" : isRU ? "нет" : isHI ? "नहीं" : isZH || isZHTW ? zh("无", "無") : "no",

    // Hướng dẫn nhanh in ngay trên vé
    quickGuideTitle: isVI ? "Hướng dẫn nhanh khi đi bay" : isFR ? "Aide-mémoire avant le vol" : isRU ? "Памятка перед полётом" : isHI ? "उड़ान से पहले संक्षिप्त गाइड" : isZH || isZHTW ? zh("飞行前速查", "飛行前速查") : "Quick pre-flight guide",
    guideWearTitle: isVI ? "Trang phục" : isFR ? "Tenue" : isRU ? "Одежда" : isHI ? "पहनावा" : isZH || isZHTW ? zh("着装", "著裝") : "What to wear",
    guideBringTitle: isVI ? "Nên mang theo" : isFR ? "À emporter" : isRU ? "Взять с собой" : isHI ? "साथ लाएँ" : isZH || isZHTW ? zh("建议携带", "建議攜帶") : "What to bring",
    guideAvoidTitle: isVI ? "Không nên mang theo" : isFR ? "À ne pas emporter" : isRU ? "Что не брать" : isHI ? "जो न लाएँ" : isZH || isZHTW ? zh("请勿携带", "請勿攜帶") : "What not to bring",

    guideWear: isVI
      ? ["Quần áo dài tay, gọn gàng", "Giày thể thao hoặc giày leo núi", "Không mặc váy, không đi cao gót / dép lê"]
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
      ? ["Giấy tờ tuỳ thân (CCCD / Hộ chiếu)", "Kính râm, áo khoác mỏng", "Túi nhỏ 1–2 kg cho đồ cá nhân", "Điện thoại còn trống ~4GB để chép ảnh & video"]
      : isFR
        ? ["Pièce d'identité ou passeport", "Lunettes de soleil, veste légère", "Petit sac de 1 à 2 kg", "Téléphone avec ~4 Go libres pour vos photos et vidéos"]
        : isRU
          ? ["Паспорт или удостоверение", "Очки от солнца, лёгкая куртка", "Небольшая сумка 1–2 кг", "Телефон со свободными ~4 ГБ для фото и видео"]
          : isHI
            ? ["पहचान पत्र या पासपोर्ट", "धूप का चश्मा, हल्की जैकेट", "1–2 किग्रा का छोटा बैग", "फ़ोटो-वीडियो के लिए ~4GB खाली फ़ोन"]
            : isZH || isZHTW
              ? [zh("身份证件或护照", "身分證件或護照"), zh("墨镜、薄外套", "墨鏡、薄外套"), zh("1–2 公斤随身小包", "1–2 公斤隨身小包"), zh("手机预留约 4GB 空间用于拷贝照片和视频", "手機預留約 4GB 空間用於拷貝照片和影片")]
              : ["ID card or passport", "Sunglasses and a light jacket", "A small 1–2 kg bag", "Phone with ~4GB free for your photos and video"],

    guideAvoid: isVI
      ? ["Vật sắc nhọn", "Đồ cồng kềnh", "Tư trang giá trị cao", "Đồ nặng"]
      : isFR
        ? ["Objets pointus", "Objets encombrants", "Objets de valeur", "Objets lourds"]
        : isRU
          ? ["Острые предметы", "Громоздкие вещи", "Ценные вещи", "Тяжёлые предметы"]
          : isHI
            ? ["नुकीली चीज़ें", "भारी-भरकम सामान", "क़ीमती सामान", "वज़नी वस्तुएँ"]
            : isZH || isZHTW
              ? [zh("尖锐物品", "尖銳物品"), zh("体积过大的物品", "體積過大的物品"), zh("贵重物品", "貴重物品"), zh("过重的物品", "過重的物品")]
              : ["Sharp objects", "Bulky items", "Valuables", "Heavy items"],

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
  totalsUSD,
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
        exclusiveGroup: String(svc.exclusiveGroup || ""),
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
   * Tên addon. Điểm bay nào không khai nhãn riêng thì trước đây rơi về CHÍNH
   * KHOÁ ("pickup", "flycam") — chữ tiếng Anh lọt vào vé tiếng Việt. Nay lùi
   * về bộ nhãn đã dịch của vé.
   */
  const addonLabelOf = useCallback(
    (k: AddonKey) => {
      const fromConfig =
        (cfg?.addons?.[k]?.label as any)?.[lang] ?? cfg?.addons?.[k]?.label?.vi;
      if (fromConfig) return String(fromConfig);

      if (k === "pickup") return labels.pickupLocation;
      if (k === "camera360") return labels.camera360Cost;
      return labels.droneCost;
    },
    [cfg?.addons, lang, labels],
  );

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
      // Mục đầu là chính chuyến bay. Câu dài "01 chuyến bay dù lượn 8–15 phút
      // (tuỳ gió)" viết để khách cân nhắc lúc chọn gói; trên vé đã chốt thì nó
      // chỉ làm xuống dòng, nên rút còn tên chuyến bay.
      text:
        idx === 0
          ? booking.flightTypeKey === "paramotor"
            ? labels.flightLinePPG
            : labels.flightLine
          : text,
      tag: includedTagOf(viItems[idx] ?? text, idx),
    }));
  }, [cfg, booking.packageKey, booking.flightTypeKey, labels, lang]);

  /** Dịch vụ khách CÓ chọn: tên + số lượng + ghi chú khách nhập. */
  const chosenServiceRows = useMemo(() => {
    const fromServices = selectedServices.map((svc) => {
      const notes = splitInputEntries(svc.inputText);
      // Không nhét chữ "Xem bản đồ" vào ghi chú nữa — nó được vẽ thành LINK
      // riêng bên dưới để khách bấm được khi xem vé trên màn hình.
      const mapUrl = !notes.length ? String(svc.fixedMapUrl || "") : "";

      const qty =
        svc.controlType === "counter"
          ? Math.max(1, Number(svc.qty) || 1)
          : svc.priceVND || svc.priceUSD
            ? guestsCount
            : 0;

      return {
        key: String(svc.key),
        label: shortServiceLabel(svc.label),
        qty,
        notes,
        mapUrl,
      };
    });

    const fromAddons = selectedAddonItems.map((a) => ({
      key: a.key,
      label: a.label,
      qty: Number(String(a.detail || "").replace(/\D/g, "")) || 0,
      notes: [] as string[],
      mapUrl: "",
    }));

    return [...fromServices, ...fromAddons];
  }, [selectedServices, selectedAddonItems, guestsCount]);

  /** Dịch vụ tuỳ chọn khách KHÔNG chọn — vé vẫn ghi để khách khỏi thắc mắc. */
  const missingServiceRows = useMemo(() => {
    /**
     * Một hạng mục (đón trả / camera 360 / flycam) có thể được đáp ứng bằng
     * ADDON dùng chung hoặc bằng DỊCH VỤ riêng của điểm bay. Bản trước chỉ
     * xét addon, còn việc trùng với dịch vụ thì so bằng tên — nên khách đặt
     * "Xe trung chuyển xã Tú Lệ (Đón/Trả)" vẫn bị ghi thêm dòng
     * "Đón / trả tận nơi (không)", hai dòng nói ngược nhau.
     *
     * Nay nhận diện theo BẢN CHẤT dịch vụ: khoá dịch vụ, cờ requiresPickupInput
     * và fixedMapUrl — không phụ thuộc cách đặt tên của từng điểm bay.
     */
    const coveredByService = (k: AddonKey) =>
      selectedServices.some((svc) => {
        const key = String(svc.key || "").toLowerCase();

        if (k === "pickup") return isPickupService(svc);

        if (k === "camera360") {
          return key.includes("camera360") || key.includes("camera_360");
        }

        return key.includes("flycam") || key.includes("drone");
      });

    return ADDON_KEYS.map((k) => {
      if (Number(totals.addonsQty?.[k] || 0) > 0) return null;
      if (coveredByService(k)) return null;

      return { key: `miss-${k}`, label: addonLabelOf(k) };
    }).filter(Boolean) as Array<{ key: string; label: string }>;
  }, [selectedServices, totals.addonsQty, addonLabelOf]);


  const selectedServicePriceRows = useMemo(() => {
    return selectedServices
      .map((svc) => {
        const baseUnit = Number(svc.priceVND || 0);
        const qty = Math.max(1, Number(svc.qty || 1));

        const serviceKey = String(svc.key || "");
        let lineTotal =
          svc.controlType === "counter" ? baseUnit * qty : baseUnit * guestsCount;
        let detail: string | undefined =
          svc.controlType === "counter"
            ? `${formatVND(baseUnit)} × ${qty}`
            : `${formatVND(baseUnit)} × ${guestsCount}`;

        if (serviceKey === "khau_pha_garrya_pickup") {
          // số xe × số chiều (qty: 1-2) × 500.000 đ/xe/chiều
          const carCount = Math.ceil(guestsCount / 4);
          const carPrice = 500_000;
          lineTotal = carCount * qty * carPrice;
          detail = `${formatVND(carPrice)} × ${carCount} ${lang === "vi" ? "xe" : "car"} × ${qty} ${lang === "vi" ? "chiều" : "way"}`;
        }

        if (serviceKey === "ha_noi_private_hotel_pickup") {
          lineTotal = 1_400_000 + Math.max(0, guestsCount - 3) * 350_000;
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
      return { key: k, qty, unit, total, label: addonLabelOf(k) };
    }).filter((x) => x.qty > 0);
  }, [addonLabelOf, totals.addonsQty, totals.addonsTotal, totals.addonsUnitPrice]);

  /**
   * Số quy đổi USD, in nhỏ dưới tổng tiền làm THAM CHIẾU. Đơn vị chính của vé
   * luôn là VNĐ vì khách thanh toán bằng tiền Việt tại điểm bay.
   */
  const usdReference = useMemo(() => {
    const value = Number(totalsUSD?.totalAfterDiscount || 0);
    return value > 0 ? formatUSD(value) : "";
  }, [totalsUSD]);

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
      detail: `${formatVND(flightUnit)} × ${guestsCount}`,
      amountText: formatVND(flightSub),
    });

    if (peakUnit > 0) {
      const peakSub = peakUnit * guestsCount;
      rows.push({
        label: getPeakSurchargeLabel(labels, totals.holidayType),
        detail: `${formatVND(peakUnit)} × ${guestsCount}`,
        amountText: formatVND(peakSub),
      });
    }

    // Khoản giảm gom riêng để đẩy xuống cuối bảng — nằm lẫn giữa các dịch vụ
    // thì nhìn như đang giảm cho thứ chưa liệt kê.
    const discountRows: PriceLine[] = [];

    if (hasServicesBreakdownFromResult) {
      servicesBreakdownFromResult.forEach((row: any) => {
        const lineTotal = Number(row?.lineTotal || 0);
        // Cho phép cả dòng âm (giảm combo ảnh) — trước đây lọc `<= 0` nên
        // dòng giảm giá biến mất khỏi vé mà tổng tiền vẫn đã trừ.
        if (lineTotal === 0) return;

        const line: PriceLine = {
          label: String(row?.label || labels.additionalServices),
          detail: row?.detail ? String(row.detail) : undefined,
          amountText: formatVND(lineTotal),
          ...(lineTotal < 0 ? { type: "discount" as const } : {}),
        };

        if (lineTotal < 0) discountRows.push(line);
        else rows.push(line);
      });
    } else if (hasServicesTotalFromResult) {
      rows.push({
        label: labels.additionalServices,
        amountText: formatVND(servicesTotalFromResult),
      });
    } else {
      selectedServicePriceRows.forEach((row) => {
        rows.push({
          label: row.label,
          detail: row.detail,
          amountText: formatVND(row.lineTotal),
        });
      });
    }

    addonRows.forEach((a) => {
      rows.push({
        label: a.label,
        detail: `${formatVND(a.unit)} × ${a.qty}`,
        amountText: formatVND(a.total),
      });
    });

    rows.push(...discountRows);

    if ((totals.discountTotal || 0) > 0) {
      const perPax =
        guestsCount > 0
          ? Math.round((totals.discountTotal || 0) / guestsCount)
          : totals.discountTotal || 0;

      rows.push({
        label: labels.groupDiscount,
        detail: `-${formatVND(perPax)} × ${guestsCount}`,
        amountText: `-${formatVND(totals.discountTotal)}`,
        type: "discount",
      });
    }

    return rows;
  }, [
    addonRows,
    guestsCount,
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

  /** Thông tin chuyến bay, dạng nhãn - giá trị để xếp thành lưới đều nhau. */
  /**
   * Điểm đón hoặc điểm hẹn, tuỳ khách có đặt xe đón hay không.
   *
   *  - Có dịch vụ đón và khách đã điền địa chỉ  -> ghi đúng địa chỉ đó, kèm
   *    ghi chú xe tới trước giờ bay khoảng 1 tiếng.
   *  - Đón tại điểm cố định (GO! Thăng Long)     -> ghi tên điểm đó.
   *  - Không đặt xe đón                          -> ghi điểm hẹn của từng
   *    điểm bay: Hà Nội là Đồi Bù | Viên Nam, còn lại là bãi cất/hạ cánh.
   *
   * Không đoán theo tên dịch vụ mà xét hai cờ có sẵn trong cấu hình:
   * requiresPickupInput (khách phải nhập địa chỉ) và fixedMapUrl (điểm đón
   * cố định), nên thêm điểm bay mới cũng chạy đúng.
   */
  const pickupInfo = useMemo(() => {
    // Dùng chung hàm với hai email (lib/booking/pickup.ts) để ba nơi không
    // bao giờ nói khác nhau về việc có điều xe hay không.
    const pickup = resolvePickup({
      selectedServices: selectedServices.map((svc) => ({
        key: String(svc.key),
        label: String(svc.label),
        inputText: splitInputEntries(svc.inputText).join(" · "),
      })),
    });

    if (pickup.hasPickup) {
      const mode =
        pickup.mode === "private"
          ? labels.pickupPrivate
          : pickup.mode === "shared"
            ? labels.pickupShared
            : "";

      return {
        label: mode
          ? `${labels.pickupPointLabel} (${mode})`
          : labels.pickupPointLabel,
        value: pickup.name || labels.pickupPointLabel,
        note: labels.pickupOneHourNote,
      };
    }

    return {
      label: labels.meetingPointLabel,
      value:
        booking.location === "ha_noi"
          ? labels.meetingHanoi
          : labels.meetingAtSite,
      note: "",
    };
  }, [selectedServices, booking.location, labels]);

  /**
   * Đường dẫn bản đồ để dựng mã QR.
   *
   * Trên ẢNH vé (PNG tải về) thì chữ "Xem bản đồ" chỉ là chữ, bấm không được.
   * Mã QR là cách duy nhất để khách cầm ảnh vé mà vẫn mở được bản đồ.
   *
   * Ưu tiên điểm đón cố định khách đã chọn; không có thì lấy bãi cất cánh của
   * điểm bay — đó là nơi khách cần tới.
   */
  const mapUrlForQr = useMemo(() => {
    const fromService = selectedServices.find((svc) => svc.fixedMapUrl);
    if (fromService?.fixedMapUrl) return String(fromService.fixedMapUrl);

    const coords = (cfg as any)?.coordinates;
    return String(coords?.takeoff || coords?.landing || "");
  }, [selectedServices, cfg]);

  /**
   * Trang giới thiệu điểm bay tương ứng với chuyến đã đặt. Dùng URL tuyệt đối
   * vì tấm vé còn được chụp thành ảnh và gửi qua email — link tương đối ở đó
   * sẽ không mở được.
   */
  const spotPageUrl = useMemo(() => {
    const path = spotPageForBooking(booking.location, booking.flightTypeKey);
    return path ? `${SITE_URL}${path}` : "";
  }, [booking.location, booking.flightTypeKey]);

  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let alive = true;

    if (!mapUrlForQr) {
      setQrDataUrl("");
      return;
    }

    // Nạp thư viện khi cần: chỉ trang có vé mới phải tải.
    import("qrcode")
      .then((mod) =>
        mod.toDataURL(mapUrlForQr, {
          margin: 0,
          width: 320,
          errorCorrectionLevel: "M",
          color: { dark: "#1C2930", light: "#FFFFFF" },
        }),
      )
      .then((url) => {
        if (alive) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn("[BookingTicket] QR failed:", err);
        if (alive) setQrDataUrl("");
      });

    return () => {
      alive = false;
    };
  }, [mapUrlForQr]);

  const flightFacts: InfoItem[] = [
    { icon: "📍", label: labels.service, value: locationName },
    {
      icon: "📅",
      label: `${labels.date} · ${labels.time}`,
      value: [formatDateDisplay(booking.dateISO), booking.timeSlot]
        .filter(Boolean)
        .join(" · "),
    },
    { icon: "👥", label: labels.guests, value: String(booking.guestsCount ?? "—") },
    { icon: "🚐", label: pickupInfo.label, value: pickupInfo.value },
    ...(hasPackages
      ? [
          { icon: "🪂", label: labels.flightTypeLabel, value: flightTypeLabel },
          {
        icon: "🎫",
        label: labels.packageLabel,
        // "Ngày bay từ Thứ 2 - Thứ 6" dài gấp đôi các dòng khác nên phải
        // xuống dòng, làm cả khối so le. Rút còn hai chữ như nhãn Loại ngày.
        value: shortPackageLabel(
          booking.packageKey,
          packageLabel,
          labels,
          lang,
        ),
      },
          {
            icon: "🗓️",
            label: labels.dayTypeLabel,
            value: getHolidayTypeLabel(labels, totals.holidayType),
          },
        ]
      : []),
  ];

  const contactFacts: InfoItem[] = [
    {
      icon: "👤",
      label: labels.name,
      value: contactName || passengers?.[0]?.fullName || "—",
    },
    { icon: "📱", label: labels.phone, value: contactPhone || "—" },
    { icon: "✉️", label: labels.email, value: contactEmail || "—" },
  ];

  return (
    <div
      data-ticket
      style={{
        /* Khổ cố định 520px thay vì kéo hết bề ngang khung chứa: dòng dài quá
           thì nhãn nằm mãi bên trái còn giá trị dạt sang phải, đọc rời rạc.
           520px cũng là khổ ảnh dọc đẹp khi khách lưu về máy hay gửi Zalo. */
        /* Tỉ lệ A4 (210 × 297). minHeight giữ đúng khổ cho vé thường gặp;
           vé nào nhiều khách hoặc nhiều dịch vụ thì cao thêm chứ không cắt
           mất thông tin. 700px để mỗi cột còn ~335px — đủ cho những nhãn dài
           như "Flycam (drone camera)" nằm gọn một dòng. */
        width: 700,
        minHeight: 990,
        maxWidth: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        color: C.text,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        boxShadow: "0 12px 32px rgba(28,41,48,0.10)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ============ ĐẦU VÉ ============
          Hai hàng rõ ràng: hàng trên là thương hiệu + mã vé, hàng dưới là ba
          thông tin khách cần nhất (điểm bay, ngày, giờ) in to. Trước đây mọi
          thứ chen trong một hàng flex-wrap nên trên ảnh xuất ra thì lệch. */}
      <div
        style={{
          background: "linear-gradient(135deg, #0194F3 0%, #0B6FC4 100%)",
          color: C.white,
          padding: "16px 16px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            {/* /logo-mbl.png là bản logo chuẩn (PNG RGBA 354×354, nền trong
                suốt). KHÔNG dùng /logo.png — file đó thật ra là ảnh JPEG bị
                đổi đuôi, không có kênh alpha nên nền trắng đè lên dải xanh.
                Không cần khung nền mờ phía sau nữa, nhờ vậy logo to được. */}
            <img
              src="/logo-mbl.png"
              alt="Mebayluon Paragliding"
              crossOrigin="anonymous"
              style={{
                width: 87,
                height: 87,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  opacity: 0.9,
                }}
              >
                {labels.brandName}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
                {labels.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  opacity: 0.95,
                  marginTop: 2,
                }}
              >
                🪂 {labels.readyLine}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1,
                textTransform: "uppercase",
                opacity: 0.85,
                fontWeight: 700,
              }}
            >
              {labels.bookingRefLabel}
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: 1,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {bookingRef}
            </div>
            {/* Nền đỏ đặc thay cho nền trắng mờ: trên dải xanh của đầu vé
                thì đỏ mới bật lên, khách nhìn phát biết vé đã xác nhận. */}
            <div
              style={{
                display: "inline-block",
                marginTop: 5,
                background: C.orange,
                color: C.white,
                border: "1px solid rgba(255,255,255,0.55)",
                borderRadius: 999,
                padding: "3px 12px",
                fontSize: 12.5,
                fontWeight: 800,
                letterSpacing: 0.3,
                whiteSpace: "nowrap",
              }}
            >
              ✓ {labels.confirmed}
            </div>
          </div>
        </div>

        {/* Dải trang trí nhỏ cho đỡ khô */}
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            letterSpacing: 6,
            opacity: 0.55,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          ☁️ 🪂 ⛰️ ☁️ 🪂 ⛰️ ☁️ 🪂 ⛰️ ☁️ 🪂 ⛰️
        </div>

        {/* Ba thông tin quan trọng nhất, chia đều ba cột bằng nhau */}
        <div
          style={{
            display: "flex",
            marginTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          {[
            { label: labels.service, value: locationName },
            { label: labels.date, value: formatDateDisplay(booking.dateISO) },
            { label: labels.time, value: booking.timeSlot || "—" },
          ].map((item, idx) => (
            <div
              key={item.label}
              style={{
                width: "33.333%",
                padding: "8px 10px",
                borderLeft: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.2)",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  opacity: 0.85,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  marginTop: 2,
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ THÂN VÉ ============
          Xếp hai cột: một cột dài 9 khối chồng lên nhau thì vé cao gấp rưỡi
          khổ A4 và nửa bề ngang bỏ trống. */}
      <div
        style={{
          flex: 1,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: "50%", minWidth: 0 }}>
            <TicketCard title={`🪂 ${labels.serviceDetails}`}>
              <InfoGrid items={flightFacts} />

              {spotPageUrl ? (
                <div style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.45 }}>
                  🔗{" "}
                  <a
                    href={spotPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: C.accent, fontWeight: 700 }}
                  >
                    {labels.spotMore} {locationName}
                  </a>
                </div>
              ) : null}

              {qrDataUrl ? (
                <div
                  style={{
                    marginTop: 9,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: C.card,
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{
                      width: 68,
                      height: 68,
                      display: "block",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: C.subtext,
                      fontWeight: 600,
                      minWidth: 0,
                    }}
                  >
                    {labels.qrHint}
                  </div>
                </div>
              ) : null}

              {pickupInfo.note ? (
                <div
                  style={{
                    marginTop: 7,
                    background: C.accentSoft,
                    borderRadius: 8,
                    padding: "5px 8px",
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: C.accentDark,
                    fontWeight: 600,
                  }}
                >
                  ⏱️ {pickupInfo.note}
                </div>
              ) : null}
            </TicketCard>
          </div>

          <div
            style={{
              width: "50%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <TicketCard title={`📞 ${labels.contactInfo}`}>
              <InfoGrid items={contactFacts} />
            </TicketCard>

            {!!specialRequest && (
              <div
                style={{
                  background: C.orangeSoft,
                  border: `1px solid ${C.orange}`,
                  borderRadius: 12,
                  padding: 9,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: C.warningText,
                  }}
                >
                  ✍️ {labels.specialRequests}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    color: C.warningText,
                    fontSize: 13.5,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {specialRequest}
                </div>
              </div>
            )}
          </div>
        </div>

        {passengers.length > 0 && (
          <TicketCard
            title={`🧍 ${labels.passengersList}`}
            rightBadge={String(passengers.length)}
          >
            {/* Dạng bảng chiếm trọn bề ngang: mỗi khách một hàng, đủ ngày
                sinh / giới tính / cân nặng / quốc tịch / số giấy tờ. Trước đây
                khối này nằm trong cột hẹp nên phải cắt bớt ba cột cuối. */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  paddingBottom: 4,
                  borderBottom: `1px solid ${C.line}`,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                <div style={{ width: 18, flexShrink: 0 }}>#</div>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>{labels.name}</div>
                <div style={{ width: 74, flexShrink: 0 }}>{labels.colDob}</div>
                <div style={{ width: 54, flexShrink: 0 }}>{labels.colGender}</div>
                <div style={{ width: 52, flexShrink: 0 }}>{labels.colWeight}</div>
                <div style={{ width: 74, flexShrink: 0 }}>
                  {labels.colNationality}
                </div>
                <div style={{ width: 116, flexShrink: 0 }}>{labels.colId}</div>
              </div>

              {passengers.map((pax, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 0",
                    borderTop: idx === 0 ? "none" : `1px solid ${C.line}`,
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    color: C.text,
                  }}
                >
                  <div
                    style={{ width: 18, flexShrink: 0, color: C.accent, fontWeight: 700 }}
                  >
                    {idx + 1}.
                  </div>
                  <div
                    style={{
                      flex: "1 1 0",
                      minWidth: 0,
                      fontWeight: 700,
                      wordBreak: "break-word",
                    }}
                  >
                    {pax.fullName || "—"}
                  </div>
                  <div style={{ width: 74, flexShrink: 0 }}>
                    {pax.dob ? formatDateDisplay(pax.dob) : "—"}
                  </div>
                  <div style={{ width: 54, flexShrink: 0 }}>
                    {pax.gender || "—"}
                  </div>
                  <div style={{ width: 52, flexShrink: 0 }}>
                    {pax.weightKg ? `${pax.weightKg} kg` : "—"}
                  </div>
                  <div
                    style={{ width: 74, flexShrink: 0, wordBreak: "break-word" }}
                  >
                    {pax.nationality || "—"}
                  </div>
                  <div
                    style={{ width: 116, flexShrink: 0, wordBreak: "break-word" }}
                  >
                    {pax.idNumber || "—"}
                  </div>
                </div>
              ))}
            </div>
          </TicketCard>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: "50%", minWidth: 0 }}>
            <TicketCard title={`🎁 ${labels.additionalServices}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
            </TicketCard>
          </div>

          <div
            style={{
              width: "50%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                background: C.totalBg,
                color: C.white,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  opacity: 0.85,
                  fontWeight: 800,
                  paddingBottom: 5,
                  borderBottom: "1px solid rgba(255,255,255,0.22)",
                }}
              >
                💰 {labels.priceBreakdown}
              </div>

              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {priceLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Tên khoản + dòng chi tiết đơn giá × số lượng ngay bên
                        dưới. Lúc nén vé về khổ A4 em bỏ dòng chi tiết cho gọn,
                        nhưng khách cần thấy vì sao ra con số đó. */}
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12.5,
                          fontWeight: 600,
                          wordBreak: "break-word",
                          color:
                            line.type === "discount"
                              ? "#bbf7d0"
                              : "rgba(255,255,255,0.95)",
                        }}
                      >
                        {line.label}
                      </span>
                      {line.detail ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.7)",
                            wordBreak: "break-word",
                          }}
                        >
                          {line.detail}
                        </span>
                      ) : null}
                    </span>

                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        color: line.type === "discount" ? "#bbf7d0" : C.white,
                      }}
                    >
                      {line.amountText}
                    </span>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: 3,
                    paddingTop: 6,
                    borderTop: "1px solid rgba(255,255,255,0.25)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800 }}>
                    {labels.total}
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: 20, fontWeight: 900 }}>
                      {formatVND(totalWithSelectedServices)}
                    </span>
                    {usdReference ? (
                      <span
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.75)",
                        }}
                      >
                        ≈ {usdReference}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <TicketCard title={`🎒 ${labels.quickGuideTitle}`}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { icon: "👕", title: labels.guideWearTitle, items: labels.guideWear, tone: C.accent },
              { icon: "🎒", title: labels.guideBringTitle, items: labels.guideBring, tone: C.success },
              { icon: "🚫", title: labels.guideAvoidTitle, items: labels.guideAvoid, tone: C.orange },
            ].map((block) => (
              <div key={block.title} style={{ width: "33.333%", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: block.tone,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    paddingBottom: 3,
                    marginBottom: 3,
                    borderBottom: `2px solid ${block.tone}`,
                  }}
                >
                  {block.icon} {block.title}
                </div>
                {block.items.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 4,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: C.text,
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: block.tone, flexShrink: 0 }}>•</span>
                    <span style={{ minWidth: 0, wordBreak: "break-word" }}>
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              lineHeight: 1.5,
              color: C.warningText,
              background: C.warningBg,
              borderRadius: 8,
              padding: "5px 7px",
              fontWeight: 600,
            }}
          >
            ⚠️ {labels.guideNote}
          </div>
        </TicketCard>

        {/* Một câu dặn vui để tấm vé không chỉ là giấy tờ */}
        <div
          style={{
            marginTop: "auto",
            border: `2px dashed ${C.orange}`,
            background: C.orangeSoft,
            borderRadius: 12,
            padding: "9px 12px",
            textAlign: "center",
            fontSize: 15,
            fontWeight: 700,
            color: C.warningText,
            lineHeight: 1.45,
          }}
        >
          {labels.funLine}
        </div>
      </div>

      {/* Đường xé có hai khuyết tròn hai bên — cho ra dáng một tấm vé thật */}
      <div style={{ position: "relative", height: 18 }}>
        <div
          style={{
            position: "absolute",
            left: -9,
            top: 0,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#ffffff",
            border: `1px solid ${C.border}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -9,
            top: 0,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#ffffff",
            border: `1px solid ${C.border}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 8,
            borderTop: `2px dashed ${C.border}`,
          }}
        />
      </div>

      {/* ============ CHÂN VÉ ============ */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          background: C.card,
          padding: "10px 12px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
          Hotline: 0964.073.555 — 0385.907.789
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
          Zalo / WhatsApp — www.mebayluon.com
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: C.accentDark,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          ⏱️ {labels.safetyNote}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
          {labels.created}: {createdAt}
        </div>
      </div>
    </div>
  );
}

/**
 * Khung một khối trên vé: tiêu đề nhỏ in hoa màu xanh, gạch chân mảnh, rồi
 * tới nội dung. Mọi khối dùng chung một kiểu nên nhìn dọc xuống thấy đều.
 */
function TicketCard({
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
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          paddingBottom: 6,
          marginBottom: 7,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.8,
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
              padding: "1px 8px",
              fontSize: 11,
              fontWeight: 800,
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

/**
 * Lưới nhãn - giá trị: nhãn bên trái, giá trị in đậm bên phải, mỗi dòng một
 * đường kẻ mảnh. Thay cho các ô "pill" co giãn trước đây — chúng có bề rộng
 * khác nhau nên khi xuống hàng thì so le, ảnh xuất ra trông rối.
 */
function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            padding: "5px 0",
            borderTop: idx === 0 ? "none" : `1px solid ${C.line}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: C.subtext,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <span style={{ marginRight: 5, fontSize: 12 }}>{item.icon}</span>
            {item.label}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: C.text,
              fontWeight: 700,
              textAlign: "right",
              minWidth: 0,
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
  mapUrl,
  mapLabel,
}: {
  ok: boolean;
  label: string;
  qty?: number;
  notes?: string[];
  tag?: string;
  /** Điểm đón cố định: hiện thành link bấm được. */
  mapUrl?: string;
  mapLabel?: string;
}) {
  const tone = ok ? C.success : "#DC2626";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        fontSize: 13.5,
        lineHeight: 1.6,
        color: ok ? C.text : C.muted,
      }}
    >
      <span style={{ color: tone, fontWeight: 800, flexShrink: 0 }}>
        {ok ? "✓" : "✕"}
      </span>

      <span style={{ minWidth: 0, wordBreak: "break-word" }}>
        <span style={{ fontWeight: 700 }}>{label}</span>

        {qty && qty > 0 ? (
          <>
            {": "}
            <span style={{ color: C.success, fontWeight: 700 }}>×{qty}</span>
          </>
        ) : null}

        {notes && notes.length ? (
          <span style={{ color: C.subtext }}>
            {qty && qty > 0 ? " · " : ": "}
            {notes.join(" · ")}
          </span>
        ) : null}

        {mapUrl ? (
          <>
            {qty && qty > 0 ? " · " : ": "}
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.accent, fontWeight: 700 }}
            >
              {mapLabel || "Xem bản đồ"}
            </a>
          </>
        ) : null}

        {tag ? <span style={{ color: tone }}> ({tag})</span> : null}
      </span>
    </div>
  );
}




