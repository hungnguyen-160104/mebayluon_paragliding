// lib/spot-meta.ts
/**
 * Tiêu đề + mô tả SEO cho trang điểm bay, dịch đủ 6 ngôn ngữ.
 *
 * Trước đây trang /spots/[slug] ghép title từ tên điểm bay tiếng Việt cứng,
 * nên cả 6 bản ngôn ngữ (7 điểm × 6 = 42 URL) dùng CHUNG một title/description
 * tiếng Việt — trong khi hreflang lại khai đủ 6 bản và canonical tự trỏ về
 * chính nó. Google được yêu cầu index 42 URL có thẻ meta y hệt nhau, còn
 * khách Nga/Trung/Pháp thì thấy tiêu đề tiếng Việt trên kết quả tìm kiếm.
 */

import type { Locale } from "@/lib/site-config";

/** Cụm từ khoá chính: "Dù lượn <địa danh>" — trùng với H1 của trang. */
const SEO_NAME: Record<string, Record<Locale, string>> = {
  "khau-pha": {
    vi: "Dù lượn Mù Cang Chải",
    en: "Mu Cang Chai Paragliding",
    fr: "Parapente à Mu Cang Chai",
    ru: "Парапланеризм в Мукангчае",
    zh: "木江界滑翔伞",
    hi: "मु कांग चाई पैराग्लाइडिंग",
  },
  "doi-bu": {
    vi: "Dù lượn Hà Nội",
    en: "Hanoi Paragliding",
    fr: "Parapente à Hanoï",
    ru: "Парапланеризм в Ханое",
    zh: "河内滑翔伞",
    hi: "हनोई पैराग्लाइडिंग",
  },
  "vien-nam": {
    vi: "Dù lượn Hà Nội",
    en: "Hanoi Paragliding",
    fr: "Parapente à Hanoï",
    ru: "Парапланеризм в Ханое",
    zh: "河内滑翔伞",
    hi: "हनोई पैराग्लाइडिंग",
  },
  "muong-hoa-sapa": {
    vi: "Dù lượn Sapa",
    en: "Sapa Paragliding",
    fr: "Parapente à Sapa",
    ru: "Парапланеризм в Сапе",
    zh: "沙坝滑翔伞",
    hi: "सापा पैराग्लाइडिंग",
  },
  "son-tra": {
    vi: "Dù lượn Đà Nẵng",
    en: "Da Nang Paragliding",
    fr: "Parapente à Da Nang",
    ru: "Парапланеризм в Дананге",
    zh: "岘港滑翔伞",
    hi: "दा नांग पैराग्लाइडिंग",
  },
  "ha-giang": {
    vi: "Dù lượn Hà Giang",
    en: "Ha Giang Paragliding",
    fr: "Parapente à Ha Giang",
    ru: "Парапланеризм в Хазянге",
    zh: "河江滑翔伞",
    hi: "हा जियांग पैराग्लाइडिंग",
  },
  "tram-tau": {
    vi: "Dù lượn Phình Hồ",
    en: "Phinh Ho Paragliding",
    fr: "Parapente à Phinh Ho",
    ru: "Парапланеризм в Финьхо",
    zh: "Phinh Ho 滑翔伞",
    hi: "फिन्ह हो पैराग्लाइडिंग",
  },
  dalat: {
    vi: "Dù lượn Đà Lạt",
    en: "Da Lat Paragliding",
    fr: "Parapente à Da Lat",
    ru: "Парапланеризм в Далате",
    zh: "大叻滑翔伞",
    hi: "दा लाट पैराग्लाइडिंग",
  },
};

