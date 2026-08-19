// ===== Types shared with page.tsx =====

export type RoomKey =
  | "singleRoom"
  | "coupleAtticSingle"
  | "coupleAtticDouble"
  | "doubleRoom"
  | "dormitory"
  | "wholeHomeSmall"
  | "wholeFloor"
  | "wholeHomeLarge";

export type RoomFeatureKey =
  | "breakfast"
  | "wifi"
  | "view"
  | "handmade-tea"
  | "attic-view"
  | "mountain-view"
  | "family-friendly"
  | "shared-space"
  | "budget-friendly"
  | "exclusive-use"
  | "all-facilities"
  | "group-friendly"
  | "large-group"
  | "en-suite"
  // Lựa chọn của gói NGUYÊN SÀN / NGUYÊN NHÀ SÀN
  | "big-family"
  | "company"
  | "karaoke"
  | "campfire-camp"
  | "teambuilding"
  | "view-both"
  | "free-pool";

export type AmenityKey =
  | "free-handmade-tea"
  | "free-parking"
  | "free-wifi"
  | "shared-bathroom"
  | "bbq-area"
  | "campfire"
  | "karaoke"
  | "swimming-pool"
  | "camping-area"
  | "team-building-space"
  | "paragliding"
  | "flycam-service";

export type CategoryKey = "drinks" | "alcohol" | "food";

export type PriceType = "per-guest" | "per-room" | "whole-home";

export interface RoomType {
  id: string;
  nameKey: RoomKey;
  price: number;
  priceType: PriceType;
  capacity: {
    adults: number;
    children?: number;
  };
  image: string;
  features: RoomFeatureKey[];
  description: string;
}

export const roomTypes: RoomType[] = [
  {
    id: "single-room",
    nameKey: "singleRoom",
    price: 350000,
    priceType: "per-guest",
    capacity: { adults: 1, children: 1 },
    image: "/homestay/phong-don.jpg",
    features: ["breakfast", "wifi", "view", "handmade-tea"],
    description:
      "Có 2 phòng, phù hợp tối đa 1 người lớn và 1 trẻ em dưới 5 tuổi, gồm 1 đệm đơn.",
  },
  {
    id: "couple-attic-single",
    nameKey: "coupleAtticSingle",
    price: 200000,
    priceType: "per-guest",
    capacity: { adults: 1, children: 1 },
    image: "/homestay/ap-mai.jpg",
    features: ["breakfast", "wifi", "attic-view", "handmade-tea"],
    description:
      "Có 3 phòng áp mái đơn, mỗi phòng ở tối đa 1 người lớn hoặc 1 người lớn và 1 trẻ em dưới 5 tuổi.",
  },
  {
    id: "couple-attic-double",
    nameKey: "coupleAtticDouble",
    price: 200000,
    priceType: "per-guest",
    capacity: { adults: 2, children: 1 },
    image: "/homestay/phong-ap-mai-doi.jpg",
    features: ["breakfast", "wifi", "attic-view", "handmade-tea"],
    description:
      "1 phòng áp mái đôi duy nhất, tối đa 2 người lớn hoặc 2 người lớn và 1 trẻ em dưới 5 tuổi.",
  },
  {
    id: "double-room",
    nameKey: "doubleRoom",
    price: 650000,
    priceType: "per-room",
    capacity: { adults: 2, children: 2 },
    image: "/homestay/phong-doi.jpg",
    features: ["breakfast", "wifi", "mountain-view", "family-friendly"],
    description:
      "Có 2 phòng lớn, phù hợp cho 1 gia đình nhỏ gồm 2 người lớn và 2 trẻ em dưới 5 tuổi, 1 đệm đôi lớn, view suối.",
  },
  {
    id: "dormitory",
    nameKey: "dormitory",
    price: 180000,
    priceType: "per-guest",
    capacity: { adults: 20 },
    image: "/homestay/phong-cong-dong.jpg",
    features: ["breakfast", "wifi", "shared-space", "budget-friendly"],
    description: "1 phòng cộng đồng lớn, tối đa 20 khách với đệm đơn/sàn.",
  },
  {
    id: "whole-home-small",
    nameKey: "wholeHomeSmall",
    price: 800000,
    priceType: "per-room",
    capacity: { adults: 5 },
    image: "/homestay/phong-gia-dinh.jpg",
    features: ["en-suite", "family-friendly", "breakfast"],
    description:
      "1 phòng lớn - ở tối đa 5 người/phòng. Vệ sinh khép kín, phù hợp gia đình.",
  },
  {
    // GÓI NGUYÊN SÀN (trừ 2 phòng đôi) — sàn cộng đồng + 4 áp mái + 2 phòng đơn, cùng một cửa
    id: "whole-floor",
    nameKey: "wholeFloor",
    price: 3600000,
    priceType: "whole-home",
    capacity: { adults: 30 },
    image: "/homestay/nguyen-san.png",
    features: ["big-family", "company", "karaoke", "campfire-camp", "teambuilding", "view-both", "free-pool"],
    description:
      "Toàn bộ phần sàn cộng đồng, 4 áp mái, 2 phòng đơn (cùng cửa). Ở tối đa 30 người · khuyến cáo 24 người (gồm trẻ em).",
  },
  {
    id: "whole-home-large",
    nameKey: "wholeHomeLarge",
    price: 4500000,
    priceType: "whole-home",
    capacity: { adults: 36 },
    image: "/homestay/nguyen-can.jpg",
    features: ["big-family", "company", "karaoke", "campfire-camp", "teambuilding", "view-both", "free-pool"],
    description:
      "Toàn bộ phần sàn cộng đồng, phòng đôi, đơn, các phòng áp mái. Ở tối đa 36 khách · khuyến cáo 30 người (gồm trẻ em).",
  },
];

