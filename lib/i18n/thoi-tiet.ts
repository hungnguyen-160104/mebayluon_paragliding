// lib/i18n/thoi-tiet.ts
/**
 * Chữ nghĩa cho phần THỜI TIẾT BAY trên website khách: trang danh sách và
 * widget trong từng trang điểm bay.
 *
 * Gộp cả sáu thứ tiếng vào một tệp thay vì sáu tệp như các phần lớn: đây chỉ
 * là khoảng ba chục nhãn ngắn, tách ra thì sửa một chữ phải mở sáu tệp và rất
 * dễ quên một ngôn ngữ — lỗi đã gặp nhiều lần ở phần khác.
 */

export type ThoiTietLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type ThoiTietCopy = {
  /** Nhãn menu và tiêu đề trang. */
  navLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  intro: string[];
  /** Ba mức. */
  good: string;
  fair: string;
  bad: string;
  /** Nhãn số liệu. */
  wind: string;
  gust: string;
  rain: string;
  direction: string;
  cloud: string;
  hour: string;
  /** Đơn vị gió — m/s, đơn vị phi công dùng tại bãi. */
  windUnit: string;
  /** Xác suất mưa (%) của mô hình. */
  rainChance: string;
  /** Nguy cơ dông (%). */
  storm: string;
  /** Trần mây / mù. */
  cloudBase: string;
  /** Sức nâng (thermal). */
  thermal: string;
  /** Nhãn hàng kết luận từng giờ: bay được không. */
  canFly: string;
  /** Độ ổn định không khí. */
  stability: string;
  /** Năm mức thermal. */
  thermalLevels: { khong: string; nhe: string; vua: string; manh: string; gat: string };
  today: string;
  bestWindow: string;
  noWindow: string;
  goodHours: string;
  /** Câu dưới thẻ. */
  source: string;
  updated: string;
  loading: string;
  error: string;
  retry: string;
  seeSpot: string;
  bookNow: string;
  /** Widget trong trang điểm bay. */
  widgetTitle: string;
  widgetNote: string;
  mapToggleOpen: string;
  mapToggleClose: string;
  disclaimer: string;
};

const vi: ThoiTietCopy = {
  navLabel: "Thời tiết bay",
  pageTitle: "Thời tiết các điểm bay dù lượn",
  pageSubtitle: "Dự báo 5 ngày tới cho từng điểm bay — gió, gió giật, mưa",
  intro: [
    "Bay dù lượn phụ thuộc gần như hoàn toàn vào gió. Bảng dưới đây lấy dự báo của mô hình ECMWF (mô hình mà Windy hiển thị) cho đúng toạ độ bãi cất cánh của từng điểm bay, rồi chấm màu theo ngưỡng an toàn của bay đôi chở khách.",
    "Xanh là gió đẹp, vàng là bay được nhưng phải cân nhắc, đỏ là nên nghỉ. Dự báo chỉ để bạn chuẩn bị lịch trình — quyết định cuối cùng vẫn là của phi công tại bãi vào đúng buổi bay, vì thời tiết núi đổi rất nhanh.",
  ],
  good: "BAY TỐT",
  fair: "CÂN NHẮC",
  bad: "KHÔNG BAY",
  wind: "Gió",
  gust: "Giật",
  rain: "Mưa",
  direction: "Hướng",
  cloud: "Mây",
  hour: "Giờ",
  windUnit: "m/s",
  rainChance: "Khả năng mưa",
  storm: "Dông",
  cloudBase: "Trần mây",
  thermal: "Thermal",
  canFly: "Bay?",
  stability: "Ổn định",
  thermalLevels: { khong: "không", nhe: "nhẹ", vua: "vừa", manh: "mạnh", gat: "gắt" },
  today: "Hôm nay",
  bestWindow: "Giờ đẹp",
  noWindow: "Không có khung giờ đẹp",
  goodHours: "giờ đẹp",
  source: "Nguồn",
  updated: "Cập nhật",
  loading: "Đang lấy dự báo…",
  error: "Chưa lấy được dự báo thời tiết",
  retry: "Thử lại",
  seeSpot: "Xem điểm bay",
  bookNow: "Đặt bay",
  widgetTitle: "Thời tiết bay 5 ngày tới",
  widgetNote: "Dự báo cho đúng toạ độ bãi cất cánh",
  mapToggleOpen: "Xem bản đồ gió Windy",
  mapToggleClose: "Ẩn bản đồ gió",
  disclaimer:
    "Dự báo mang tính tham khảo. Phi công quyết định bay hay hoãn tại bãi, ưu tiên an toàn tuyệt đối; nếu hoãn do thời tiết, bạn được đổi lịch hoặc hoàn tiền.",
};

