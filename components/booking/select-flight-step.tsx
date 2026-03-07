"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useBookingStore } from "@/store/booking-store";
import {
  LOCATIONS,
  type LocationKey,
  type AddonKey,
  type PackageKey,
  type FlightTypeKey,
  formatByLang,
} from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";

type ServiceConfig = NonNullable<(typeof LOCATIONS)[LocationKey]["services"]>[number];
type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

const UI_TEXT: Record<
  LangUI,
  {
    selectFlightPackage: string;
    selectFlightType: string;
    locationServices: string;
    enterPickupAddress: string;
    pickupPlaceholder: string;
    continue: string;
    serviceUnavailable: string;
    quantity: string;
    pax: string;
    map: string;
    pkg1Price: string;
    pkg2Price: string;
    pleaseChoosePackage: string;
    noVisibleServices: string;
    hanoiMountainWarning: string;
    khauPhaShuttleWarning: string;
    daNangMountainWarning: string;
    quanBaPickupWarning: string;
    sunsetRefundNote: string;
    hanoiPrivateCarNote: string;
    khauPhaGarryaNote: string;
    daNangPickupNote: string;
    khauPhaPkg2NoPickup: string;
    hanoiFlycamNote: string;
    camera360Note: string;
  }
> = {
  vi: {
    selectFlightPackage: "Chọn gói bay",
    selectFlightType: "Chọn loại bay",
    locationServices: "Dịch vụ bổ sung theo điểm bay",
    enterPickupAddress: "Nhập vị trí đón",
    pickupPlaceholder: "Nhập địa chỉ đón",
    continue: "Tiếp tục",
    serviceUnavailable: "Không khả dụng tại điểm bay này",
    quantity: "Số lượt:",
    pax: "khách",
    map: "Xem Google Map",
    pkg1Price: "Thứ 2–6: 2.120.000đ / Thứ 7, CN, ngày lễ: 2.520.000đ",
    pkg2Price: "Giá áp dụng: 2.390.000đ",
    pleaseChoosePackage: "Vui lòng chọn package để hiển thị dịch vụ phù hợp.",
    noVisibleServices: "Chưa có dịch vụ hiển thị.",
    hanoiMountainWarning:
      "Nên dùng xe chuyên dụng lên núi để đảm bảo an toàn. Đường núi khó đi, không khuyến khích tự lái xe cá nhân.",
    khauPhaShuttleWarning:
      "Chuyến bay không bao gồm xe trung chuyển lên/xuống núi. Khách cần có mặt trước 15 phút để check-in.",
    daNangMountainWarning:
      "Nên dùng xe lên điểm cất cánh. Không nên dùng xe tay ga vì đường đèo dốc và điểm cất cánh cách bãi hạ cánh khoảng 12km.",
    quanBaPickupWarning:
      "Nếu tự di chuyển, vui lòng có mặt trước 15 phút để đội ngũ sắp xếp bay.",
    sunsetRefundNote:
      "Nếu hôm đó không có hoàng hôn như dự đoán, phần phụ phí hoàng hôn sẽ được hoàn lại.",
    hanoiPrivateCarNote:
      "1–3 khách: 1.500.000đ/xe. Từ khách thứ 4 trở đi cộng thêm 350.000đ/người.",
    khauPhaGarryaNote:
      "Tính theo block 4 khách: 700.000đ/xe/1 chiều. 5–8 khách: 1.400.000đ. Cứ mỗi 4 khách cộng thêm 700.000đ.",
    daNangPickupNote: "Giá có thể thay đổi theo vị trí đón và số lượng khách.",
    khauPhaPkg2NoPickup:
      "Chuyến bay không bao gồm xe trung chuyển đến điểm bay. Khách cần có mặt tại Mebayluon Clubhouse trước 15 phút để check-in.",
    hanoiFlycamNote:
      "Dịch vụ flycam tại Hà Nội có thể không sẵn. Sau khi đặt chỗ mới xác nhận, nếu không có sẽ hoàn 100% phí flycam.",
    camera360Note: "Video edit sẽ được gửi sau chuyến bay.",
  },
  en: {
    selectFlightPackage: "Choose flight package",
    selectFlightType: "Choose flight type",
    locationServices: "Location-specific services",
    enterPickupAddress: "Enter pickup address",
    pickupPlaceholder: "Enter pickup address",
    continue: "Continue",
    serviceUnavailable: "Not available at this location",
    quantity: "Qty:",
    pax: "pax",
    map: "View Google Map",
    pkg1Price: "Mon–Fri: 2,120,000 VND / Sat, Sun, holidays: 2,520,000 VND",
    pkg2Price: "Applied price: 2,390,000 VND",
    pleaseChoosePackage: "Please choose a package to see matching services.",
    noVisibleServices: "No services available yet.",
    hanoiMountainWarning:
      "It is recommended to use the specialized mountain vehicle for safety. The road is difficult and self-driving is not recommended.",
    khauPhaShuttleWarning:
      "This flight does not include the mountain shuttle. Please arrive 15 minutes early for check-in.",
    daNangMountainWarning:
      "It is recommended to use the shuttle to the takeoff point. Scooters are not recommended because the road is steep and about 12km.",
    quanBaPickupWarning:
      "If you arrange your own transport, please arrive 15 minutes early so the team can prepare your flight.",
    sunsetRefundNote:
      "If there is no sunset as forecast on that day, the sunset surcharge will be refunded.",
    hanoiPrivateCarNote:
      "1–3 guests: 1,500,000 VND/car. From the 4th guest onward, add 350,000 VND/person.",
    khauPhaGarryaNote:
      "Charged by blocks of 4 guests: 700,000 VND/car/one way. 5–8 guests: 1,400,000 VND. Every additional 4 guests adds 700,000 VND.",
    daNangPickupNote: "Price may change depending on pickup location and number of guests.",
    khauPhaPkg2NoPickup:
      "This flight does not include transfer to the takeoff point. Guests must arrive at Mebayluon Clubhouse 15 minutes before check-in.",
    hanoiFlycamNote:
      "Flycam service in Hanoi may not always be available. It will be confirmed after booking; if unavailable, the flycam fee will be fully refunded.",
    camera360Note: "Edited video will be sent after the flight.",
  },
  fr: {
    selectFlightPackage: "Choisir le forfait de vol",
    selectFlightType: "Choisir le type de vol",
    locationServices: "Services spécifiques au site",
    enterPickupAddress: "Saisir l’adresse de prise en charge",
    pickupPlaceholder: "Saisir l’adresse de prise en charge",
    continue: "Continuer",
    serviceUnavailable: "Non disponible sur ce site",
    quantity: "Qté :",
    pax: "pers",
    map: "Voir Google Map",
    pkg1Price: "Lun–Ven : 2 120 000 VND / Sam, Dim, fériés : 2 520 000 VND",
    pkg2Price: "Prix appliqué : 2 390 000 VND",
    pleaseChoosePackage: "Veuillez choisir un forfait pour voir les services correspondants.",
    noVisibleServices: "Aucun service affiché pour le moment.",
    hanoiMountainWarning:
      "Il est recommandé d’utiliser le véhicule spécialisé pour la montagne pour des raisons de sécurité. La route est difficile et il n’est pas conseillé de conduire soi-même.",
    khauPhaShuttleWarning:
      "Ce vol ne comprend pas la navette montagne. Veuillez arriver 15 minutes à l’avance pour l’enregistrement.",
    daNangMountainWarning:
      "Il est recommandé d’utiliser la navette vers le décollage. Les scooters ne sont pas conseillés car la route est pentue et fait environ 12 km.",
    quanBaPickupWarning:
      "Si vous venez par vos propres moyens, veuillez arriver 15 minutes à l’avance pour que l’équipe puisse préparer votre vol.",
    sunsetRefundNote:
      "S’il n’y a pas de coucher de soleil comme prévu ce jour-là, le supplément coucher de soleil sera remboursé.",
    hanoiPrivateCarNote:
      "1–3 passagers : 1 500 000 VND/voiture. À partir du 4e passager, ajouter 350 000 VND/personne.",
    khauPhaGarryaNote:
      "Facturé par bloc de 4 passagers : 700 000 VND/voiture/aller simple. 5–8 passagers : 1 400 000 VND. Chaque tranche supplémentaire de 4 passagers ajoute 700 000 VND.",
    daNangPickupNote: "Le prix peut varier selon le lieu de prise en charge et le nombre de passagers.",
    khauPhaPkg2NoPickup:
      "Ce vol ne comprend pas le transfert vers le point de départ. Les clients doivent arriver au Clubhouse Mebayluon 15 minutes avant l’enregistrement.",
    hanoiFlycamNote:
      "Le service flycam à Hanoï n’est pas toujours disponible. Il sera confirmé après la réservation ; en cas d’indisponibilité, les frais flycam seront remboursés à 100 %.",
    camera360Note: "La vidéo montée sera envoyée après le vol.",
  },
  ru: {
    selectFlightPackage: "Выберите пакет полёта",
    selectFlightType: "Выберите тип полёта",
    locationServices: "Услуги для этой локации",
    enterPickupAddress: "Введите адрес трансфера",
    pickupPlaceholder: "Введите адрес трансфера",
    continue: "Продолжить",
    serviceUnavailable: "Недоступно в этой локации",
    quantity: "Кол-во:",
    pax: "чел",
    map: "Открыть Google Map",
    pkg1Price: "Пн–Пт: 2 120 000 VND / Сб, Вс, праздники: 2 520 000 VND",
    pkg2Price: "Применяемая цена: 2 390 000 VND",
    pleaseChoosePackage: "Пожалуйста, выберите пакет, чтобы увидеть соответствующие услуги.",
    noVisibleServices: "Пока нет отображаемых услуг.",
    hanoiMountainWarning:
      "Для безопасности рекомендуется использовать специальный горный транспорт. Дорога сложная, самостоятельная поездка не рекомендуется.",
    khauPhaShuttleWarning:
      "Этот полёт не включает горный трансфер. Пожалуйста, прибудьте за 15 минут до регистрации.",
    daNangMountainWarning:
      "Рекомендуется использовать трансфер до точки старта. Скутеры не рекомендуются, так как дорога крутая и около 12 км.",
    quanBaPickupWarning:
      "Если вы добираетесь самостоятельно, пожалуйста, прибудьте за 15 минут, чтобы команда успела подготовить ваш полёт.",
    sunsetRefundNote:
      "Если в этот день не будет заката, как прогнозировалось, доплата за закат будет возвращена.",
    hanoiPrivateCarNote:
      "1–3 гостя: 1 500 000 VND/машина. Начиная с 4-го гостя, добавляется 350 000 VND/чел.",
    khauPhaGarryaNote:
      "Стоимость по блокам по 4 гостя: 700 000 VND/машина/в одну сторону. 5–8 гостей: 1 400 000 VND. Каждые дополнительные 4 гостя добавляют 700 000 VND.",
    daNangPickupNote: "Цена может меняться в зависимости от места трансфера и количества гостей.",
    khauPhaPkg2NoPickup:
      "Этот полёт не включает трансфер до точки старта. Гости должны прибыть в Mebayluon Clubhouse за 15 минут до регистрации.",
    hanoiFlycamNote:
      "Услуга flycam в Ханое может быть недоступна. Это подтверждается после бронирования; если услуга недоступна, стоимость flycam возвращается полностью.",
    camera360Note: "Смонтированное видео будет отправлено после полёта.",
  },
  hi: {
    selectFlightPackage: "फ्लाइट पैकेज चुनें",
    selectFlightType: "फ्लाइट प्रकार चुनें",
    locationServices: "लोकेशन के अनुसार सेवाएँ",
    enterPickupAddress: "पिकअप पता दर्ज करें",
    pickupPlaceholder: "पिकअप पता दर्ज करें",
    continue: "आगे बढ़ें",
    serviceUnavailable: "इस लोकेशन पर उपलब्ध नहीं",
    quantity: "संख्या:",
    pax: "यात्री",
    map: "Google Map देखें",
    pkg1Price: "सोम–शुक्र: 2,120,000 VND / शनि, रवि, छुट्टी: 2,520,000 VND",
    pkg2Price: "लागू मूल्य: 2,390,000 VND",
    pleaseChoosePackage: "कृपया संबंधित सेवाएँ देखने के लिए पैकेज चुनें।",
    noVisibleServices: "अभी कोई सेवा उपलब्ध नहीं है।",
    hanoiMountainWarning:
      "सुरक्षा के लिए विशेष माउंटेन वाहन का उपयोग करना बेहतर है। रास्ता कठिन है और स्वयं ड्राइव करना उचित नहीं है।",
    khauPhaShuttleWarning:
      "इस फ्लाइट में माउंटेन शटल शामिल नहीं है। कृपया चेक-इन के लिए 15 मिनट पहले पहुँचें।",
    daNangMountainWarning:
      "टेकऑफ पॉइंट तक शटल का उपयोग करना बेहतर है। स्कूटर की सलाह नहीं दी जाती क्योंकि रास्ता ढलानदार है और लगभग 12 किमी है।",
    quanBaPickupWarning:
      "यदि आप स्वयं आ रहे हैं, तो कृपया 15 मिनट पहले पहुँचें ताकि टीम उड़ान की तैयारी कर सके।",
    sunsetRefundNote:
      "यदि उस दिन अनुमान के अनुसार सूर्यास्त नहीं होता, तो सूर्यास्त शुल्क वापस कर दिया जाएगा।",
    hanoiPrivateCarNote:
      "1–3 यात्री: 1,500,000 VND/कार। चौथे यात्री से आगे 350,000 VND/व्यक्ति अतिरिक्त।",
    khauPhaGarryaNote:
      "4 यात्रियों के ब्लॉक के अनुसार शुल्क: 700,000 VND/कार/एक तरफ। 5–8 यात्री: 1,400,000 VND। हर अतिरिक्त 4 यात्रियों पर 700,000 VND और जुड़ेंगे।",
    daNangPickupNote: "पिकअप स्थान और यात्रियों की संख्या के अनुसार मूल्य बदल सकता है।",
    khauPhaPkg2NoPickup:
      "इस फ्लाइट में टेकऑफ पॉइंट तक ट्रांसफर शामिल नहीं है। मेहमानों को चेक-इन से 15 मिनट पहले Mebayluon Clubhouse पहुँचना होगा।",
    hanoiFlycamNote:
      "हनोई में फ्लाईकैम सेवा हमेशा उपलब्ध नहीं हो सकती। यह बुकिंग के बाद कन्फर्म होगी; यदि उपलब्ध नहीं हुई, तो फ्लाईकैम शुल्क पूरी तरह वापस किया जाएगा।",
    camera360Note: "एडिट किया गया वीडियो उड़ान के बाद भेजा जाएगा।",
  },
  zh: {
    selectFlightPackage: "选择飞行套餐",
    selectFlightType: "选择飞行类型",
    locationServices: "按飞行地点提供的服务",
    enterPickupAddress: "填写接送地址",
    pickupPlaceholder: "填写接送地址",
    continue: "继续",
    serviceUnavailable: "该飞行地点不可用",
    quantity: "数量：",
    pax: "人",
    map: "查看 Google Map",
    pkg1Price: "周一至周五：2,120,000 VND / 周末及节假日：2,520,000 VND",
    pkg2Price: "适用价格：2,390,000 VND",
    pleaseChoosePackage: "请选择套餐以显示对应服务。",
    noVisibleServices: "暂时没有可显示的服务。",
    hanoiMountainWarning:
      "建议使用专用上山车辆以确保安全。山路较难行驶，不建议自驾。",
    khauPhaShuttleWarning:
      "该飞行不包含上下山接驳车。请提前 15 分钟到场办理登记。",
    daNangMountainWarning:
      "建议使用前往起飞点的接驳车。不建议骑踏板车，因为山路陡且距离约 12 公里。",
    quanBaPickupWarning:
      "如果您自行前往，请提前 15 分钟到达，以便团队安排飞行。",
    sunsetRefundNote:
      "如果当天没有如预期出现日落，日落附加费将退还。",
    hanoiPrivateCarNote:
      "1–3 位客人：1,500,000 VND/车。第 4 位起每人加收 350,000 VND。",
    khauPhaGarryaNote:
      "按每 4 位客人为一个区块计费：700,000 VND/车/单程。5–8 位客人：1,400,000 VND。每增加 4 位客人再加 700,000 VND。",
    daNangPickupNote: "价格可能会根据接送地点和人数变化。",
    khauPhaPkg2NoPickup:
      "该飞行不包含前往起飞点的接送服务。客人需在登记前 15 分钟到达 Mebayluon Clubhouse。",
    hanoiFlycamNote:
      "河内的 Flycam 服务可能并非一直可用。需在预订后确认；如果无法提供，将全额退还 Flycam 费用。",
    camera360Note: "剪辑后的视频将在飞行结束后发送。",
  },
};

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function getHolidayAwarePriceText(
  lang: string,
  weekday?: number,
  weekend?: number,
  holiday?: number,
  fixed?: number
) {
  if (fixed) return formatByLang(lang as any, fixed, Math.round(fixed / 25000));
  const v = weekday ?? weekend ?? holiday ?? 0;
  return formatByLang(lang as any, v, Math.round(v / 25000));
}

