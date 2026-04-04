export type StoreCategory =
  | "thiet-bi-bay"
  | "phu-kien"
  | "sach-du-luon"
  | "khoa-hoc-du-luon";

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
  | "embed";

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

  excerpt?: string;
  excerptVi?: string;

  coverImage?: string;
  thumbnail?: string;

  author?: string;
  category?: PostCategory | string;
  subCategory?: KnowledgeSubCategory;
  tags?: string[];

  language?: "bilingual" | "vi" | "en";
  readTime?: number;

  isPublished: boolean;
  views: number;

  fixed?: boolean;
  isFixed?: boolean;
  fixedKey?: string | null;

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

  content?: string;
  contentVi?: string;

  contentBlocks?: ContentBlock[];
  contentBlocksVi?: ContentBlock[];

  coverImage?: string;
  tags?: string[];

  isPublished?: boolean;
  fixed?: boolean;
  isFixed?: boolean;
  fixedKey?: string | null;

  category?: PostCategory | "";
  subCategory?: KnowledgeSubCategory;
  type?: PostType;

  storeCategory?: StoreCategory;
  price?: number;

  mapUrl?: string;
  lat?: number;
  lng?: number;
};