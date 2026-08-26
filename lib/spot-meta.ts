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
  /**
   * KHAU PHẠ nhắm "Đèo Khau Phạ", KHÔNG nhắm "Mù Cang Chải".
   *
   * Cụm "dù lượn Mù Cang Chải" đã có bài pillar /blog/du-luon-mu-cang-chai
   * nhắm tới. Hai trang cùng một cụm thì Google phải chọn một, và thường chia
   * đôi sức mạnh cho cả hai cùng yếu. Nên tách ý định: trang điểm bay giữ ý
   * ĐẶT BAY tại đèo (giá vé, lịch bay, đưa đón), bài viết giữ ý TÌM HIỂU về
   * vùng Mù Cang Chải. "Đèo Khau Phạ" cũng là cụm khách tìm thật, không phải
   * cụm chết.
   */
  "khau-pha": {
    vi: "Dù lượn Đèo Khau Phạ",
    en: "Khau Pha Pass Paragliding",
    fr: "Parapente au col de Khau Pha",
    ru: "Парапланеризм на перевале Кхау Фа",
    zh: "考帕山口滑翔伞",
    hi: "खाउ फ़ा दर्रा पैराग्लाइडिंग",
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
};

/**
 * Tiêu đề đầy đủ cho thẻ <title>, theo công thức: từ khoá chính + tên riêng
 * của điểm bay + một USP ngắn (giá, mùa đẹp, lịch bay...).
 *
 * Tách khỏi SEO_NAME vì SEO_NAME còn được ghép vào câu mô tả, phải giữ dạng
 * cụm danh từ ngắn. Còn title thì trước đây chỉ là "Dù lượn Mù Cang Chải |
 * Mebayluon" — 32 ký tự, bỏ phí hơn một nửa độ dài Google cho hiển thị, lại
 * thiếu hẳn từ khoá "Khau Phạ" trên chính trang chủ lực.
 *
 * Giữ dưới ~65 ký tự kể cả đuôi " | Mebayluon" để Google không cắt.
 */
const SEO_TITLE: Record<string, Record<Locale, string>> = {
  /* Ý ĐẶT BAY — xem chú thích ở SEO_NAME["khau-pha"]. Bỏ "Mù Cang Chải"
     khỏi title để không đá bài pillar; thay bằng thứ người sắp đặt cần biết. */
  "khau-pha": {
    vi: "Đặt Bay Dù Lượn Đèo Khau Phạ: Giá Vé, Lịch Bay, Đưa Đón",
    en: "Book Khau Pha Pass Paragliding: Prices, Schedule, Pickup",
    fr: "Réserver un parapente au col de Khau Pha : prix & horaires",
    ru: "Полёт на параплане, перевал Кхау Фа: цены и расписание",
    zh: "预订考帕山口滑翔伞：价格、飞行时间、接送",
    hi: "खाउ फ़ा दर्रा पैराग्लाइडिंग बुकिंग: क़ीमत, समय, पिकअप",
  },
  "doi-bu": {
    vi: "Bay Dù Lượn Hà Nội – Đồi Bù: Giá Từ 1.790.000đ",
    en: "Paragliding Near Hanoi – Doi Bu: From 1,790,000₫",
    fr: "Parapente près de Hanoï – Doi Bu : dès 1 790 000 ₫",
    ru: "Параплан под Ханоем – Дой Бу: от 1 790 000 ₫",
    zh: "河内近郊滑翔伞 – 堆布山：1,790,000 越南盾起",
    hi: "हनोई के पास पैराग्लाइडिंग – दोई बू: 1,790,000₫ से",
  },
  "vien-nam": {
    vi: "Bay Dù Lượn Viên Nam – Gần Hà Nội: Chênh Cao Hơn 800m",
    en: "Vien Nam Paragliding Near Hanoi: Over 800m Vertical Drop",
    fr: "Parapente à Vien Nam près de Hanoï : plus de 800 m",
    ru: "Параплан Виен Нам под Ханоем: перепад более 800 м",
    zh: "员南滑翔伞（近河内）：落差超过 800 米",
    hi: "वियन नाम पैराग्लाइडिंग, हनोई के पास: 800 मी+ ऊँचाई",
  },
  "muong-hoa-sapa": {
    vi: "Bay Dù Lượn Sapa – Mường Hoa: Giá & Lịch Bay",
    en: "Sapa Paragliding – Muong Hoa Valley: Prices & Schedule",
    fr: "Parapente à Sapa – vallée de Muong Hoa : prix & horaires",
    ru: "Параплан в Сапе – долина Мыонг Хоа: цены и расписание",
    zh: "沙坝滑翔伞 – 孟花谷：价格与飞行时段",
    hi: "सापा पैराग्लाइडिंग – मुओंग होआ घाटी: क़ीमत व समय",
  },
  "son-tra": {
    vi: "Bay Dù Lượn Đà Nẵng – Bán Đảo Sơn Trà: Giá & Lịch Bay",
    en: "Da Nang Paragliding – Son Tra Peninsula: Prices",
    fr: "Parapente à Da Nang – péninsule de Son Tra : prix",
    ru: "Параплан в Дананге – полуостров Шонча: цены",
    zh: "岘港滑翔伞 – 山茶半岛：价格与飞行时段",
    hi: "दा नांग पैराग्लाइडिंग – सोन ट्रा प्रायद्वीप: क़ीमत",
  },
  "ha-giang": {
    vi: "Bay Dù Lượn Hà Giang – Quản Bạ, Bắc Sum: Giá & Mùa Đẹp",
    en: "Ha Giang Paragliding – Quan Ba, Bac Sum: Prices",
    fr: "Parapente à Ha Giang – Quan Ba & Bac Sum : prix & saison",
    ru: "Параплан в Хазянге – Куанба и Бакшум: цены и сезон",
    zh: "河江滑翔伞 – 管坝、北森坡：价格与最佳季节",
    hi: "हा जियांग पैराग्लाइडिंग – क्वान बा, बाक सुम: क़ीमत",
  },
  "tram-tau": {
    vi: "Bay Dù Lượn Trạm Tấu – Phình Hồ: Săn Mây & Bảng Giá",
    en: "Tram Tau Paragliding – Phinh Ho: Cloud Hunting & Prices",
    fr: "Parapente à Tram Tau – Phinh Ho : mer de nuages & prix",
    ru: "Параплан в Чамтау – Финьхо: охота за облаками и цены",
    zh: "占秋滑翔伞 – Phinh Ho：追云飞行与价格",
    hi: "त्राम ताउ पैराग्लाइडिंग – फिन्ह हो: बादल व क़ीमत",
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

  // Điểm bay chưa khai title riêng thì lùi về cụm từ khoá ngắn như trước.
  const title = SEO_TITLE[spotKey]?.[locale] ?? name;

  return {
    title: `${title} | Mebayluon`,
    description: DESCRIPTION[locale](name, highlight, price),
  };
}