const en: ThoiTietCopy = {
  navLabel: "Flying Weather",
  pageTitle: "Paragliding weather at our flying sites",
  pageSubtitle: "5-day forecast for every site — wind, gusts, rain",
  intro: [
    "Paragliding depends almost entirely on the wind. The table below takes the ECMWF forecast (the model Windy shows) for the exact take-off coordinates of each site, then colours it against the safety limits used for tandem flights with passengers.",
    "Green means good wind, amber means flyable but think twice, red means stay on the ground. Use it to plan your trip — the final call always belongs to the pilot at the take-off on the day, because mountain weather changes fast.",
  ],
  good: "GOOD TO FLY",
  fair: "MARGINAL",
  bad: "NO FLYING",
  wind: "Wind",
  gust: "Gusts",
  rain: "Rain",
  direction: "Direction",
  cloud: "Cloud",
  hour: "Hour",
  windUnit: "m/s",
  rainChance: "Rain chance",
  storm: "Storm",
  cloudBase: "Cloud base",
  thermal: "Thermals",
  canFly: "Fly?",
  stability: "Stability",
  thermalLevels: { khong: "none", nhe: "light", vua: "moderate", manh: "strong", gat: "rough" },
  today: "Today",
  bestWindow: "Best window",
  noWindow: "No good window",
  goodHours: "good hours",
  source: "Source",
  updated: "Updated",
  loading: "Loading forecast…",
  error: "Could not load the weather forecast",
  retry: "Try again",
  seeSpot: "View site",
  bookNow: "Book a flight",
  widgetTitle: "Flying weather, next 5 days",
  widgetNote: "Forecast for the exact take-off coordinates",
  mapToggleOpen: "Open Windy wind map",
  mapToggleClose: "Hide wind map",
  disclaimer:
    "Forecasts are indicative. The pilot decides on site whether to fly, with safety first; if a flight is postponed for weather you may reschedule or get a refund.",
};

const fr: ThoiTietCopy = {
  navLabel: "Météo de vol",
  pageTitle: "Météo des sites de parapente",
  pageSubtitle: "Prévisions à 5 jours pour chaque site — vent, rafales, pluie",
  intro: [
    "Le parapente dépend presque entièrement du vent. Le tableau ci-dessous reprend les prévisions ECMWF (le modèle affiché par Windy) aux coordonnées exactes du décollage de chaque site, puis les colore selon les limites de sécurité du vol biplace avec passager.",
    "Vert : vent favorable. Orange : volable mais à réfléchir. Rouge : rester au sol. Servez-vous-en pour organiser votre voyage — la décision finale revient toujours au pilote sur le site le jour même, car la météo de montagne change vite.",
  ],
  good: "BON POUR VOLER",
  fair: "À ÉVALUER",
  bad: "VOL DÉCONSEILLÉ",
  wind: "Vent",
  gust: "Rafales",
  rain: "Pluie",
  direction: "Direction",
  cloud: "Nuages",
  hour: "Heure",
  windUnit: "m/s",
  rainChance: "Risque de pluie",
  storm: "Orage",
  cloudBase: "Base des nuages",
  thermal: "Thermiques",
  canFly: "Volable ?",
  stability: "Stabilité",
  thermalLevels: { khong: "aucun", nhe: "légers", vua: "modérés", manh: "forts", gat: "turbulents" },
  today: "Aujourd’hui",
  bestWindow: "Meilleur créneau",
  noWindow: "Aucun bon créneau",
  goodHours: "heures favorables",
  source: "Source",
  updated: "Mis à jour",
  loading: "Chargement des prévisions…",
  error: "Impossible de charger les prévisions",
  retry: "Réessayer",
  seeSpot: "Voir le site",
  bookNow: "Réserver un vol",
  widgetTitle: "Météo de vol, 5 prochains jours",
  widgetNote: "Prévisions aux coordonnées exactes du décollage",
  mapToggleOpen: "Ouvrir la carte des vents Windy",
  mapToggleClose: "Masquer la carte des vents",
  disclaimer:
    "Prévisions données à titre indicatif. Le pilote décide sur place, la sécurité avant tout ; en cas de report pour météo, vous pouvez reprogrammer ou être remboursé.",
};