/** Điểm nhấn ngắn cho mô tả — mỗi điểm bay một câu, dịch 6 ngôn ngữ. */
const HIGHLIGHT: Record<string, Record<Locale, string>> = {
  "khau-pha": {
    vi: "ruộng bậc thang mùa vàng, một trong tứ đại đỉnh đèo Tây Bắc",
    en: "golden rice terraces, one of Northwest Vietnam's four great passes",
    fr: "rizières en terrasses dorées, l'un des quatre grands cols du Nord-Ouest",
    ru: "золотые рисовые террасы, один из четырёх великих перевалов северо-запада",
    zh: "金色梯田，西北四大山口之一",
    hi: "सुनहरे सीढ़ीनुमा खेत, उत्तर-पश्चिम वियतनाम के चार महान दर्रों में से एक",
  },
  "doi-bu": {
    vi: "điểm bay gần Hà Nội nhất, bay được quanh năm",
    en: "the closest flying site to Hanoi, flyable year-round",
    fr: "le site le plus proche de Hanoï, praticable toute l'année",
    ru: "ближайшая к Ханою площадка, полёты круглый год",
    zh: "距河内最近的飞行点，全年可飞",
    hi: "हनोई से सबसे नज़दीक उड़ान स्थल, पूरे साल उड़ान",
  },
  "vien-nam": {
    vi: "điểm cất cánh cao nhất Hà Nội, chênh cao hơn 800m",
    en: "Hanoi's highest launch, with over 800m of vertical drop",
    fr: "le décollage le plus haut de Hanoï, plus de 800 m de dénivelé",
    ru: "самый высокий старт Ханоя, перепад более 800 м",
    zh: "河内最高起飞点，落差超过 800 米",
    hi: "हनोई का सबसे ऊँचा लॉन्च, 800 मीटर से अधिक ऊँचाई अंतर",
  },
  "muong-hoa-sapa": {
    vi: "thung lũng Mường Hoa, biển mây và đỉnh Fansipan",
    en: "the Muong Hoa valley, sea of clouds and Fansipan peak",
    fr: "la vallée de Muong Hoa, mer de nuages et le pic Fansipan",
    ru: "долина Мыонг Хоа, море облаков и пик Фансипан",
    zh: "孟花谷、云海与番西邦峰",
    hi: "मुओंग होआ घाटी, बादलों का समुद्र और फैनसिपन चोटी",
  },
  "son-tra": {
    vi: "bán đảo Sơn Trà, rừng nguyên sinh và biển Mỹ Khê",
    en: "the Son Tra peninsula, primeval forest and My Khe beach",
    fr: "la péninsule de Son Tra, forêt primaire et plage de My Khe",
    ru: "полуостров Шонча, девственный лес и пляж Микхе",
    zh: "山茶半岛、原始森林与美溪海滩",
    hi: "सोन ट्रा प्रायद्वीप, प्राचीन वन और माई खे समुद्र तट",
  },
  "ha-giang": {
    vi: "cao nguyên đá Đồng Văn, dốc Bắc Sum và Quản Bạ",
    en: "the Dong Van karst plateau, Bac Sum slope and Quan Ba",
    fr: "le plateau karstique de Dong Van, la côte de Bac Sum et Quan Ba",
    ru: "каменное плато Донгван, склон Бакшум и Куанба",
    zh: "同文岩石高原、北森坡与管坝",
    hi: "डोंग वान चट्टानी पठार, बाक सुम ढलान और क्वान बा",
  },
  "tram-tau": {
    vi: "Phình Hồ – Trạm Tấu, săn mây trên đồi núi trùng điệp",
    en: "Phinh Ho – Tram Tau, cloud hunting over endless ridges",
    fr: "Phinh Ho – Tram Tau, chasse aux nuages sur des crêtes infinies",
    ru: "Финьхо – Чамтау, охота за облаками над бесконечными хребтами",
    zh: "Phinh Ho – 占秋，在连绵山峦上追云",
    hi: "फिन्ह हो – त्राम ताउ, अनंत पहाड़ियों पर बादलों का पीछा",
  },
  dalat: {
    vi: "rừng thông và cao nguyên Lâm Đồng",
    en: "pine forests and the Lam Dong highlands",
    fr: "forêts de pins et hauts plateaux de Lam Dong",
    ru: "сосновые леса и плато Ламдонг",
    zh: "松林与林同高原",
    hi: "चीड़ के जंगल और लाम डोंग पठार",
  },
};

/** Khuôn mô tả theo ngôn ngữ. */
const DESCRIPTION: Record<Locale, (name: string, hl: string, price: string) => string> = {
  vi: (n, h, p) =>
    `Đặt tour ${n.toLowerCase()} cùng Mebayluon — ${h}. Giá từ ${p}đ, phi công chuyên nghiệp, bảo hiểm và video GoPro miễn phí.`,
  en: (n, h, p) =>
    `Book ${n.toLowerCase()} with Mebayluon — ${h}. From ${p} VND, certified pilots, insurance and free GoPro footage.`,
  fr: (_n, h, p) =>
    `Réservez votre vol — ${h}. À partir de ${p} VND, pilotes certifiés, assurance et vidéo GoPro offerte.`,
  ru: (_n, h, p) =>
    `Забронируйте полёт с Mebayluon — ${h}. От ${p} VND, сертифицированные пилоты, страховка и съёмка на GoPro бесплатно.`,
  zh: (_n, h, p) =>
    `与 Mebayluon 一起飞行——${h}。${p} 越南盾起，专业持证飞行员，含保险与免费 GoPro 拍摄。`,
  hi: (_n, h, p) =>
    `Mebayluon के साथ उड़ान बुक करें — ${h}। ${p} VND से शुरू, प्रमाणित पायलट, बीमा और मुफ़्त GoPro रिकॉर्डिंग।`,
};

const LOCALE_NUMBER: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
  hi: "hi-IN",
};

/**
 * Tiêu đề + mô tả SEO của một điểm bay theo ngôn ngữ.
 * Điểm bay lạ (chưa khai trong bảng) thì lùi về tên gốc tiếng Việt.
 */
export function spotSeoMeta(
  spotKey: string,
  locale: Locale,
  fallbackName: string,
  basePrice: number,
): { title: string; description: string } {
  const name = SEO_NAME[spotKey]?.[locale] ?? fallbackName;
  const highlight = HIGHLIGHT[spotKey]?.[locale] ?? "";
  const price = basePrice.toLocaleString(LOCALE_NUMBER[locale] ?? "vi-VN");

  return {
    title: `${name} | Mebayluon`,
    description: DESCRIPTION[locale](name, highlight, price),
  };
}
