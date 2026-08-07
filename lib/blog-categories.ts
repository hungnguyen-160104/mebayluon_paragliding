// lib/blog-categories.ts
/**
 * Phân loại bài blog thành 4 chuyên mục để lọc ở trang /blog.
 *
 * Hai nguồn phân loại, xét theo thứ tự (xem categoryOfPost):
 *  1. Trường `blogCategory` admin chọn khi đăng bài — dùng cho bài MỚI.
 *  2. Bảng slug bên dưới — phân loại sẵn cho 53 bài CŨ, để không phải mở từng
 *     bài trong trang quản trị sửa lại. Slug bài viết giữ nguyên tuyệt đối.
 * Không khớp cả hai thì bài rơi vào "tin-tuc", không bao giờ biến mất khỏi
 * danh sách.
 */

export type BlogCategory = "tin-tuc" | "su-kien" | "tip" | "du-lich";

export const BLOG_CATEGORIES: BlogCategory[] = [
  "tin-tuc",
  "su-kien",
  "tip",
  "du-lich",
];

/** Lễ hội, giải đấu, tập huấn — những gì diễn ra vào một thời điểm cụ thể. */
const SU_KIEN = [
  "ultra-trail-mua-vang-2026-chay-trail-va-bay-du-luon-mu-cang-chai",
  "le-hoi-du-luon-bay-tren-mua-vang-2026",
  "tap-huan-huan-luyen-vien-cuu-ho-du-luon-yen-bai-2025",
  "bay-du-luon-mua-lua-chin-mu-cang-chai",
  "troi-may-xu-muong-2022",
  "bay-du-luon-ho-ta-dung-2022",
  "le-hoi-du-luon-ta-dung-2022",
  "ket-qua-giai-du-luon-ta-dung-2022",
  "bieu-dien-du-luon-dong-co-quy-hop-nghe-an",
];

/** Đường đi, điểm bay, mùa đẹp, cẩm nang cho khách đi chơi. */
const DU_LICH = [
  "di-chuyen-den-diem-bay-du-luon-khau-pha",
  "tu-san-bay-noi-bai-di-mu-cang-chai",
  "di-chuyen-den-tram-tau",
  "duong-ha-noi-di-mu-cang-chai-qua-ic14",
  "xe-di-mu-cang-chai",
  "cam-nang-du-lich-mu-cang-chai-lao-cai",
  "combo-du-luon-homestay-mu-cang-chai",
  "mua-lua-xanh-mu-cang-chai",
  "thang-6-thung-lung-lim-mong",
  "bay-du-luon-mua-nuoc-do-mu-cang-chai",
  "diem-bay-du-luon-dep-nhat-the-gioi",
  "dia-diem-bay-du-luon-dep-nhat-viet-nam",
  "cac-diem-bay-du-luon-mebayluon",
  "trai-nghiem-bay-du-luon-mebayluon",
  "bay-du-luon-bien-may-sa-pa",
  "bay-du-luon-sa-pa-muong-hoa",
  "diem-bay-du-luon-doi-bu",
  "bay-du-luon-doi-bu",
  "du-luon-vien-nam",
  "bay-du-luon-hanoi",
  "deokhaupha",
  "diem-cat-canh-ha-canh-du-luon-khau-pha",
];

/** Giải đáp, so sánh, gợi ý — thứ khách đọc để quyết định trước khi bay. */
const TIP = [
  "cau-hoi-thuong-gap-ve-du-luon",
  "thoi-tiet-bay-du-luon",
  "so-do-cao-co-bay-du-luon-duoc-khong",
  "du-luon-co-an-toan-khong",
  "bay-du-luon-tu-bao-nhieu-tuoi",
  "nhay-du-va-du-luon-khac-nhau",
  "phan-biet-du-luon-va-du-luon-dong-co",
  "du-luon-dong-co-phu-hop-voi-ai",
  "nhung-hieu-lam-pho-bien-ve-du-luon",
  "10-su-that-thu-vi-ve-bay-du-luon",
  "cac-hang-du-luon-noi-tieng",
  "qua-valentine-bay-du-luon",
  "qua-sinh-nhat-bay-du-luon",
  "ky-niem-ngay-cuoi-bang-du-luon",
  "chup-ky-yeu-qua-tot-nghiep-du-luon",
  "quang-cao-bang-du-luon",
];

/**
 * Còn lại là tin tức: chân dung phi công, chuyện nghề, dù lượn thế giới.
 * Không liệt kê tường minh — mọi slug không nằm ở ba nhóm trên đều vào đây,
 * nên bài mới đăng luôn có chỗ mà không cần sửa file này.
 */
const BY_SLUG = new Map<string, BlogCategory>();
for (const slug of SU_KIEN) BY_SLUG.set(slug, "su-kien");
for (const slug of DU_LICH) BY_SLUG.set(slug, "du-lich");
for (const slug of TIP) BY_SLUG.set(slug, "tip");

export function categoryOfSlug(slug: string): BlogCategory {
  return BY_SLUG.get(slug) ?? "tin-tuc";
}

/**
 * Chuyên mục của một bài: ưu tiên giá trị admin chọn trong trang quản trị
 * (post.blogCategory), không có thì tra bảng slug bên trên, không có nữa thì
 * xếp vào "tin-tuc".
 *
 * Nhờ vậy 53 bài cũ không cần sửa lại từng bài, còn bài mới thì admin chọn
 * ngay lúc đăng.
 */
export function categoryOfPost(post: {
  slug: string;
  blogCategory?: string | null;
}): BlogCategory {
  if (isBlogCategory(post.blogCategory)) return post.blogCategory;
  return categoryOfSlug(post.slug);
}

export function isBlogCategory(value: unknown): value is BlogCategory {
  return BLOG_CATEGORIES.includes(String(value) as BlogCategory);
}

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export const BLOG_CATEGORY_LABELS: Record<
  Lang,
  { all: string } & Record<BlogCategory, string>
> = {
  vi: {
    all: "Tất cả",
    "tin-tuc": "Tin tức",
    "su-kien": "Sự kiện",
    tip: "Tip",
    "du-lich": "Du lịch",
  },
  en: {
    all: "All",
    "tin-tuc": "News",
    "su-kien": "Events",
    tip: "Tips",
    "du-lich": "Travel",
  },
  fr: {
    all: "Tout",
    "tin-tuc": "Actualités",
    "su-kien": "Événements",
    tip: "Conseils",
    "du-lich": "Voyage",
  },
  ru: {
    all: "Все",
    "tin-tuc": "Новости",
    "su-kien": "События",
    tip: "Советы",
    "du-lich": "Путешествия",
  },
  zh: {
    all: "全部",
    "tin-tuc": "新闻",
    "su-kien": "活动",
    tip: "小贴士",
    "du-lich": "旅行",
  },
  hi: {
    all: "सभी",
    "tin-tuc": "समाचार",
    "su-kien": "आयोजन",
    tip: "सुझाव",
    "du-lich": "यात्रा",
  },
};
