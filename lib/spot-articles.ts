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
  title: string;
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
      title:
        "Điểm bay dù lượn Đèo Khau Phạ (Mù Cang Chải) — Điểm bay đẹp vào top 10 thế giới",
    },
    articles: [
      {
        slug: "diem-cat-canh-ha-canh-du-luon-khau-pha",
        title: "Điểm cất cánh và hạ cánh dù lượn đèo Khau Phạ có gì?",
      },
      {
        slug: "di-chuyen-den-diem-bay-du-luon-khau-pha",
        title: "Cách di chuyển đến điểm bay dù lượn đèo Khau Phạ",
      },
      {
        slug: "mua-lua-xanh-mu-cang-chai",
        title: "Mùa lúa xanh Mù Cang Chải – đẹp nhất khi ngắm từ trên cao",
      },
      {
        slug: "bay-du-luon-mua-nuoc-do-mu-cang-chai",
        title: "Bay dù lượn mùa nước đổ – góc nhìn đẹp nhất Tây Bắc",
      },
      {
        slug: "le-hoi-du-luon-bay-tren-mua-vang-2026",
        title: "Lễ hội dù lượn Mùa Vàng 2026 tại đèo Khau Phạ",
      },
      {
        slug: "combo-du-luon-homestay-mu-cang-chai",
        title: "Combo dù lượn và homestay Mù Cang Chải",
      },
    ],
  },

  // Thẻ "Hà Nội" (Đồi Bù | Viên Nam) — trang /spots/doi-bu
  "doi-bu": {
    featured: {
      slug: "bay-du-luon-doi-bu",
      title: "Bay dù lượn Đồi Bù – điểm bay gần Hà Nội",
    },
    articles: [
      {
        slug: "du-luon-vien-nam",
        title: "Dù lượn đỉnh Viên Nam (Hà Nội): độ cao, gói bay và giá",
      },
      {
        slug: "bay-du-luon-hanoi",
        title: "Bay dù lượn Hà Nội: đường lên đỉnh Viên Nam và cắm trại",
      },
      {
        slug: "diem-bay-du-luon-doi-bu",
        title: "Điểm bay dù lượn Đồi Bù: vị trí, độ cao và mùa đẹp nhất",
      },
      {
        slug: "the-thao-ngoai-troi-ha-noi-du-luon",
        title: "Thể thao ngoài trời tại Hà Nội: dù lượn đang thành xu hướng",
      },
    ],
  },
};

/** Tiêu đề section theo ngôn ngữ URL. */
export const SPOT_ARTICLES_HEADING: Record<
  string,
  { title: string; subtitle: string }
> = {
  vi: {
    title: "Đọc thêm về điểm bay này",
    subtitle: "Cẩm nang, mùa đẹp và cách di chuyển — chọn bài để xem chi tiết",
  },
  en: {
    title: "Read more about this flying site",
    subtitle: "Guides, best seasons and how to get there",
  },
  fr: {
    title: "En savoir plus sur ce site de vol",
    subtitle: "Guides, meilleures saisons et accès",
  },
  ru: {
    title: "Подробнее об этом месте полётов",
    subtitle: "Гиды, лучшие сезоны и как добраться",
  },
  zh: {
    title: "了解更多关于此飞行点",
    subtitle: "攻略、最佳季节与交通方式",
  },
  hi: {
    title: "इस उड़ान स्थल के बारे में और पढ़ें",
    subtitle: "गाइड, सर्वोत्तम मौसम और पहुँचने का तरीका",
  },
};
