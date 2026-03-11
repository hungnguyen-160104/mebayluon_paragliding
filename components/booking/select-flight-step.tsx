"use client";

import React, { useMemo, useState } from "react";

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
import FlightCard from "@/components/booking/flight-card";

type ServiceConfig =
  NonNullable<(typeof LOCATIONS)[LocationKey]["services"]>[number];
type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

const UI_TEXT: Record<
  LangUI,
  {
    title: string;
    subtitle: string;
    locationsTitle: string;
    configurationTitle: string;
    servicesTitle: string;
    addonsTitle: string;
    selectFlightType: string;
    flightDescriptionTitle: string;
    locationServices: string;
    enterPickupAddress: string;
    pickupPlaceholder: string;
    continue: string;
    serviceUnavailable: string;
    quantity: string;
    pax: string;
    map: string;
    includedLabel: string;
    notIncludedLabel: string;
    chooseLocationPrompt: string;
    chooseFlightTypePrompt: string;
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
    guestsLabel: string;
    groupPromoNote: string;
    groupDiscountTitle: string;
    groupTierRow: (min: number, amount: string) => string;
    selectedLocationLabel: string;
    flightTypeHint: string;
    paraglidingTitle: string;
    paramotorTitle: string;
    paraglidingDescription: string[];
    paramotorDescription: string[];
  }
