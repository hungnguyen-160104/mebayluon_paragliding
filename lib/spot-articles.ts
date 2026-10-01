// lib/spot-articles.ts
/**
 * Bài viết CTA gắn dưới trang chi tiết từng điểm bay ("Đọc thêm về điểm
 * bay này"). Danh sách do chủ site chọn tay — KHÔNG tự sinh từ DB để giữ
 * đúng thứ tự ưu tiên kinh doanh.
 *
 * Tiêu đề lấy đúng theo bài trong DB (tiếng Việt — blog chủ yếu là bản vi).
 * Khi đổi slug bài viết, nhớ cập nhật ở đây (hoặc thêm alias vào
 * lib/legacy-slug-redirects.ts).
 */
export type SpotArticle = {
  slug: string;
  /**
   * Tiêu đề hiển thị. Bài trong DB chỉ có bản Việt + Anh, nên khách xem
   * ngôn ngữ khác (fr/ru/zh/hi) được hiện tiêu đề tiếng Anh — đúng với
   * nội dung họ sẽ đọc khi bấm vào.
   */
  title: { vi: string; en: string };
};

export type SpotArticleSet = {
  /** Bài quan trọng nhất — hiển thị thẻ lớn nổi bật đầu tiên. */
  featured: SpotArticle;
  articles: SpotArticle[];
};

export const SPOT_ARTICLES: Record<string, SpotArticleSet> = {
  "khau-pha": {
    // 10/2026: bài trụ cột Khau Phạ (28 link nội bộ trỏ về). Trước đây là
    // "deokhaupha" — slug CŨ, mỗi lần bấm phải đi qua một bước chuyển 301.
    featured: {
      slug: "du-luon-mu-cang-chai",
      title: {
        vi: "Dù Lượn Mù Cang Chải 2026: Giá Vé, Mùa Bay Đẹp Nhất Và Toàn Bộ Kinh Nghiệm Từ Đội Bay Khau Phạ",
        en: "Paragliding in Mu Cang Chai 2026: Prices, Best Season and the Complete Guide from the Khau Pha Flight Team",
      },
    },
    articles: [
      {
        slug: "du-luon-deo-khau-pha",
      title: {
        vi: "Dù Lượn Đèo Khau Phạ: Hồ Sơ Điểm Bay Top 10 Thế Giới",
        en: "Khau Pha Pass Paragliding: Profile of a World Top-10 Flying Site",
      },
      },
      {
        slug: "diem-cat-canh-ha-canh-du-luon-khau-pha",
      title: {
        vi: "Điểm cất cánh và hạ cánh dù lượn đèo Khau Phạ có gì?",
        en: "What's at the Khau Pha Paragliding Launch and Landing Sites?",
      },
      },
      {
        slug: "di-chuyen-den-diem-bay-du-luon-khau-pha",
      title: {
        vi: "Cách di chuyển đến điểm bay dù lượn đèo Khau Phạ",
        en: "How to Get to the Khau Pha Pass (Mu Cang Chai) Paragliding Site",
      },
      },
      {
        slug: "mua-lua-xanh-mu-cang-chai",
      title: {
        vi: "Mùa lúa xanh Mù Cang Chải – đẹp nhất khi ngắm từ trên cao",
        en: "Mu Cang Chai's Green Rice Season, Seen Best From the Sky",
      },
      },
      {
        slug: "bay-du-luon-mua-nuoc-do-mu-cang-chai",
      title: {
        vi: "Bay dù lượn mùa nước đổ – góc nhìn đẹp nhất Tây Bắc",
        en: "Paragliding Over Mu Cang Chai's Water-Pouring Season – The Best View in Northwest Vietnam",
      },
      },
      {
        slug: "le-hoi-du-luon-bay-tren-mua-vang-2026",
      title: {
        vi: "Lễ hội dù lượn Mùa Vàng 2026 tại đèo Khau Phạ",
        en: "Golden Season Paragliding Festival 2026 at Khau Pha Pass",
      },
      },
      {
        slug: "combo-du-luon-homestay-mu-cang-chai",
      title: {
        vi: "Combo dù lượn và homestay Mù Cang Chải",
        en: "Paragliding and Homestay Combo in Mu Cang Chai",
      },
      },
    ],
  },

  // Mường Hoa (Sa Pa) — trang /spots/muong-hoa-sapa (alias /spots/sapa)
  "muong-hoa-sapa": {
    featured: {
      slug: "bay-du-luon-sa-pa-muong-hoa",
      title: {
        vi: "Bay dù lượn Sa Pa – ngắm thung lũng Mường Hoa từ trên cao",
        en: "Paragliding in Sa Pa – Muong Hoa Valley Seen From Above",
      },
    },
    articles: [
      {
        slug: "bay-du-luon-bien-may-sa-pa",
      title: {
        vi: "Bay dù lượn trên biển mây Sa Pa – ngắm Fansipan từ trên cao",
        en: "Paragliding Above Sapa's Sea of Clouds – Fansipan From the Air",
      },
      },
      // (10/2026) Bỏ "cam-nang-du-lich-mu-cang-chai-lao-cai" — bài về Mù Cang
      // Chải, không phải Sa Pa.
      {
        slug: "thoi-tiet-bay-du-luon",
      title: {
        vi: "Thời tiết bay dù lượn: trời mưa có bay được không?",
        en: "Paragliding Weather: Can You Fly in the Rain?",
      },
      },
      {
        slug: "cac-diem-bay-du-luon-mebayluon",
      title: {
        vi: "Nên bay dù lượn ở đâu? So sánh 7 điểm bay của Mebayluon",
        en: "Where Should You Fly? Mebayluon's 7 Sites Compared",
      },
      },
      {
        slug: "du-luon-co-an-toan-khong",
      title: {
        vi: "Dù lượn có an toàn không? Sự thật trước chuyến bay đầu tiên",
        en: "Is Paragliding Safe? What to Know Before Your First Flight",
      },
      },
    ],
  },

  // Thẻ "Hà Nội" (Đồi Bù | Viên Nam) — trang /spots/doi-bu
  "doi-bu": {
    // 10/2026: bài giá vé + so sánh hai bãi Hà Nội làm bài nổi bật.
    featured: {
      slug: "gia-ve-du-luon-ha-noi",
      title: {
        vi: "Dù lượn Hà Nội 2026: tất tần tật giá vé và hai điểm bay Đồi Bù, Viên Nam",
        en: "Paragliding in Hanoi 2026: Ticket Prices and the Two Flying Sites (Doi Bu & Vien Nam)",
      },
    },
    articles: [
      {
        slug: "bay-du-luon-doi-bu",
      title: {
        vi: "Bay dù lượn Đồi Bù – điểm bay gần Hà Nội",
        en: "Paragliding at Doi Bu – A Flying Site Near Hanoi",
      },
      },
      {
        slug: "du-luon-vien-nam",
      title: {
        vi: "Dù lượn đỉnh Viên Nam (Hà Nội): độ cao, gói bay và giá",
        en: "Vien Nam Peak Paragliding (Hanoi): Altitude, Options, Prices",
      },
      },
      {
        slug: "bay-du-luon-hanoi",
      title: {
        vi: "Bay dù lượn Hà Nội: đường lên đỉnh Viên Nam và cắm trại",
        en: "Paragliding Near Hanoi: The Climb to Vien Nam Peak and Camping",
      },
      },
      {
        slug: "diem-bay-du-luon-doi-bu",
      title: {
        vi: "Điểm bay dù lượn Đồi Bù: vị trí, độ cao và mùa đẹp nhất",
        en: "Doi Bu Paragliding Site: Location, Altitude and Best Season",
      },
      },
      {
        slug: "the-thao-ngoai-troi-ha-noi-du-luon",
      title: {
        vi: "Thể thao ngoài trời tại Hà Nội: dù lượn đang thành xu hướng",
        en: "Outdoor Sports Near Hanoi: Paragliding Is the New Trend",
      },
      },
    ],
  },
};

