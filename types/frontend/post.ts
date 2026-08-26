export type StoreCategory =
  | "thiet-bi-bay"
  | "phu-kien"
  | "sach-du-luon"
  | "khoa-hoc-du-luon";

/** Chuyên mục bài blog — khớp với BlogCategory ở lib/blog-categories.ts. */
export type BlogCategoryKey = "tin-tuc" | "su-kien" | "tip" | "du-lich";

export type KnowledgeSubCategory =
  | "can-ban"
  | "nang-cao"
  | "thermal"
  | "xc"
  | "khi-tuong";

export type PostCategory = "news" | "knowledge" | "store";
export type PostType = "blog" | "product";
export type SupportedLocale = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type EmbedType = "youtube" | "googleMaps" | "unknown";

export type ContentBlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "quote"
  | "bulletList"
  | "divider"
  | "cta"
  | "embed"
  /** Thư viện ảnh: nhiều ảnh dạng lưới, thường đặt cuối bài. */
  | "gallery";

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  data: {
    level?: 1 | 2 | 3 | 4;
    text?: string;
    url?: string;
    caption?: string;
    alt?: string;
    author?: string;
    items?: string[];
    link?: string;
    embedType?: EmbedType;
    /** Block thư viện ảnh: danh sách ảnh + số cột hiển thị. */
    images?: { url: string; caption?: string }[];
    columns?: number;
    /** Đoạn văn: căn lề + cỡ chữ (dùng chung 2 ngôn ngữ). */
    align?: "left" | "center" | "right";
    fontSize?: "sm" | "base" | "lg" | "xl";
  };
};

export type Post = {
  _id: string;
  title: string;
  titleVi?: string;
  slug: string;

  content: string;
  contentVi?: string;

  contentBlocks?: ContentBlock[];
  contentBlocksVi?: ContentBlock[];
  /** "html" = bài dán thẳng HTML, máy chủ giữ nguyên văn, không dựng lại từ khối. */
  contentMode?: "blocks" | "html";

  excerpt?: string;
  excerptVi?: string;
  /** Ngôn ngữ đã dịch tay ngoài vi + en, ví dụ ["fr"]. */
  translatedLangs?: string[];

  coverImage?: string;
  thumbnail?: string;

  author?: string;
  category?: PostCategory | string;
  subCategory?: KnowledgeSubCategory;
  blogCategory?: BlogCategoryKey;
  tags?: string[];

  language?: "bilingual" | "vi" | "en";
  readTime?: number;

  isPublished: boolean;
  views: number;

  fixed?: boolean;
  isFixed?: boolean;
  fixedKey?: string | null;
  /** Thời điểm tick "hiển thị đầu trang" — quyết định thứ tự bài ghim. */
  featuredAt?: string | null;

  type?: PostType;
  storeCategory?: StoreCategory;
  price?: number;

  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  mapUrl?: string;
  lat?: number;
  lng?: number;
};

export type Paginated<T> = {
  page: number;
  limit: number;
  total: number;
  pages?: number;
  items: T[];
};

export type PostPayload = {
  title: string;
  titleVi: string;
  slug?: string;

  excerpt?: string;
  excerptVi?: string;
  /** Ngôn ngữ đã dịch tay ngoài vi + en, ví dụ ["fr"]. */
  translatedLangs?: string[];

  content?: string;
  contentVi?: string;

  contentBlocks?: ContentBlock[];
  contentBlocksVi?: ContentBlock[];
  /** "html" = bài dán thẳng HTML, máy chủ giữ nguyên văn, không dựng lại từ khối. */
  contentMode?: "blocks" | "html";

  coverImage?: string;
  tags?: string[];

  isPublished?: boolean;
  fixed?: boolean;
  isFixed?: boolean;
  fixedKey?: string | null;

  category?: PostCategory | "";
  subCategory?: KnowledgeSubCategory;
  blogCategory?: BlogCategoryKey;
  type?: PostType;

  storeCategory?: StoreCategory;
  price?: number;

  mapUrl?: string;
  lat?: number;
  lng?: number;
};