// mbl-paragliding/types/post.ts

export type StoreCategory =
  | "thiet-bi-bay"
  | "phu-kien"
  | "sach-du-luon"
  | "khoa-hoc-du-luon";

export type Post = {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  content: string;
  tags?: string[];
  language?: string;
  isPublished: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  /** "news" | "knowledge" | "store" ... tùy backend bạn đặt */
  category?: string;

  /** ---- Phần mở rộng cho SẢN PHẨM ---- */
  type?: "blog" | "product";
  price?: number;
  storeCategory?: StoreCategory;
};

export type Paginated<T> = {
  page: number;
  limit: number;
  total: number;
  items: T[];
};

export type PostPayload = {
  title: string;
  content: string;
  coverImage?: string;
  tags?: string[];
  language?: string;
  isPublished?: boolean;
  category?: string;

  /** ---- Field cho SẢN PHẨM (chỉ dùng nếu category = "store") ---- */
  type?: "blog" | "product";
  price?: number;
  storeCategory?: StoreCategory;
};