> = {
  vi: {
    title: "Đặt chuyến bay",
    subtitle: "Chọn điểm bay, số khách và các dịch vụ phù hợp.",
    locationsTitle: "Chọn điểm bay",
    configurationTitle: "Cấu hình chuyến bay",
    servicesTitle: "Dịch vụ theo điểm bay",
    addonsTitle: "Dịch vụ quay chụp thêm",
    selectFlightType: "Chọn loại bay",
    flightDescriptionTitle: "Mô tả chuyến bay",
    locationServices: "Dịch vụ bổ sung theo điểm bay",
    enterPickupAddress: "Nhập vị trí đón",
    pickupPlaceholder: "Nhập địa chỉ đón",
    continue: "Tiếp tục",
    serviceUnavailable: "Không khả dụng tại điểm bay này",
    quantity: "Số lượng",
    pax: "khách",
    map: "Xem Google Map",
    includedLabel: "Bao gồm",
    notIncludedLabel: "Không bao gồm",
    chooseLocationPrompt: "Vui lòng chọn điểm bay để xem chi tiết.",
    chooseFlightTypePrompt: "Vui lòng chọn loại bay để xem mô tả chi tiết.",
    noVisibleServices: "Hiện chưa có dịch vụ hiển thị cho lựa chọn này.",
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
    guestsLabel: "Số lượng khách",
    groupPromoNote: "Ưu đãi nhóm sẽ được áp dụng tự động nếu đủ điều kiện.",
    groupDiscountTitle: "Giảm giá trực tiếp khi đăng ký theo nhóm",
    groupTierRow: (min) => `Nhóm từ ${min} người trở lên`,
    selectedLocationLabel: "Điểm bay đã chọn",
    flightTypeHint: "Loại bay",
    paraglidingTitle: "Bay dù không động cơ",
    paramotorTitle: "Bay dù gắn động cơ",
    paraglidingDescription: [
      "Cất cánh từ đỉnh đèo Khau Phạ - một trong Tứ đại Đỉnh đèo của Việt Nam, độ cao cất cánh 1.268m - hạ cánh giữa danh thắng ruộng bậc thang Thung lũng Lìm Mông tuyệt đẹp. Đây là vào một trong những điểm bay dù lượn đẹp nhất thế giới với vẻ đẹp siêu thực.",
      "Dù lượn không động cơ bay hoàn toàn nhờ sức gió tự nhiên, mang đến cảm giác bay tự do đúng nghĩa.",
      "Khách bay được trải nghiệm cảm giác “nhảy dù” bằng chính đôi chân của mình và ngắm trọn Mùa vàng từ trên không.",
    ],
    paramotorDescription: [
      "Dù lượn gắn động cơ cất cánh từ thung lũng Lìm Mông (tại Mebayluon Clubhouse) độ cao 700m, bay ngược lên đỉnh đèo Khau Phạ độ cao ~1.500m và quay trở lại điểm xuất phát.",
      "Chuyến bay dài từ 10-25 phút tùy sức khoẻ của khách ngắm trọn đèo Khau Phạ, một trong Tứ đại Đỉnh đèo của Việt Nam và chiêm ngưỡng toàn cảnh danh thắng ruộng bậc thang Thung lũng Lìm Mông tuyệt đẹp, nơi được đánh giá “có vẻ đẹp siêu thực”.",
      "Chuyến bay có động cơ nên ít bị phụ thuộc vào gió, chủ động và dễ dàng lên cao kéo dài chuyến bay, giúp bạn khám phá những góc bay độc đáo mà dù lượn thông thường khó chạm tới.",
    ],
  },

  en: {
    title: "Book your flight",
    subtitle: "Choose location, guests, and services in one streamlined screen designed for quick booking.",
    locationsTitle: "Choose location",
    configurationTitle: "Flight configuration",
    servicesTitle: "Location services",
    addonsTitle: "Photo / video extras",
    selectFlightType: "Choose flight type",
    flightDescriptionTitle: "Flight description",
    locationServices: "Location-specific services",
    enterPickupAddress: "Enter pickup address",
    pickupPlaceholder: "Enter pickup address",
    continue: "Continue",
    serviceUnavailable: "Not available at this location",
    quantity: "Quantity",
    pax: "pax",
    map: "View Google Map",
    includedLabel: "Included",
    notIncludedLabel: "Not included",
    chooseLocationPrompt: "Please choose a location to view details.",
    chooseFlightTypePrompt: "Please choose a flight type to see the detailed description.",
    noVisibleServices: "No services available for this selection yet.",
    hanoiMountainWarning:
      "It is recommended to use the mountain shuttle for safety. The road is difficult and self-driving is not recommended.",
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
    daNangPickupNote:
      "Price may change depending on pickup location and number of guests.",
    khauPhaPkg2NoPickup:
      "This flight does not include transfer to the takeoff point. Guests must arrive at Mebayluon Clubhouse 15 minutes before check-in.",
    hanoiFlycamNote:
      "Flycam service in Hanoi may not always be available. It will be confirmed after booking; if unavailable, the flycam fee will be fully refunded.",
    camera360Note: "Edited video will be sent after the flight.",
    guestsLabel: "Guest count",
    groupPromoNote: "Group promotion is applied automatically when eligible.",
    groupDiscountTitle: "Direct discount for group bookings",
    groupTierRow: (min) => `Group of ${min} or more`,
    selectedLocationLabel: "Selected location",
    flightTypeHint: "Flight type",
    paraglidingTitle: "Paragliding",
    paramotorTitle: "Paramotor",
    paraglidingDescription: [
      "Take off from the top of Khau Pha Pass — one of Vietnam’s four great mountain passes — at an elevation of 1,268m, and land in the middle of the breathtaking terraced rice fields of Lim Mong Valley. This is considered one of the most beautiful paragliding sites in the world, with a surreal landscape.",
      "Non-motorized paragliding flies entirely with natural wind, offering a true sense of free flight.",
      "Guests can experience the thrill of a real foot-launched takeoff and admire the golden season from above.",
    ],
    paramotorDescription: [
      "Motorized paragliding takes off from Lim Mong Valley (at Mebayluon Clubhouse) at 700m altitude, flies back up toward Khau Pha Pass at around 1,500m, and returns to the starting point.",
      "The flight lasts around 10–25 minutes depending on the guest’s condition, offering panoramic views of Khau Pha Pass — one of Vietnam’s four great mountain passes — and the magnificent terraced rice fields of Lim Mong Valley, often described as having a surreal beauty.",
      "Because it is powered, the flight depends less on wind, can climb more easily, and can extend flight time, allowing you to explore unique aerial perspectives that conventional paragliding often cannot reach.",
    ],
  },

  fr: {
    title: "Réserver votre vol",
    subtitle: "Choisissez le site, le nombre de passagers et les services sur un seul écran optimisé.",
    locationsTitle: "Choisir le site",
    configurationTitle: "Configuration du vol",
    servicesTitle: "Services du site",
    addonsTitle: "Options photo / vidéo",
    selectFlightType: "Choisir le type de vol",
    flightDescriptionTitle: "Description du vol",
    locationServices: "Services spécifiques au site",
    enterPickupAddress: "Saisir l’adresse de prise en charge",
    pickupPlaceholder: "Saisir l’adresse de prise en charge",
    continue: "Continuer",
    serviceUnavailable: "Non disponible sur ce site",
    quantity: "Quantité",
    pax: "pers",
    map: "Voir Google Map",
    includedLabel: "Inclus",
    notIncludedLabel: "Non inclus",
    chooseLocationPrompt: "Veuillez choisir un site pour voir les détails.",
    chooseFlightTypePrompt: "Veuillez choisir un type de vol pour voir la description détaillée.",
    noVisibleServices: "Aucun service disponible pour cette sélection.",
    hanoiMountainWarning:
      "Il est recommandé d’utiliser le véhicule de montagne pour la sécurité. La route est difficile et la conduite personnelle n’est pas conseillée.",
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
    daNangPickupNote:
      "Le prix peut varier selon le lieu de prise en charge et le nombre de passagers.",
    khauPhaPkg2NoPickup:
      "Ce vol ne comprend pas le transfert vers le point de départ. Les clients doivent arriver au Clubhouse Mebayluon 15 minutes avant l’enregistrement.",
    hanoiFlycamNote:
      "Le service flycam à Hanoï n’est pas toujours disponible. Il sera confirmé après la réservation ; en cas d’indisponibilité, les frais flycam seront remboursés à 100 %.",
    camera360Note: "La vidéo montée sera envoyée après le vol.",
    guestsLabel: "Nombre de passagers",
    groupPromoNote: "La remise de groupe s’applique automatiquement si vous êtes éligible.",
    groupDiscountTitle: "Réduction directe pour réservation de groupe",
    groupTierRow: (min) => `Groupe de ${min} personnes ou plus`,
    selectedLocationLabel: "Site sélectionné",
    flightTypeHint: "Type de vol",
    paraglidingTitle: "Parapente sans moteur",
    paramotorTitle: "Paramoteur",
    paraglidingDescription: [
      "Décollage depuis le sommet du col de Khau Pha — l’un des quatre grands cols du Vietnam — à 1 268 m d’altitude, puis atterrissage au milieu des magnifiques rizières en terrasses de la vallée de Lim Mong. C’est l’un des plus beaux sites de parapente au monde, avec un paysage presque irréel.",
      "Le parapente sans moteur vole entièrement grâce au vent naturel, offrant une véritable sensation de liberté.",
      "Les passagers vivent l’expérience d’un décollage à pied et admirent toute la saison dorée vue du ciel.",
    ],
    paramotorDescription: [
      "Le parapente motorisé décolle depuis la vallée de Lim Mong (au Mebayluon Clubhouse) à 700 m d’altitude, remonte vers le col de Khau Pha à environ 1 500 m, puis revient au point de départ.",
      "Le vol dure de 10 à 25 minutes selon la condition du client, avec une vue panoramique sur le col de Khau Pha et les superbes rizières en terrasses de la vallée de Lim Mong, réputées pour leur beauté surréaliste.",
      "Grâce au moteur, le vol dépend moins du vent, permet de monter plus facilement et de prolonger l’expérience, afin de découvrir des angles aériens uniques difficilement accessibles en parapente classique.",
    ],
  },

  ru: {
    title: "Бронирование полёта",
    subtitle: "Выберите локацию, количество гостей и услуги на одном удобном экране.",
    locationsTitle: "Выбрать локацию",
    configurationTitle: "Настройка полёта",
    servicesTitle: "Услуги по локации",
    addonsTitle: "Фото / видео опции",
    selectFlightType: "Выберите тип полёта",
    flightDescriptionTitle: "Описание полёта",
    locationServices: "Услуги для этой локации",
    enterPickupAddress: "Введите адрес трансфера",
    pickupPlaceholder: "Введите адрес трансфера",
    continue: "Продолжить",
    serviceUnavailable: "Недоступно в этой локации",
    quantity: "Количество",
    pax: "чел",
    map: "Открыть Google Map",
    includedLabel: "Включено",
    notIncludedLabel: "Не включено",
    chooseLocationPrompt: "Пожалуйста, выберите локацию, чтобы увидеть детали.",
    chooseFlightTypePrompt: "Пожалуйста, выберите тип полёта, чтобы увидеть подробное описание.",
    noVisibleServices: "Для этого выбора услуги пока не отображаются.",
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
    daNangPickupNote:
      "Цена может меняться в зависимости от места трансфера и количества гостей.",
    khauPhaPkg2NoPickup:
      "Этот полёт не включает трансфер до точки старта. Гости должны прибыть в Mebayluon Clubhouse за 15 минут до регистрации.",
    hanoiFlycamNote:
      "Услуга flycam в Ханое может быть недоступна. Это подтверждается после бронирования; если услуга недоступна, стоимость flycam возвращается полностью.",
    camera360Note: "Смонтированное видео будет отправлено после полёта.",
    guestsLabel: "Количество гостей",
    groupPromoNote: "Групповая скидка применяется автоматически при соблюдении условий.",
    groupDiscountTitle: "Прямая скидка при групповом бронировании",
    groupTierRow: (min) => `Группа от ${min} человек`,
    selectedLocationLabel: "Выбранная локация",
    flightTypeHint: "Тип полёта",
    paraglidingTitle: "Параплан без мотора",
    paramotorTitle: "Парамотор",
    paraglidingDescription: [
      "Старт с вершины перевала Кхау Фа — одного из четырёх великих горных перевалов Вьетнама — на высоте 1268 м, с посадкой среди потрясающих террасных рисовых полей долины Лим Монг. Это одно из самых красивых мест для парапланеризма в мире с по-настоящему сюрреалистическим пейзажем.",
      "Немоторный параплан летит полностью за счёт естественного ветра, даря подлинное чувство свободного полёта.",
      "Гости ощущают захватывающий старт с разбега и могут любоваться золотым сезоном с высоты.",
    ],
    paramotorDescription: [
      "Моторный параплан стартует из долины Лим Монг (в Mebayluon Clubhouse) на высоте 700 м, поднимается обратно к перевалу Кхау Фа примерно до 1500 м и возвращается в точку вылета.",
      "Полёт длится 10–25 минут в зависимости от состояния гостя и открывает панорамный вид на перевал Кхау Фа и великолепные террасные рисовые поля долины Лим Монг, которые называют местом с сюрреалистической красотой.",
      "Благодаря мотору полёт меньше зависит от ветра, позволяет легче набирать высоту и продлевать время в воздухе, открывая уникальные ракурсы, недоступные обычному параплану.",
    ],
  },

  hi: {
    title: "फ्लाइट बुक करें",
    subtitle: "लोकेशन, यात्रियों की संख्या और सेवाएँ एक ही स्क्रीन पर जल्दी और आसानी से चुनें।",
    locationsTitle: "लोकेशन चुनें",
    configurationTitle: "फ्लाइट कॉन्फ़िगरेशन",
    servicesTitle: "लोकेशन सेवाएँ",
    addonsTitle: "फोटो / वीडियो एक्स्ट्रा",
    selectFlightType: "फ्लाइट प्रकार चुनें",
    flightDescriptionTitle: "फ्लाइट विवरण",
    locationServices: "लोकेशन के अनुसार सेवाएँ",
    enterPickupAddress: "पिकअप पता दर्ज करें",
    pickupPlaceholder: "पिकअप पता दर्ज करें",
    continue: "आगे बढ़ें",
    serviceUnavailable: "इस लोकेशन पर उपलब्ध नहीं",
    quantity: "मात्रा",
    pax: "यात्री",
    map: "Google Map देखें",
    includedLabel: "शामिल",
    notIncludedLabel: "शामिल नहीं",
    chooseLocationPrompt: "कृपया विवरण देखने के लिए लोकेशन चुनें।",
    chooseFlightTypePrompt: "कृपया विस्तृत विवरण देखने के लिए फ्लाइट प्रकार चुनें।",
    noVisibleServices: "इस चयन के लिए अभी कोई सेवा उपलब्ध नहीं है।",
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
    daNangPickupNote:
      "पिकअप स्थान और यात्रियों की संख्या के अनुसार मूल्य बदल सकता है।",
    khauPhaPkg2NoPickup:
      "इस फ्लाइट में टेकऑफ पॉइंट तक ट्रांसफर शामिल नहीं है। मेहमानों को चेक-इन से 15 मिनट पहले Mebayluon Clubhouse पहुँचना होगा।",
    hanoiFlycamNote:
      "हनोई में फ्लाईकैम सेवा हमेशा उपलब्ध नहीं हो सकती। यह बुकिंग के बाद कन्फर्म होगी; यदि उपलब्ध नहीं हुई, तो फ्लाईकैम शुल्क पूरी तरह वापस किया जाएगा।",
    camera360Note: "एडिट किया गया वीडियो उड़ान के बाद भेजा जाएगा।",
    guestsLabel: "यात्रियों की संख्या",
    groupPromoNote: "योग्य होने पर समूह छूट स्वतः लागू होगी।",
    groupDiscountTitle: "समूह बुकिंग पर सीधी छूट",
    groupTierRow: (min) => `${min} या अधिक यात्रियों का समूह`,
    selectedLocationLabel: "चयनित लोकेशन",
    flightTypeHint: "फ्लाइट प्रकार",
    paraglidingTitle: "बिना इंजन पैराग्लाइडिंग",
    paramotorTitle: "मोटरयुक्त पैराग्लाइडिंग",
    paraglidingDescription: [
      "खाउ फा दर्रे की चोटी से उड़ान भरें — जो वियतनाम के चार महान पर्वतीय दर्रों में से एक है — 1,268 मीटर की ऊँचाई से, और लिम मोंग घाटी के अद्भुत सीढ़ीदार धान के खेतों के बीच उतरें। इसे दुनिया के सबसे खूबसूरत पैराग्लाइडिंग स्थलों में से एक माना जाता है।",
      "बिना इंजन वाली पैराग्लाइडिंग पूरी तरह प्राकृतिक हवा पर उड़ती है और सच्ची मुक्त उड़ान का अनुभव देती है।",
      "मेहमान अपने पैरों से टेकऑफ करने का रोमांच महसूस कर सकते हैं और ऊपर से सुनहरे मौसम का नज़ारा देख सकते हैं।",
    ],
    paramotorDescription: [
      "मोटरयुक्त पैराग्लाइडिंग लिम मोंग घाटी (Mebayluon Clubhouse) से 700 मीटर ऊँचाई पर उड़ान भरती है, फिर लगभग 1,500 मीटर ऊँचे खाउ फा दर्रे की ओर ऊपर जाती है और वापस शुरुआती बिंदु पर लौटती है।",
      "यह उड़ान लगभग 10–25 मिनट तक चलती है और मेहमानों को खाउ फा दर्रे तथा लिम मोंग घाटी के सुंदर सीढ़ीदार धान के खेतों का व्यापक दृश्य दिखाती है।",
      "इंजन होने के कारण यह उड़ान हवा पर कम निर्भर रहती है, आसानी से ऊँचाई प्राप्त करती है और अधिक समय तक उड़ सकती है, जिससे आपको अनोखे हवाई दृश्य देखने को मिलते हैं।",
    ],
  },

  zh: {
    title: "预订飞行",
    subtitle: "在同一屏幕上快速选择飞行地点、人数和服务，减少来回操作。",
    locationsTitle: "选择飞行地点",
    configurationTitle: "飞行配置",
    servicesTitle: "地点服务",
    addonsTitle: "拍摄附加服务",
    selectFlightType: "选择飞行类型",
    flightDescriptionTitle: "飞行说明",
    locationServices: "按飞行地点提供的服务",
    enterPickupAddress: "填写接送地址",
    pickupPlaceholder: "填写接送地址",
    continue: "继续",
    serviceUnavailable: "该飞行地点不可用",
    quantity: "数量",
    pax: "人",
    map: "查看 Google Map",
    includedLabel: "包含内容",
    notIncludedLabel: "不包含",
    chooseLocationPrompt: "请选择飞行地点以查看详情。",
    chooseFlightTypePrompt: "请选择飞行类型以查看详细说明。",
    noVisibleServices: "该选择下暂时没有可显示的服务。",
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
    daNangPickupNote:
      "价格可能会根据接送地点和人数变化。",
    khauPhaPkg2NoPickup:
      "该飞行不包含前往起飞点的接送服务。客人需在登记前 15 分钟到达 Mebayluon Clubhouse。",
    hanoiFlycamNote:
      "河内的 Flycam 服务可能并非一直可用。需在预订后确认；如果无法提供，将全额退还 Flycam 费用。",
    camera360Note: "剪辑后的视频将在飞行结束后发送。",
    guestsLabel: "人数",
    groupPromoNote: "符合条件时，团队优惠将自动生效。",
    groupDiscountTitle: "团体预订直接优惠",
    groupTierRow: (min) => `${min}人及以上团体`,
    selectedLocationLabel: "已选飞行地点",
    flightTypeHint: "飞行类型",
    paraglidingTitle: "无动力滑翔伞",
    paramotorTitle: "动力滑翔伞",
    paraglidingDescription: [
      "从 Khau Pha 山口山顶起飞——这里是越南四大顶级山口之一——起飞海拔 1,268 米，降落在风景绝美的 Lim Mong 山谷梯田之间。这里被认为是世界上最美的滑翔伞飞行点之一，拥有超现实般的景观。",
      "无动力滑翔伞完全依靠自然风力飞行，带来真正自由飞翔的体验。",
      "游客可以亲身体验用双脚起飞的刺激，并从空中尽览金色稻田季节的壮丽景色。",
    ],
    paramotorDescription: [
      "动力滑翔伞从 Lim Mong 山谷（Mebayluon Clubhouse）海拔 700 米处起飞，逆飞上升至约 1,500 米高的 Khau Pha 山口，然后返回起飞点。",
      "飞行时长约 10–25 分钟，视客人体力情况而定，可俯瞰 Khau Pha 山口以及 Lim Mong 山谷壮观的梯田全景，这里常被评价为拥有“超现实之美”。",
      "由于配有发动机，这种飞行方式对风的依赖更小，更容易爬升并延长飞行时间，让你探索普通滑翔伞较难到达的独特视角。",
    ],
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

  const khauPhaUiOptions = useMemo(() => {
    if (selected !== "khau_pha" || !selectedCfg?.packages?.length) return [];

    const pkg1 = selectedCfg.packages.find((p) => p.key === "khau_pha_pkg_1");
    const pkg2 = selectedCfg.packages.find((p) => p.key === "khau_pha_pkg_2");

    const option1 =
      pkg1 && pkg1.flightTypes?.[0]
        ? {
            uiKey: "paragliding" as const,
            packageKey: pkg1.key as PackageKey,
            flightTypeKey: pkg1.flightTypes[0].key as FlightTypeKey,
            label: ui.paraglidingTitle,
            priceText: getHolidayAwarePriceText(
              lang,
              pkg1.flightTypes[0].weekday,
              pkg1.flightTypes[0].weekend,
              pkg1.flightTypes[0].holiday,
              pkg1.flightTypes[0].fixed
            ),
            description: ui.paraglidingDescription,
          }
        : null;

    const option2 =
      pkg2 && pkg2.flightTypes?.[0]
        ? {
            uiKey: "paramotor" as const,
            packageKey: pkg2.key as PackageKey,
            flightTypeKey: pkg2.flightTypes[0].key as FlightTypeKey,
            label: ui.paramotorTitle,
            priceText: getHolidayAwarePriceText(
              lang,
              pkg2.flightTypes[0].weekday,
              pkg2.flightTypes[0].weekend,
              pkg2.flightTypes[0].holiday,
              pkg2.flightTypes[0].fixed
            ),
            description: ui.paramotorDescription,
          }
        : null;

    return [option1, option2].filter(Boolean) as Array<{
      uiKey: "paragliding" | "paramotor";
      packageKey: PackageKey;
      flightTypeKey: FlightTypeKey;
      label: string;
      priceText: string;
      description: string[];
    }>;
  }, [selected, selectedCfg, lang, ui]);

  const selectedKhauPhaOption = useMemo(() => {
    if (selected !== "khau_pha") return null;
    return (
      khauPhaUiOptions.find(
        (opt) =>
          opt.packageKey === data.packageKey &&
          opt.flightTypeKey === data.flightTypeKey
      ) ||
      khauPhaUiOptions.find((opt) => opt.packageKey === data.packageKey) ||
      null
    );
  }, [selected, khauPhaUiOptions, data.packageKey, data.flightTypeKey]);

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

  const handleSelectKhauPhaFlight = (option: {
    packageKey: PackageKey;
    flightTypeKey: FlightTypeKey;
  }) => {
    update({
      packageKey: option.packageKey,
      flightTypeKey: option.flightTypeKey,
      services: {},
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
      (svc.key === "khau_pha_pkg_1_garrya_pickup" ||
        svc.key === "khau_pha_pkg_2_garrya_pickup") &&
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
    <div className="space-y-5 text-white">
      <div className="rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent px-4 py-4 md:px-6">
          <h3 className="text-lg md:text-xl font-semibold">{ui.title}</h3>
          <p className="mt-1 text-sm text-white/80 max-w-3xl">{ui.subtitle}</p>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                  {ui.locationsTitle}
                </div>
                {selectedCfg ? (
                  <div className="mt-1 text-sm text-white/70">
                    {ui.selectedLocationLabel}:{" "}
                    <span className="font-semibold text-white">
                      {selectedCfg.name[lang] ?? selectedCfg.name.vi}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 xl:gap-3">
              {Object.values(LOCATIONS).map((loc) => (
                <FlightCard
                  key={loc.key}
                  location={loc.key as LocationKey}
                  selected={selected === loc.key}
                  onSelect={handleSelectLocation}
                  dateISO={data.dateISO}
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.55fr] gap-6 xl:gap-8 items-start">
            <section className="space-y-5">
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 md:p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                  {ui.configurationTitle}
                </div>

                {!selectedCfg ? (
                  <p className="mt-4 text-sm text-white/70 italic">
                    {messages.selectLocationToSeeDetail || ui.chooseLocationPrompt}
                  </p>
                ) : (
                  <div className="mt-4 space-y-5">
                    <div>
                      <h4 className="text-lg font-semibold">
                        {selectedCfg.name[lang] ?? selectedCfg.name.vi}
                      </h4>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedCfg.included[lang] ?? selectedCfg.included.vi).map(
                          (it, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs text-white/85"
                            >
                              {it}
                            </span>
                          )
                        )}
                      </div>

                      {selectedCfg.excluded &&
                      (selectedCfg.excluded[lang] ?? selectedCfg.excluded.vi)?.length >
                        0 ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                            {ui.notIncludedLabel}
                          </div>
                          <div className="mt-2 text-sm text-white/80">
                            {(selectedCfg.excluded[lang] ?? selectedCfg.excluded.vi).join(
                              ", "
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                        <label className="block text-sm font-medium text-white/90">
                          {labels.guestsCount || ui.guestsLabel}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={guestInput}
                          onChange={handleGuestInputChange}
                          onBlur={handleGuestInputBlur}
                          className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none focus:border-sky-300"
                        />
                      </div>

                      <details className="rounded-2xl border border-white/12 bg-white/8 p-4 text-sm text-white/85 group">
                        <summary className="flex cursor-pointer items-center gap-2 font-semibold select-none list-none [&::-webkit-details-marker]:hidden">
                          <span className="inline-block h-3 w-3 rounded-sm bg-orange-400 shrink-0" />
                          <span className="flex-1">{ui.groupDiscountTitle}</span>
                          <svg
                            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </summary>
                        <div className="mt-3 space-y-2 text-white/75">
                          {[
                            { min: 2, vnd: 50_000, usd: 2 },
                            { min: 3, vnd: 70_000, usd: 3 },
                            { min: 4, vnd: 100_000, usd: 4 },
                            { min: 6, vnd: 150_000, usd: 6 },
                          ].map((tier) => (
                            <div
                              key={tier.min}
                              className="flex items-center justify-between gap-4"
                            >
                              <span>{ui.groupTierRow(tier.min, "")}</span>
                              <span className="font-medium text-white/90 whitespace-nowrap">
                                -{formatByLang(lang, tier.vnd, tier.usd)}/
                                {lang === "vi" ? "người" : "pax"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>

                    {selected === "khau_pha" && khauPhaUiOptions.length ? (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-white">
                          {ui.selectFlightType}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {khauPhaUiOptions.map((option) => {
                            const active =
                              data.packageKey === option.packageKey &&
                              data.flightTypeKey === option.flightTypeKey;

                            return (
                              <button
                                key={`${option.packageKey}-${option.flightTypeKey}`}
                                type="button"
                                onClick={() => handleSelectKhauPhaFlight(option)}
                                className={`rounded-2xl border p-4 text-left transition ${
                                  active
                                    ? "border-sky-300/60 bg-sky-400/14 shadow-[0_10px_25px_rgba(56,189,248,0.18)]"
                                    : "border-white/12 bg-white/8 hover:bg-white/12"
                                }`}
                              >
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                                  {ui.flightTypeHint}
                                </div>
                                <div className="mt-1 text-base font-semibold text-white">
                                  {option.label}
                                </div>
                                <div className="mt-2 text-sm text-white/75">
                                  {option.priceText}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="rounded-2xl border border-white/12 bg-white/8 p-4 md:p-5">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                            {ui.flightDescriptionTitle}
                          </div>

                          {!selectedKhauPhaOption ? (
                            <p className="mt-3 text-sm text-white/70 italic">
                              {ui.chooseFlightTypePrompt}
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <h5 className="text-base font-semibold text-white">
                                {selectedKhauPhaOption.label}
                              </h5>

                              <div className="space-y-3 text-sm leading-7 text-white/80">
                                {selectedKhauPhaOption.description.map((paragraph, index) => (
                                  <p key={index}>{paragraph}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {selected !== "khau_pha" && selectedPackage ? (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-white">
                          {ui.selectFlightType}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                onClick={() => setFlightTypeKey(ft.key)}
                                className={`rounded-2xl border p-4 text-left transition ${
                                  active
                                    ? "border-sky-300/60 bg-sky-400/14 shadow-[0_10px_25px_rgba(56,189,248,0.18)]"
                                    : "border-white/12 bg-white/8 hover:bg-white/12"
                                }`}
                              >
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                                  {ui.flightTypeHint}
                                </div>
                                <div className="mt-1 text-base font-semibold text-white">
                                  {ft.label[lang] ?? ft.label.vi}
                                </div>
                                <div className="mt-2 text-sm text-white/75">
                                  {displayText}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {selectedCfg?.services?.length ? (
                <div className="rounded-2xl border border-white/15 bg-black/20 p-4 md:p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                    {ui.servicesTitle}
                  </div>

                  <div className="mt-4">
                    {visibleServices.length === 0 ? (
                      <p className="text-sm text-white/70 italic">
                        {selected === "khau_pha"
                          ? ui.chooseFlightTypePrompt
                          : ui.noVisibleServices}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleServices.map((svc) => {
                          const active = getServiceSelected(svc.key);
                          const priceVND = svc.priceVND ?? 0;
                          const priceUSD =
                            svc.priceUSD ??
                            (priceVND ? Math.round(priceVND / 25000) : 0);

                          return (
                            <div
                              key={svc.key}
                              className={`rounded-2xl border p-4 transition ${
                                active
                                  ? "border-sky-300/60 bg-sky-400/12 shadow-[0_10px_25px_rgba(56,189,248,0.16)]"
                                  : "border-white/12 bg-white/8"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleService(svc)}
                                className="w-full text-left"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                                        active
                                          ? "border-sky-300/70 bg-sky-300/90 text-slate-950"
                                          : "border-white/25 bg-white/8"
                                      }`}
                                    >
                                      {active ? <span className="text-sm">✓</span> : null}
                                    </span>

                                    <div>
                                      <div className="font-medium text-white">
                                        {svc.label[lang] ?? svc.label.vi}
                                      </div>
                                      {(svc.description?.[lang] ??
                                        svc.description?.vi) ? (
                                        <div className="mt-1 text-xs text-white/65">
                                          {svc.description?.[lang] ??
                                            svc.description?.vi}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  {!!priceVND && (
                                    <div className="text-right text-sm font-semibold text-white whitespace-nowrap">
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
                                <div className="mt-3">
                                  <a
                                    href={svc.fixedMapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-10 items-center rounded-full border border-sky-300/40 bg-sky-400/10 px-4 text-sm font-medium text-sky-200 hover:bg-sky-400/20"
                                  >
                                    {ui.map}
                                  </a>
                                </div>
                              ) : null}

                              {svc.requiresPickupInput && active && !svc.fixedMapUrl ? (
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-white/90">
                                    {ui.enterPickupAddress}
                                  </label>
                                  <input
                                    type="text"
                                    value={getServiceInput(svc.key)}
                                    onChange={(e) =>
                                      setServiceInput(svc.key, e.target.value)
                                    }
                                    placeholder={ui.pickupPlaceholder}
                                    className="mt-2 h-12 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-white outline-none placeholder:text-white/45 focus:border-sky-300"
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
                      <p className="mt-4 text-sm text-amber-200 italic">
                        {ui.khauPhaPkg2NoPickup}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-5">
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 md:p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                  {ui.addonsTitle}
                </div>

                {!selectedCfg ? (
                  <p className="mt-4 text-sm text-white/70 italic">
                    {labels.addonsPromptSelectLocation || ui.chooseLocationPrompt}
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {ADDON_KEYS.map((key) => {
                      const conf = selectedCfg.addons[key];
                      const disabled =
                        conf.pricePerPersonVND === null &&
                        conf.pricePerPersonUSD === null;

                      const qty = data.addonsQty?.[key] ?? 0;
                      const active = qty > 0;

                      const priceText =
                        conf.pricePerPersonVND == null &&
                        conf.pricePerPersonUSD == null
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
                            setAddonQty(key, active ? 0 : 1);
                          }}
                          className={`rounded-2xl border p-4 transition ${
                            active
                              ? "border-sky-300/60 bg-sky-400/12 shadow-[0_10px_25px_rgba(56,189,248,0.16)]"
                              : "border-white/12 bg-white/8"
                          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                                  active
                                    ? "border-sky-300/70 bg-sky-300/90 text-slate-950"
                                    : "border-white/25 bg-white/8"
                                }`}
                              >
                                {active ? <span className="text-sm">✓</span> : null}
                              </span>

                              <div>
                                <div className="font-medium text-white">
                                  {conf.label[lang] ?? conf.label.vi}
                                </div>

                                {priceText ? (
                                  <p className="mt-1 text-sm text-white/70">
                                    {priceText} / {ui.pax}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-xs text-white/55 italic">
                                    {ui.serviceUnavailable}
                                  </p>
                                )}
                              </div>
                            </div>

                            {!disabled && (
                              <span className="text-xs text-white/60">
                                {active ? `${qty}/${maxQty}` : ""}
                              </span>
                            )}
                          </div>

                          {!disabled && active ? (
                            <div
                              className="mt-4 flex items-center justify-between rounded-2xl border border-white/12 bg-black/18 px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-sm text-white/80">
                                {ui.quantity}
                              </span>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setAddonQty(key, qty - 1)}
                                  disabled={qty <= 0}
                                  className="h-8 w-8 rounded-full border border-white/20 bg-white/8 disabled:opacity-40"
                                >
                                  −
                                </button>

                                <span className="min-w-6 text-center font-semibold">
                                  {qty}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddonQty(key, clampInt(qty + 1, 0, maxQty))
                                  }
                                  disabled={qty >= maxQty}
                                  className="h-8 w-8 rounded-full border border-white/20 bg-white/8 disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {key === "flycam" && selected === "ha_noi" ? (
                            <p className="mt-3 text-xs italic text-slate-300">
                              {ui.hanoiFlycamNote}
                            </p>
                          ) : null}

                          {key === "camera360" && active ? (
                            <p className="mt-3 text-xs italic text-slate-300">
                              {ui.camera360Note}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!canGoNext}
          className="h-12 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition hover:brightness-105 disabled:opacity-50"
        >
          {buttons.next || ui.continue}
        </button>
      </div>
    </div>
  );
}