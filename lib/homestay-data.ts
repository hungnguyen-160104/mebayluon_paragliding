// ===== Types shared with page.tsx =====

export type RoomKey =
  | "singleRoom"
  | "coupleAttic"
  | "doubleRoom"
  | "dormitory"
  | "wholeHomeSmall"
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
  | "en-suite";

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
    id: "couple-attic",
    nameKey: "coupleAttic",
    price: 200000,
    priceType: "per-guest",
    capacity: { adults: 2, children: 2 },
    image: "/homestay/ap-mai.jpg",
    features: ["breakfast", "wifi", "attic-view", "handmade-tea"],
    description:
      "1 phòng áp mái lớn duy nhất, phù hợp tối đa 2 người lớn và 2 trẻ em dưới 5 tuổi.",
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
    id: "whole-home-large",
    nameKey: "wholeHomeLarge",
    price: 4500000,
    priceType: "whole-home",
    capacity: { adults: 35 },
    image: "/homestay/nguyen-can.jpg",
    features: ["exclusive-use", "all-facilities", "large-group", "breakfast"],
    description:
      "Khách được sử dụng toàn bộ phần sàn cộng đồng, phòng đôi, phòng đơn và các phòng áp mái. Ở tối đa 35 khách. Miễn phí trẻ em dưới 5 tuổi.",
  },
];

export interface MenuItemEntry {
  name: string;
  price: number;
  unit?: string;
}

export interface MenuItem {
  category: CategoryKey;
  items: MenuItemEntry[];
}

export const menuItems: MenuItem[] = [
  {
    category: "drinks",
    items: [
      { name: "Cà phê", price: 35000 },
      { name: "Trà", price: 30000 },
      { name: "Nước chanh", price: 25000 },
      { name: "Sinh tố", price: 40000 },
      { name: "Bia", price: 20000 },
      { name: "Nước ngọt", price: 15000 },
    ],
  },
  {
    category: "alcohol",
    items: [
      { name: "Rượu cắm", price: 100000, unit: "lít" },
      { name: "Cẩm tú lệ", price: 80000, unit: "lít" },
      { name: "Rượu mơ", price: 120000, unit: "lít" },
    ],
  },
  {
    category: "food",
    items: [
      { name: "Cơm / mì tôm", price: 0 },
      { name: "Bò / gà / lợn", price: 0 },
      { name: "Cá hồi tươi sống", price: 0 },
      { name: "Cá tầm tươi sống", price: 0 },
      { name: "Các món lẩu / BBQ", price: 0 },
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
  address: "Bản Lim Mông, xã Cao Phạ, huyện Mù Cang Chải, tỉnh Yên Bái",
  distanceFromHanoi: "250km",
  travelTime: "5 giờ",
  phone: "+84964073555",
  nearbyAttractions: [
    { name: "Đèo Khau Phạ", distance: "40km" },
    { name: "Suối khoáng nóng", distance: "7 phút đi xe" },
    { name: "Ruộng bậc thang Mù Cang Chải", distance: "Ngay tại chỗ" },
  ],
} as const;

// ===== i18n cho phần Location =====
export const locationTranslations = {
  vi: {
    title: "Vị trí & Trải nghiệm",
    description:
      "Ngay tại điểm hạ cánh dù lượn – trung tâm hoạt động của các phi công chuyên nghiệp. Du khách có thể tương tác cùng cộng đồng bay và ngắm nhìn những cánh dù rực rỡ trên bầu trời.",
    addressLabel: "Địa chỉ",
    fromHanoi: "Từ Hà Nội",
    nearby: "Các điểm gần đó",
    nearbyList: [
      "Đèo Khau Phạ – 40km",
      "Suối khoáng nóng – 7 phút đi xe",
      "Ruộng bậc thang Mù Cang Chải – Ngay tại chỗ",
    ],
  },
  en: {
    title: "Location & Experience",
    description:
      "Right at the paragliding landing area – the center of professional pilot activities. Guests can interact with the flying community and admire colorful paragliders in the sky.",
    addressLabel: "Address",
    fromHanoi: "From Hanoi",
    nearby: "Nearby attractions",
    nearbyList: [
      "Khau Pha Pass – 40km",
      "Hot spring – 7 minutes by car",
      "Mu Cang Chai Rice Terraces – On site",
    ],
  },
  fr: {
    title: "Emplacement & Expérience",
    description:
      "Situé directement sur la zone d’atterrissage du parapente, au cœur des activités des pilotes professionnels. Les visiteurs peuvent rencontrer la communauté aérienne et admirer les parapentes colorés dans le ciel.",
    addressLabel: "Adresse",
    fromHanoi: "Depuis Hanoï",
    nearby: "Attractions à proximité",
    nearbyList: [
      "Col de Khau Pha – 40 km",
      "Source chaude – 7 minutes en voiture",
      "Rizières en terrasses de Mu Cang Chai – Sur place",
    ],
  },
  ru: {
    title: "Местоположение и впечатления",
    description:
      "Прямо у зоны приземления парапланов — в центре активности профессиональных пилотов. Гости могут пообщаться с лётным сообществом и любоваться яркими парапланами в небе.",
    addressLabel: "Адрес",
    fromHanoi: "Из Ханоя",
    nearby: "Ближайшие места",
    nearbyList: [
      "Перевал Кхау Фа — 40 км",
      "Горячий источник — 7 минут на машине",
      "Рисовые террасы Му Канг Чай — На месте",
    ],
  },
  zh: {
    title: "位置与体验",
    description:
      "这里正位于滑翔伞降落点，是专业飞行员活动的中心。游客可以与飞行社群互动，并欣赏天空中绚丽多彩的滑翔伞。",
    addressLabel: "地址",
    fromHanoi: "从河内出发",
    nearby: "附近景点",
    nearbyList: [
      "考帕山口 — 40km",
      "温泉 — 约 7 分钟车程",
      "木仓寨梯田 — 就在此地",
    ],
  },
  hi: {
    title: "स्थान और अनुभव",
    description:
      "यह ठीक पैराग्लाइडिंग लैंडिंग स्थल पर स्थित है — पेशेवर पायलट गतिविधियों का केंद्र। मेहमान उड़ान समुदाय से जुड़ सकते हैं और आसमान में रंग-बिरंगे पैराग्लाइडर देख सकते हैं।",
    addressLabel: "पता",
    fromHanoi: "हनोई से",
    nearby: "नज़दीकी स्थान",
    nearbyList: [
      "खाउ फ़ा पास — 40km",
      "हॉट स्प्रिंग — कार से लगभग 7 मिनट",
      "मु कांग चाई की सीढ़ीनुमा धान की खेती — यहीं",
    ],
  },
} as const;