/** Các ngôn ngữ của website — dùng cho tên món & đơn vị trong menu. */
export type HomestayLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export interface MenuItemEntry {
  /** Tên món theo từng ngôn ngữ (vi là bản gốc). */
  name: Record<HomestayLang, string>;
  price: number;
  /** Đơn vị tính theo từng ngôn ngữ (nếu có). */
  unit?: Record<HomestayLang, string>;
}

/** Đơn vị dùng chung cho menu. */
const UNIT_LITER: Record<HomestayLang, string> = {
  vi: "lít",
  en: "liter",
  fr: "litre",
  ru: "литр",
  zh: "升",
  hi: "लीटर",
};

const UNIT_KG: Record<HomestayLang, string> = {
  vi: "kg",
  en: "kg",
  fr: "kg",
  ru: "кг",
  zh: "公斤",
  hi: "किग्रा",
};

export interface MenuItem {
  category: CategoryKey;
  items: MenuItemEntry[];
}

export const menuItems: MenuItem[] = [
  {
    category: "drinks",
    items: [
      {
        name: { vi: "Cà phê", en: "Coffee", fr: "Café", ru: "Кофе", zh: "咖啡", hi: "कॉफ़ी" },
        price: 35000,
      },
      {
        name: { vi: "Trà", en: "Tea", fr: "Thé", ru: "Чай", zh: "茶", hi: "चाय" },
        price: 30000,
      },
      {
        name: { vi: "Nước chanh", en: "Lemonade", fr: "Citronnade", ru: "Лимонад", zh: "柠檬水", hi: "नींबू पानी" },
        price: 25000,
      },
      {
        name: { vi: "Sinh tố", en: "Smoothie", fr: "Smoothie", ru: "Смузи", zh: "果昔", hi: "स्मूदी" },
        price: 40000,
      },
      {
        name: { vi: "Bia", en: "Beer", fr: "Bière", ru: "Пиво", zh: "啤酒", hi: "बीयर" },
        price: 20000,
      },
      {
        name: { vi: "Nước ngọt", en: "Soft drink", fr: "Boisson gazeuse", ru: "Газированный напиток", zh: "汽水", hi: "सॉफ़्ट ड्रिंक" },
        price: 15000,
      },
    ],
  },
  {
    category: "alcohol",
    items: [
      {
        name: {
          vi: "Rượu cốm",
          en: "Young rice (cốm) wine",
          fr: "Alcool de riz vert (cốm)",
          ru: "Вино из молодого риса (ком)",
          zh: "青扁米酒",
          hi: "कोम (हरे चावल) वाइन",
        },
        price: 100000,
        unit: UNIT_LITER,
      },
      {
        name: {
          vi: "Cốm tú lệ",
          en: "Tú Lệ green young rice (cốm)",
          fr: "Riz vert de Tú Lệ (cốm)",
          ru: "Зелёный молодой рис Ту Ле (ком)",
          zh: "Tú Lệ 青扁米",
          hi: "तू ले का हरा चावल (कोम)",
        },
        price: 150000,
        unit: UNIT_KG,
      },
      {
        name: {
          vi: "Rượu mơ",
          en: "Apricot wine",
          fr: "Alcool d'abricot",
          ru: "Абрикосовое вино",
          zh: "杏子酒",
          hi: "खुबानी वाइन",
        },
        price: 120000,
        unit: UNIT_LITER,
      },
    ],
  },
  {
    category: "food",
    items: [
      {
        name: {
          vi: "Cơm / mì tôm",
          en: "Rice / instant noodles",
          fr: "Riz / nouilles instantanées",
          ru: "Рис / лапша быстрого приготовления",
          zh: "米饭 / 方便面",
          hi: "चावल / इंस्टेंट नूडल्स",
        },
        price: 0,
      },
      {
        name: {
          vi: "Bò / gà / lợn",
          en: "Beef / chicken / pork",
          fr: "Bœuf / poulet / porc",
          ru: "Говядина / курица / свинина",
          zh: "牛肉 / 鸡肉 / 猪肉",
          hi: "बीफ़ / चिकन / पोर्क",
        },
        price: 0,
      },
      {
        name: {
          vi: "Cá hồi tươi sống",
          en: "Fresh live salmon",
          fr: "Saumon frais",
          ru: "Свежий лосось",
          zh: "新鲜三文鱼",
          hi: "ताज़ा सैल्मन",
        },
        price: 0,
      },
      {
        name: {
          vi: "Cá tầm tươi sống",
          en: "Fresh live sturgeon",
          fr: "Esturgeon frais",
          ru: "Свежий осётр",
          zh: "新鲜鲟鱼",
          hi: "ताज़ा स्टर्जन",
        },
        price: 0,
      },
      {
        name: {
          vi: "Các món lẩu / BBQ",
          en: "Hotpot / BBQ dishes",
          fr: "Fondue vietnamienne (lẩu) / BBQ",
          ru: "Хот-пот / барбекю",
          zh: "火锅 / 烧烤",
          hi: "हॉटपॉट / बारबेक्यू",
        },
        price: 0,
      },
    ],
  },
];