const ru: ThoiTietCopy = {
  navLabel: "Погода для полётов",
  pageTitle: "Погода на наших площадках для парапланеризма",
  pageSubtitle: "Прогноз на 5 дней для каждой площадки — ветер, порывы, дождь",
  intro: [
    "Полёт на параплане почти полностью зависит от ветра. В таблице ниже — прогноз ECMWF (модель, которую показывает Windy) для точных координат старта каждой площадки, раскрашенный по пределам безопасности для тандемных полётов с пассажиром.",
    "Зелёный — хороший ветер, жёлтый — летать можно, но стоит подумать, красный — лучше остаться на земле. Используйте для планирования поездки: окончательное решение всегда за пилотом на старте в этот день, погода в горах меняется быстро.",
  ],
  good: "ХОРОШО ДЛЯ ПОЛЁТА",
  fair: "НА ГРАНИ",
  bad: "ПОЛЁТЫ ЗАКРЫТЫ",
  wind: "Ветер",
  gust: "Порывы",
  rain: "Дождь",
  direction: "Направление",
  cloud: "Облачность",
  hour: "Час",
  windUnit: "м/с",
  rainChance: "Вероятность дождя",
  storm: "Гроза",
  cloudBase: "Нижняя кромка облаков",
  thermal: "Термики",
  canFly: "Летим?",
  stability: "Устойчивость",
  thermalLevels: { khong: "нет", nhe: "слабые", vua: "умеренные", manh: "сильные", gat: "резкие" },
  today: "Сегодня",
  bestWindow: "Лучшее время",
  noWindow: "Нет подходящего окна",
  goodHours: "хороших часов",
  source: "Источник",
  updated: "Обновлено",
  loading: "Загрузка прогноза…",
  error: "Не удалось загрузить прогноз погоды",
  retry: "Повторить",
  seeSpot: "О площадке",
  bookNow: "Забронировать полёт",
  widgetTitle: "Погода для полётов, ближайшие 5 дней",
  widgetNote: "Прогноз для точных координат старта",
  mapToggleOpen: "Открыть карту ветра Windy",
  mapToggleClose: "Скрыть карту ветра",
  disclaimer:
    "Прогноз носит справочный характер. Решение принимает пилот на месте, безопасность превыше всего; при переносе из-за погоды возможен перенос даты или возврат денег.",
};

const zh: ThoiTietCopy = {
  navLabel: "飞行天气",
  pageTitle: "各滑翔伞飞行点天气",
  pageSubtitle: "各飞行点未来 5 天预报 — 风速、阵风、降雨",
  intro: [
    "滑翔伞几乎完全取决于风。下表采用 ECMWF 模式（Windy 所显示的模式）针对各飞行点起飞场的精确坐标进行预报，并按双人载客飞行的安全标准标色。",
    "绿色代表风况良好，黄色表示可飞但需谨慎，红色则建议停飞。此表供您安排行程参考——最终是否起飞，仍由当天在起飞场的飞行员决定，因为山区天气变化很快。",
  ],
  good: "适合飞行",
  fair: "需谨慎",
  bad: "不宜飞行",
  wind: "风速",
  gust: "阵风",
  rain: "降雨",
  direction: "风向",
  cloud: "云量",
  hour: "时间",
  windUnit: "米/秒",
  rainChance: "降雨概率",
  storm: "雷暴",
  cloudBase: "云底高度",
  thermal: "热气流",
  canFly: "可飞?",
  stability: "稳定度",
  thermalLevels: { khong: "无", nhe: "弱", vua: "中等", manh: "强", gat: "颠簸" },
  today: "今天",
  bestWindow: "最佳时段",
  noWindow: "无合适时段",
  goodHours: "小时适飞",
  source: "数据来源",
  updated: "更新于",
  loading: "正在获取预报…",
  error: "无法获取天气预报",
  retry: "重试",
  seeSpot: "查看飞行点",
  bookNow: "预订飞行",
  widgetTitle: "未来 5 天飞行天气",
  widgetNote: "针对起飞场精确坐标的预报",
  mapToggleOpen: "查看 Windy 风场图",
  mapToggleClose: "隐藏风场图",
  disclaimer: "预报仅供参考。是否飞行由飞行员在现场决定，安全第一；若因天气延期，可改期或退款。",
};

