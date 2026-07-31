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
    featured: {
      slug: "deokhaupha",
      title: {
        vi: "Điểm bay dù lượn Đèo Khau Phạ (Mù Cang Chải) — Điểm bay đẹp vào top 10 thế giới",
        en: "Khau Pha Pass Paragliding Site (Mu Cang Chai) - Top 10 most beautiful flying sites in the world",
      },
    },
    articles: [
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
        en: "Paragliding Festival - Flying Over The Golden Season 2026",
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
      {
        slug: "cam-nang-du-lich-mu-cang-chai-lao-cai",
      title: {
        vi: "Cẩm nang du lịch Mù Cang Chải - Lào Cai",
        en: "Mu Cang Chai - Lao Cai Travel Guide",
      },
      },
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
    featured: {
      slug: "bay-du-luon-doi-bu",
      title: {
        vi: "Bay dù lượn Đồi Bù – điểm bay gần Hà Nội",
        en: "Paragliding at Doi Bu – A Flying Site Near Hanoi",
      },
    },
    articles: [
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
    fr: "le col de Khau Pha",
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
  "muong-hoa-sapa": {
    vi: "Mường Hoa (Sa Pa)",
    en: "Muong Hoa Valley (Sapa)",
    fr: "la vallée de Muong Hoa (Sapa)",
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
export const SPOT_ARTICLES_HEADING: Record<
  string,
  { title: string; subtitle: string }
> = {
  vi: {
    title: "Đọc thêm về điểm bay {name}",
    subtitle: "Cẩm nang, mùa đẹp và cách di chuyển — chọn bài để xem chi tiết",
  },
  en: {
    title: "Read more about {name}",
    subtitle: "Guides, best seasons and how to get there",
  },
  fr: {
    title: "En savoir plus sur {name}",
    subtitle: "Guides, meilleures saisons et accès",
  },
  ru: {
    title: "Подробнее о месте полётов: {name}",
    subtitle: "Гиды, лучшие сезоны и как добраться",
  },
  zh: {
    title: "了解更多关于{name}",
    subtitle: "攻略、最佳季节与交通方式",
  },
  hi: {
    title: "{name} के बारे में और पढ़ें",
    subtitle: "गाइड, सर्वोत्तम मौसम और पहुँचने का तरीका",
  },
};