/**
 * Tên điểm bay theo ngôn ngữ, dùng để điền vào "{name}" của tiêu đề mục.
 * "Đèo", "đồi", "thung lũng" là danh từ chung nên dịch; tên riêng giữ nguyên.
 */
export const SPOT_ARTICLE_NAMES: Record<string, Record<string, string>> = {
  "khau-pha": {
    vi: "Đèo Khau Phạ",
    en: "Khau Pha Pass",
    fr: "col de Khau Pha",
    ru: "перевал Кхау Фа",
    zh: "考帕山口",
    hi: "खाउ फ़ा दर्रा",
  },
  // Trang "Hà Nội" gộp 2 điểm bay Đồi Bù + Viên Nam — ghi cả hai tên
  "doi-bu": {
    vi: "Đồi Bù | Viên Nam",
    en: "Doi Bu | Vien Nam",
    fr: "Doi Bu | Vien Nam",
    ru: "Дой Бу | Виен Нам",
    zh: "布山 | 员南",
    hi: "डोई बू | विएन नाम",
  },
  "ha-giang": {
    vi: "Quản Bạ (Hà Giang)",
    en: "Quan Ba (Ha Giang)",
    fr: "Quan Ba (Ha Giang)",
    ru: "Куан Ба (Хазянг)",
    zh: "管坝（河江）",
    hi: "क्वान बा (हा जियांग)",
  },
  "tram-tau": {
    vi: "Phình Hồ – Trạm Tấu",
    en: "Phinh Ho – Tram Tau",
    fr: "Phinh Ho – Tram Tau",
    ru: "Пхинь Хо – Чам Тау",
    zh: "平湖 – 站濑",
    hi: "फिन्ह हो – ट्राम ताउ",
  },
  "son-tra": {
    vi: "Sơn Trà (Đà Nẵng)",
    en: "Son Tra (Da Nang)",
    fr: "Son Tra (Da Nang)",
    ru: "Шонча (Дананг)",
    zh: "山茶（岘港）",
    hi: "सोन ट्रा (दा नांग)",
  },
  "muong-hoa-sapa": {
    vi: "Mường Hoa (Sa Pa)",
    en: "Muong Hoa Valley (Sapa)",
    fr: "vallée de Muong Hoa (Sapa)",
    ru: "долина Мыонг Хоа (Сапа)",
    zh: "孟花谷（沙坝）",
    hi: "मुओंग होआ घाटी (सापा)",
  },
};