const hi: ThoiTietCopy = {
  navLabel: "उड़ान का मौसम",
  pageTitle: "हमारे पैराग्लाइडिंग स्थलों का मौसम",
  pageSubtitle: "हर स्थल के लिए 5 दिन का पूर्वानुमान — हवा, झोंके, वर्षा",
  intro: [
    "पैराग्लाइडिंग लगभग पूरी तरह हवा पर निर्भर है। नीचे दी गई तालिका हर स्थल के टेक-ऑफ़ की सटीक स्थिति के लिए ECMWF पूर्वानुमान (वही मॉडल जो Windy दिखाता है) लेती है, और उसे यात्री के साथ टैंडम उड़ान की सुरक्षा सीमाओं के अनुसार रंग देती है।",
    "हरा मतलब अच्छी हवा, पीला मतलब उड़ान संभव पर सोच-समझकर, लाल मतलब ज़मीन पर ही रहें। इसे यात्रा की योजना के लिए इस्तेमाल करें — अंतिम निर्णय हमेशा उस दिन टेक-ऑफ़ पर मौजूद पायलट का होता है, क्योंकि पहाड़ी मौसम तेज़ी से बदलता है।",
  ],
  good: "उड़ान के लिए अच्छा",
  fair: "सावधानी ज़रूरी",
  bad: "उड़ान नहीं",
  wind: "हवा",
  gust: "झोंके",
  rain: "वर्षा",
  direction: "दिशा",
  cloud: "बादल",
  hour: "समय",
  windUnit: "मी/से",
  rainChance: "वर्षा की संभावना",
  storm: "तूफ़ान",
  cloudBase: "बादल की ऊँचाई",
  thermal: "थर्मल",
  canFly: "उड़ान?",
  stability: "स्थिरता",
  thermalLevels: { khong: "नहीं", nhe: "हल्का", vua: "मध्यम", manh: "तेज़", gat: "झटकेदार" },
  today: "आज",
  bestWindow: "सर्वोत्तम समय",
  noWindow: "कोई अच्छा समय नहीं",
  goodHours: "अच्छे घंटे",
  source: "स्रोत",
  updated: "अद्यतन",
  loading: "पूर्वानुमान लाया जा रहा है…",
  error: "मौसम पूर्वानुमान नहीं मिल सका",
  retry: "फिर कोशिश करें",
  seeSpot: "स्थल देखें",
  bookNow: "उड़ान बुक करें",
  widgetTitle: "अगले 5 दिन का उड़ान मौसम",
  widgetNote: "टेक-ऑफ़ की सटीक स्थिति का पूर्वानुमान",
  mapToggleOpen: "Windy पवन मानचित्र देखें",
  mapToggleClose: "पवन मानचित्र छिपाएँ",
  disclaimer:
    "पूर्वानुमान केवल संकेत मात्र है। उड़ान का निर्णय पायलट मौके पर लेता है, सुरक्षा सर्वोपरि; मौसम के कारण स्थगित होने पर तिथि बदली जा सकती है या धन वापस मिलता है।",
};

const BANG: Record<ThoiTietLang, ThoiTietCopy> = { vi, en, fr, ru, zh, hi };

export function getThoiTietCopy(lang?: string): ThoiTietCopy {
  return BANG[(lang as ThoiTietLang) ?? "vi"] ?? vi;
}

/** Tên hướng gió theo từng thứ tiếng — 16 hướng, bắt đầu từ Bắc. */
const HUONG: Record<ThoiTietLang, string[]> = {
  vi: ["B", "BĐB", "ĐB", "ĐĐB", "Đ", "ĐĐN", "ĐN", "NĐN", "N", "NTN", "TN", "TTN", "T", "TTB", "TB", "BTB"],
  en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  ru: ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"],
  zh: ["北", "北北东", "东北", "东北东", "东", "东南东", "东南", "南南东", "南", "南南西", "西南", "西南西", "西", "西北西", "西北", "北北西"],
  hi: ["उ", "उउपू", "उपू", "पूउपू", "पू", "पूदपू", "दपू", "दक्षिपू", "द", "ददप", "दप", "पदप", "प", "पउप", "उप", "उउप"],
};

export function huongTheoNgonNgu(do_: number, lang?: string): string {
  const bang = HUONG[(lang as ThoiTietLang) ?? "vi"] ?? HUONG.vi;
  const h = ((do_ % 360) + 360) % 360;
  return bang[Math.round(h / 22.5) % 16];
}