export const amenities: AmenityKey[] = [
  "free-handmade-tea",
  "free-parking",
  "free-wifi",
  "shared-bathroom",
  "bbq-area",
  "campfire",
  "karaoke",
  "swimming-pool",
  "camping-area",
  "team-building-space",
  "paragliding",
  "flycam-service",
];

export const locationInfo = {
  address: "Thôn Lìm Thái, xã Tú Lệ, tỉnh Lào Cai",
  distanceFromHanoi: "250km",
  travelTime: "5 giờ",
  phone: "+84964073555",
  nearbyAttractions: [
    { name: "Suối khoáng nóng Tú Lệ", distance: "4km" },
    { name: "Le Charm resort", distance: "5km" },
    { name: "Khu trượt zipline Le Charm", distance: "5km" },
    { name: "Trại cá hồi cá tầm", distance: "8km" },
    { name: "Đèo Khau Phạ", distance: "on site" },
    { name: "Bản Lìm Mông", distance: "1km" },
  ],
} as const;

// ===== i18n cho phần Location =====
export const locationTranslations = {
  vi: {
    title: "Vị trí & Trải nghiệm",
    description:
      "Ngay tại điểm hạ cánh dù lượn – trung tâm hoạt động của các phi công chuyên nghiệp. Du khách có thể tương tác cùng cộng đồng bay và ngắm nhìn những cánh dù rực rỡ trên bầu trời.",
    addressLabel: "Địa chỉ",
    viewOnMap: "Xem trên Google Maps",
    seeUsOn: "Xem chúng tôi trên",
    bookTitle: "Liên hệ đặt phòng",
    bookNote: "Nhắn thẳng cho lễ tân, trả lời trong ngày. Đặt trực tiếp luôn được giá tốt nhất.",
    bookZalo: "Nhắn Zalo",
    bookWhatsapp: "Nhắn WhatsApp",
    bookMessenger: "Nhắn Messenger",
    bookPhone: "Gọi 0964 073 555",
    orBookOn: "Hoặc đặt qua",
    fanpage: "Fanpage Clubhouse",
    fromHanoi: "Từ Hà Nội",
    nearby: "Các điểm xung quanh",
    nearbyList: [
      "Suối khoáng nóng Tú Lệ – 4km",
      "Le Charm resort – 5km",
      "Khu trượt zipline Le Charm – 5km",
      "Trại cá hồi cá tầm – 8km",
      "Đèo Khau Phạ – Tại chỗ",
      "Bản Lìm Mông – 1km",
    ],
  },
  en: {
    title: "Location & Experience",
    description:
      "Right at the paragliding landing area – the center of professional pilot activities. Guests can interact with the flying community and admire colorful paragliders in the sky.",
    addressLabel: "Address",
    viewOnMap: "View on Google Maps",
    seeUsOn: "See us on",
    bookTitle: "Contact us to book",
    bookNote: "Message the front desk directly — same-day reply. Booking direct gets you the best rate.",
    bookZalo: "Chat on Zalo",
    bookWhatsapp: "Chat on WhatsApp",
    bookMessenger: "Chat on Messenger",
    bookPhone: "Call +84 964 073 555",
    orBookOn: "Or book on",
    fanpage: "Clubhouse fanpage",
    fromHanoi: "From Hanoi",
    nearby: "Nearby attractions",
    nearbyList: [
      "Tu Le Hot Springs – 4km",
      "Le Charm resort – 5km",
      "Le Charm zipline – 5km",
      "Salmon & sturgeon farm – 8km",
      "Khau Pha Pass – On site",
      "Lim Mong Village – 1km",
    ],
  },
  fr: {
    title: "Emplacement & Expérience",
    description:
      "Situé directement sur la zone d’atterrissage du parapente, au cœur des activités des pilotes professionnels. Les visiteurs peuvent rencontrer la communauté aérienne et admirer les parapentes colorés dans le ciel.",
    addressLabel: "Adresse",
    viewOnMap: "Voir sur Google Maps",
    seeUsOn: "Retrouvez-nous sur",
    bookTitle: "Nous contacter pour réserver",
    bookNote: "Écrivez directement à la réception — réponse le jour même. La réservation directe offre le meilleur tarif.",
    bookZalo: "Écrire sur Zalo",
    bookWhatsapp: "Écrire sur WhatsApp",
    bookMessenger: "Écrire sur Messenger",
    bookPhone: "Appeler le +84 964 073 555",
    orBookOn: "Ou réserver sur",
    fanpage: "Page Facebook du Clubhouse",
    fromHanoi: "Depuis Hanoï",
    nearby: "Attractions à proximité",
    nearbyList: [
      "Source chaude de Tu Le – 4 km",
      "Le Charm resort – 5 km",
      "Tyrolienne Le Charm – 5 km",
      "Ferme de saumons et d’esturgeons – 8 km",
      "Col de Khau Pha – Sur place",
      "Village de Lim Mong – 1 km",
    ],
  },
  ru: {
    title: "Местоположение и впечатления",
    description:
      "Прямо у зоны приземления парапланов — в центре активности профессиональных пилотов. Гости могут пообщаться с лётным сообществом и любоваться яркими парапланами в небе.",
    addressLabel: "Адрес",
    viewOnMap: "Смотреть на Google Картах",
    seeUsOn: "Мы на площадках",
    bookTitle: "Связаться и забронировать",
    bookNote: "Напишите прямо на стойку размещения — ответим в тот же день. Прямое бронирование выгоднее всего.",
    bookZalo: "Написать в Zalo",
    bookWhatsapp: "Написать в WhatsApp",
    bookMessenger: "Написать в Messenger",
    bookPhone: "Позвонить +84 964 073 555",
    orBookOn: "Или забронировать на",
    fanpage: "Страница Clubhouse в Facebook",
    fromHanoi: "Из Ханоя",
    nearby: "Ближайшие места",
    nearbyList: [
      "Горячие источники Ту Ле — 4 км",
      "Курорт Le Charm — 5 км",
      "Зиплайн Le Charm — 5 км",
      "Ферма лосося и осетра — 8 км",
      "Перевал Кхау Фа — На месте",
      "Деревня Лим Монг — 1 км",
    ],
  },
  zh: {
    title: "位置与体验",
    description:
      "这里正位于滑翔伞降落点，是专业飞行员活动的中心。游客可以与飞行社群互动，并欣赏天空中绚丽多彩的滑翔伞。",
    addressLabel: "地址",
    viewOnMap: "在 Google 地图上查看",
    seeUsOn: "在以下平台找到我们",
    bookTitle: "联系我们订房",
    bookNote: "直接联系前台，当天回复。直接预订价格最优。",
    bookZalo: "用 Zalo 联系",
    bookWhatsapp: "用 WhatsApp 联系",
    bookMessenger: "用 Messenger 联系",
    bookPhone: "致电 +84 964 073 555",
    orBookOn: "或通过以下平台预订",
    fanpage: "Clubhouse 官方专页",
    fromHanoi: "从河内出发",
    nearby: "附近景点",
    nearbyList: [
      "图勒温泉 — 4km",
      "Le Charm度假村 — 5km",
      "Le Charm滑索 — 5km",
      "三文鱼鲟鱼养殖场 — 8km",
      "考帕山口 — 就在此地",
      "Lim Mong 村 — 1km",
    ],
  },
  hi: {
    title: "स्थान और अनुभव",
    description:
      "यह ठीक पैराग्लाइडिंग लैंडिंग स्थल पर स्थित है — पेशेवर पायलट गतिविधियों का केंद्र। मेहमान उड़ान समुदाय से जुड़ सकते हैं और आसमान में रंग-बिरंगे पैराग्लाइडर देख सकते हैं।",
    addressLabel: "पता",
    viewOnMap: "Google Maps पर देखें",
    seeUsOn: "हमें यहाँ देखें",
    bookTitle: "बुकिंग के लिए संपर्क करें",
    bookNote: "सीधे रिसेप्शन को संदेश भेजें — उसी दिन जवाब। सीधी बुकिंग पर सबसे अच्छा दाम मिलता है।",
    bookZalo: "Zalo पर संदेश",
    bookWhatsapp: "WhatsApp पर संदेश",
    bookMessenger: "Messenger पर संदेश",
    bookPhone: "कॉल करें +84 964 073 555",
    orBookOn: "या यहाँ बुक करें",
    fanpage: "Clubhouse फ़ेसबुक पेज",
    fromHanoi: "हनोई से",
    nearby: "नज़दीकी स्थान",
    nearbyList: [
      "तू ले हॉट स्प्रिंग — 4km",
      "Le Charm रिसॉर्ट — 5km",
      "Le Charm ज़िपलाइन — 5km",
      "सैल्मन-स्टर्जन फ़ार्म — 8km",
      "खाउ फ़ा पास — यहीं",
      "Lim Mong गाँव — 1km",
    ],
  },
} as const;