/**
 * Tiêu đề section theo ngôn ngữ URL.
 * "{name}" được thay bằng tên điểm bay lúc render (vd "Đèo Khau Phạ") —
 * tên riêng giữ nguyên ở mọi ngôn ngữ.
 */
/**
 * Dấu "\n" trong title là CHỖ NGẮT DÒNG trên điện thoại.
 *
 * Tên điểm bay dài (vd "Đồi Bù | Viên Nam") làm tiêu đề vỡ thành ba dòng lẻ
 * với một hai chữ mồ côi. Ngắt sẵn ở chỗ đọc thuận nhất rồi cho dòng thứ hai
 * xuống hàng dưới 640px; từ 640px trở lên hai mảnh nối lại thành một dòng.
 */
export const SPOT_ARTICLES_HEADING: Record<
  string,
  { title: string; subtitle: string }
> = {
  vi: {
    title: "Cẩm nang & bài viết\nDù lượn {name}",
    subtitle: "Cẩm nang điểm bay, kỹ thuật cho phi công, giá dịch vụ và sự kiện",
  },
  en: {
    title: "Guides & articles\nParagliding at {name}",
    subtitle: "Site guides, pilot technique, prices and events",
  },
  fr: {
    title: "Guides et articles\nParapente : {name}",
    subtitle: "Guides du site, technique de pilotage, tarifs et événements",
  },
  ru: {
    title: "Гиды и статьи\nПарапланеризм: {name}",
    subtitle: "Путеводители, техника пилотирования, цены и события",
  },
  zh: {
    title: "攻略与文章\n{name}滑翔伞",
    subtitle: "飞行点攻略、飞行技术、价格与活动",
  },
  hi: {
    title: "गाइड और लेख\n{name} में पैराग्लाइडिंग",
    subtitle: "उड़ान स्थल गाइड, पायलट तकनीक, कीमतें और आयोजन",
  },
};

/** Tiêu đề từng nhóm trong mục "Cẩm nang & bài viết" (xem lib/spot-hub.ts). */
export type SpotHubGroupKey = "guides" | "compare" | "pilot" | "services" | "events";

export const SPOT_HUB_GROUP_LABELS: Record<string, Record<SpotHubGroupKey, string>> = {
  vi: {
    guides: "Cẩm nang điểm bay",
    compare: "So sánh các điểm bay",
    pilot: "Cho phi công: kỹ thuật & học bay",
    services: "Giá & dịch vụ",
    events: "Tin tức & sự kiện",
  },
  en: {
    guides: "Site guide",
    compare: "Compare flying sites",
    pilot: "For pilots: technique & training",
    services: "Prices & services",
    events: "News & events",
  },
  fr: {
    guides: "Guide du site",
    compare: "Comparer les sites de vol",
    pilot: "Pour les pilotes : technique et formation",
    services: "Tarifs et services",
    events: "Actualités et événements",
  },
  ru: {
    guides: "Путеводитель по месту",
    compare: "Сравнение мест полётов",
    pilot: "Для пилотов: техника и обучение",
    services: "Цены и услуги",
    events: "Новости и события",
  },
  zh: {
    guides: "飞行点攻略",
    compare: "飞行点对比",
    pilot: "飞行员专栏：技术与培训",
    services: "价格与服务",
    events: "新闻与活动",
  },
  hi: {
    guides: "उड़ान स्थल गाइड",
    compare: "उड़ान स्थलों की तुलना",
    pilot: "पायलटों के लिए: तकनीक और प्रशिक्षण",
    services: "कीमतें और सेवाएँ",
    events: "समाचार और आयोजन",
  },
};

/** Nút mở phần còn lại của một nhóm dài (trang điểm bay, điện thoại đỡ phải cuộn). */
export const SPOT_HUB_MORE_LABEL: Record<string, (n: number) => string> = {
  vi: (n) => `Xem thêm ${n} bài`,
  en: (n) => `Show ${n} more`,
  fr: (n) => `Voir ${n} de plus`,
  ru: (n) => `Показать ещё ${n}`,
  zh: (n) => `再看 ${n} 篇`,
  hi: (n) => `${n} और देखें`,
};