export default function SelectFlightStep() {
  const t = useBookingText();
  const lang = (useLangCode() || "vi") as LangUI;
  const ui = UI_TEXT[lang] ?? UI_TEXT.vi;

  const data = useBookingStore((s) => s.data);
  const setGuestsCount = useBookingStore((s) => s.setGuestsCount);
  const setAddonQty = useBookingStore((s) => s.setAddonQty);
  const update = useBookingStore((s) => s.update);
  const next = useBookingStore((s) => s.next);

  const setLocation = useBookingStore((s) => s.setLocation);
  const setPackageKey = useBookingStore((s) => s.setPackageKey);
  const setFlightTypeKey = useBookingStore((s) => s.setFlightTypeKey);
  const setServiceSelected = useBookingStore((s) => s.setServiceSelected);
  const setServiceInput = useBookingStore((s) => s.setServiceInput);
  const clearService = useBookingStore((s) => s.clearService);

  const [guestInput, setGuestInput] = useState(String(data.guestsCount || 1));

  const selected = data.location as LocationKey;
  const selectedCfg = selected ? LOCATIONS[selected] : null;
  const maxQty = Math.max(1, data.guestsCount || 1);

  const selectedPackage = useMemo(() => {
    if (!selectedCfg?.packages?.length) return undefined;
    return selectedCfg.packages.find((p) => p.key === data.packageKey);
  }, [selectedCfg, data.packageKey]);

  const visibleServices = useMemo(() => {
    if (!selectedCfg?.services?.length) return [] as ServiceConfig[];

    return selectedCfg.services.filter((svc) => {
      if (!svc.visibleForPackages?.length) return true;
      if (!data.packageKey) return false;
      return svc.visibleForPackages.includes(data.packageKey as PackageKey);
    });
  }, [selectedCfg, data.packageKey]);

  const handleSelectLocation = (key: LocationKey) => {
    setLocation(key);
    update({
      addons: {},
      addonsQty: {},
      services: {},
      packageKey: undefined,
      flightTypeKey: undefined,
      contact: {
        ...(data.contact || { phone: "", email: "" }),
        pickupLocation: "",
      },
    });
  };

  const handleGuestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (/^[0-9]*$/.test(rawValue)) {
      setGuestInput(rawValue);
      const numValue = parseInt(rawValue, 10);
      setGuestsCount(isNaN(numValue) ? 1 : numValue);
    }
  };

  const handleGuestInputBlur = () => {
    const normalized = clampInt(guestInput || 1, 1, 100);
    setGuestInput(String(normalized));
    setGuestsCount(normalized);
  };

  const handlePickPackage = (pkgKey: PackageKey) => {
    setPackageKey(pkgKey);
  };

  const handlePickFlightType = (flightTypeKey: FlightTypeKey) => {
    setFlightTypeKey(flightTypeKey);
  };

  const handleToggleService = (svc: ServiceConfig) => {
    const currentSelected = !!data.services?.[svc.key]?.selected;
    const nextSelected = !currentSelected;

    if (svc.exclusiveGroup && nextSelected) {
      visibleServices
        .filter((x) => x.exclusiveGroup === svc.exclusiveGroup && x.key !== svc.key)
        .forEach((x) => {
          clearService(x.key);
        });
    }

    setServiceSelected(svc.key, nextSelected);

    if (!nextSelected) {
      setServiceInput(svc.key, "");
    }
  };

  const getServiceSelected = (key: string) => !!data.services?.[key]?.selected;
  const getServiceInput = (key: string) => data.services?.[key]?.inputText || "";

  const renderServiceWarning = (svc: ServiceConfig) => {
    const selectedSvc = getServiceSelected(svc.key);

    if (svc.key === "ha_noi_mountain_shuttle" && !selectedSvc) {
      return <p className="text-xs text-amber-200 italic">{ui.hanoiMountainWarning}</p>;
    }

    if (svc.key === "khau_pha_pkg_1_shuttle" && !selectedSvc) {
      return <p className="text-xs text-amber-200 italic">{ui.khauPhaShuttleWarning}</p>;
    }

    if (svc.key === "da_nang_mountain_shuttle" && !selectedSvc) {
      return <p className="text-xs text-amber-200 italic">{ui.daNangMountainWarning}</p>;
    }

    if (svc.key === "quan_ba_pickup" && !selectedSvc) {
      return <p className="text-xs text-amber-200 italic">{ui.quanBaPickupWarning}</p>;
    }

    if (svc.key === "ha_noi_sunset" && selectedSvc) {
      return <p className="text-xs text-slate-300 italic">{ui.sunsetRefundNote}</p>;
    }

    if (svc.key === "ha_noi_private_hotel_pickup" && selectedSvc) {
      return <p className="text-xs text-slate-300 italic">{ui.hanoiPrivateCarNote}</p>;
    }

    if (
      (svc.key === "khau_pha_pkg_1_garrya_pickup" || svc.key === "khau_pha_pkg_2_garrya_pickup") &&
      selectedSvc
    ) {
      return <p className="text-xs text-slate-300 italic">{ui.khauPhaGarryaNote}</p>;
    }

    if (svc.key === "da_nang_hotel_pickup" && selectedSvc) {
      return <p className="text-xs text-slate-300 italic">{ui.daNangPickupNote}</p>;
    }

    return null;
  };

  const allKhauPhaPkg2PickupUnchecked =
    selected === "khau_pha" &&
    data.packageKey === "khau_pha_pkg_2" &&
    !getServiceSelected("khau_pha_pkg_2_tu_le_pickup") &&
    !getServiceSelected("khau_pha_pkg_2_garrya_pickup");

  const requiredPickupInputsMissing = visibleServices.some((svc) => {
    if (!svc.requiresPickupInput) return false;
    if (!getServiceSelected(svc.key)) return false;
    if (svc.fixedMapUrl) return false;
    return !getServiceInput(svc.key).trim();
  });

  const canGoNext =
    !!selected &&
    (selected !== "khau_pha" || !!data.packageKey) &&
    (selected !== "khau_pha" || !!data.flightTypeKey) &&
    !requiredPickupInputsMissing &&
    (data.guestsCount || 0) > 0;

  const labels: any = t?.labels || {};
  const messages: any = t?.messages || {};
  const buttons: any = t?.buttons || {};

  return (
    <div className="space-y-10 text-white">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {Object.values(LOCATIONS).map((loc) => {
          const isActive = selected === loc.key;
          const priceText = formatByLang(lang, loc.basePriceVND(), loc.basePriceUSD());

          return (
            <motion.div
              key={loc.key}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleSelectLocation(loc.key as LocationKey)}
              className={`cursor-pointer p-5 rounded-2xl border text-center backdrop-blur-lg transition-all duration-300 ${
                isActive
                  ? "bg-white/30 border-accent/70 shadow-xl"
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
            >
              <h3 className="text-xl font-semibold mb-2">{loc.name[lang] ?? loc.name.vi}</h3>
              <div className="text-lg font-bold text-white">{priceText}</div>
              <p className="text-xs text-white mt-1">
                {lang === "vi" ? "/ khách (giá cơ bản)" : "/ pax (base price)"}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-lg"
      >
        {!selectedCfg ? (
          <p className="text-center text-white">
            {messages.selectLocationToSeeDetail || "Vui lòng chọn điểm bay để xem chi tiết"}
          </p>
        ) : (
          <div>
            <h4 className="text-2xl font-semibold mb-3 text-white">
              {selectedCfg.name[lang] ?? selectedCfg.name.vi}
            </h4>

            <ul className="list-disc ml-6 space-y-1 text-white text-sm">
              {(selectedCfg.included[lang] ?? selectedCfg.included.vi).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>

            {selectedCfg.excluded &&
              (selectedCfg.excluded[lang] ?? selectedCfg.excluded.vi)?.length > 0 && (
                <p className="text-xs text-white mt-3">
                  <strong>{labels.notIncluded || "Không bao gồm"} </strong>
                  {(selectedCfg.excluded[lang] ?? selectedCfg.excluded.vi).join(", ")}
                </p>
              )}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-md">
          <label className="block text-sm font-medium mb-2">
            {labels.guestsCount || "Số lượng khách"}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={guestInput}
            onChange={handleGuestInputChange}
            onBlur={handleGuestInputBlur}
            className="w-full rounded-lg bg-white/20 border border-white/30 px-3 py-2 text-white placeholder-slate-300"
          />
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-md text-sm text-white">
          {messages.groupPromoAuto || "Ưu đãi nhóm sẽ được áp dụng tự động nếu đủ điều kiện."}
        </div>
      </div>

      {selectedCfg?.key === "khau_pha" && selectedCfg.packages?.length ? (
        <div className="space-y-4">
          <h4 className="text-xl font-semibold">{ui.selectFlightPackage}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedCfg.packages.map((pkg) => {
              const active = data.packageKey === pkg.key;
              return (
                <button
                  key={pkg.key}
                  type="button"
                  onClick={() => handlePickPackage(pkg.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "bg-white/30 border-accent/70 shadow-lg"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <div className="text-lg font-semibold">{pkg.label[lang] ?? pkg.label.vi}</div>
                  <div className="text-sm text-white/80 mt-2">
                    {pkg.key === "khau_pha_pkg_1" ? ui.pkg1Price : ui.pkg2Price}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {selected === "khau_pha" && selectedPackage ? (
        <div className="space-y-4">
          <h4 className="text-xl font-semibold">{ui.selectFlightType}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPackage.flightTypes.map((ft) => {
              const active = data.flightTypeKey === ft.key;
              const displayText = getHolidayAwarePriceText(
                lang,
                ft.weekday,
                ft.weekend,
                ft.holiday,
                ft.fixed
              );

              return (
                <button
                  key={ft.key}
                  type="button"
                  onClick={() => handlePickFlightType(ft.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "bg-white/30 border-accent/70 shadow-lg"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <div className="text-lg font-semibold">{ft.label[lang] ?? ft.label.vi}</div>
                  <div className="text-sm text-white/80 mt-2">{displayText}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedCfg?.services?.length ? (
        <div className="space-y-4">
          <h4 className="text-xl font-semibold">{ui.locationServices}</h4>

          {visibleServices.length === 0 ? (
            <p className="text-sm text-white/70 italic">
              {selected === "khau_pha" ? ui.pleaseChoosePackage : ui.noVisibleServices}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleServices.map((svc) => {
                const active = getServiceSelected(svc.key);
                const priceVND = svc.priceVND ?? 0;
                const priceUSD = svc.priceUSD ?? (priceVND ? Math.round(priceVND / 25000) : 0);

                return (
                  <div
                    key={svc.key}
                    className={`rounded-2xl border p-4 backdrop-blur-md transition ${
                      active
                        ? "bg-white/30 border-accent/70 shadow-lg"
                        : "bg-white/10 border-white/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleService(svc)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                              active
                                ? "bg-accent/80 border-accent/80"
                                : "bg-white/10 border-white/30"
                            }`}
                          >
                            {active ? <span className="text-white text-sm">✓</span> : null}
                          </span>
                          <div>
                            <div className="font-medium">{svc.label[lang] ?? svc.label.vi}</div>
                            {(svc.description?.[lang] ?? svc.description?.vi) ? (
                              <div className="text-xs text-white/70 mt-1">
                                {svc.description?.[lang] ?? svc.description?.vi}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {!!priceVND && (
                          <div className="text-sm font-medium text-white whitespace-nowrap">
                            {formatByLang(lang, priceVND, priceUSD)}
                            {svc.key.includes("private_hotel_pickup") ||
                            svc.key.includes("garrya_pickup")
                              ? ""
                              : ` / ${ui.pax}`}
                          </div>
                        )}
                      </div>
                    </button>

                    {svc.fixedMapUrl && active ? (
                      <div className="mt-3 text-sm text-white/90">
                        <a
                          href={svc.fixedMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-300 underline"
                        >
                          {ui.map}
                        </a>
                      </div>
                    ) : null}

                    {svc.requiresPickupInput && active && !svc.fixedMapUrl ? (
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-2">
                          {ui.enterPickupAddress}
                        </label>
                        <input
                          type="text"
                          value={getServiceInput(svc.key)}
                          onChange={(e) => setServiceInput(svc.key, e.target.value)}
                          placeholder={ui.pickupPlaceholder}
                          className="w-full rounded-lg bg-white/20 border border-white/30 px-3 py-2 text-white placeholder-slate-300"
                        />
                      </div>
                    ) : null}

                    <div className="mt-3">{renderServiceWarning(svc)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {allKhauPhaPkg2PickupUnchecked ? (
            <p className="text-sm text-amber-200 italic">{ui.khauPhaPkg2NoPickup}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <h4 className="text-xl font-semibold mb-4">{labels.addonsTitle || "Dịch vụ tuỳ chọn"}</h4>

        {!selectedCfg ? (
          <p className="text-slate-200 italic text-sm">
            {labels.addonsPromptSelectLocation || "Vui lòng chọn điểm bay trước"}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADDON_KEYS.map((key) => {
              const conf = selectedCfg.addons[key];
              const disabled =
                conf.pricePerPersonVND === null && conf.pricePerPersonUSD === null;

              const qty = data.addonsQty?.[key] ?? 0;
              const active = qty > 0;

              const priceText =
                conf.pricePerPersonVND == null && conf.pricePerPersonUSD == null
                  ? ""
                  : formatByLang(
                      lang,
                      conf.pricePerPersonVND ?? 0,
                      conf.pricePerPersonUSD ??
                        (conf.pricePerPersonVND != null
                          ? Math.round(conf.pricePerPersonVND / 26000)
                          : 0)
                    );

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (disabled) return;
                    if (!active) setAddonQty(key, 1);
                  }}
                  className={`flex flex-col gap-2 rounded-xl border backdrop-blur-md p-4 transition-all duration-200 ${
                    active
                      ? "bg-white/30 border-accent/70 shadow-lg"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                          active ? "bg-accent/80 border-accent/80" : "bg-white/10 border-white/30"
                        }`}
                      >
                        {active ? <span className="text-white text-sm">✓</span> : null}
                      </span>

                      <span className="font-medium">{conf.label[lang] ?? conf.label.vi}</span>
                    </div>

                    {!disabled && (
                      <span className="text-xs text-white/80">
                        {active ? `${qty}/${maxQty}` : ""}
                      </span>
                    )}
                  </div>

                  {priceText ? (
                    <p className="text-sm text-white">
                      {priceText} / {ui.pax}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 italic mt-1">
                      {ui.serviceUnavailable}
                    </p>
                  )}

                  {!disabled && active && (
                    <div
                      className="mt-1 flex items-center justify-between rounded-lg bg-black/20 border border-white/20 px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-sm font-medium">{ui.quantity}</span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAddonQty(key, qty - 1)}
                          disabled={qty <= 0}
                          className="h-8 w-8 rounded-full bg-white/10 border border-white/20 disabled:opacity-40"
                        >
                          −
                        </button>

                        <span className="min-w-6 text-center font-semibold">{qty}</span>

                        <button
                          type="button"
                          onClick={() => setAddonQty(key, clampInt(qty + 1, 0, maxQty))}
                          disabled={qty >= maxQty}
                          className="h-8 w-8 rounded-full bg-white/10 border border-white/20 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {key === "flycam" && selected === "ha_noi" ? (
                    <p className="text-xs italic text-slate-300">{ui.hanoiFlycamNote}</p>
                  ) : null}

                  {key === "camera360" && active ? (
                    <p className="text-xs italic text-slate-300">{ui.camera360Note}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!canGoNext}
          className="px-6 py-2.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition disabled:opacity-50"
        >
          {buttons.next || ui.continue}
        </button>
      </div>
    </div>
  );
}