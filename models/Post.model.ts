// models/Post.model.ts
import mongoose, { Schema } from "mongoose";

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

// 6 điểm bay cố định
export type FixedKey =
  | "hoa-binh"
  | "ha-noi"
  | "mu-cang-chai"
  | "yen-bai"
  | "da-nang"
  | "sapa";

export interface IPost {
  title: string;
  slug: string;
  content: string;
  coverImage?: string;
  author?: string;
  category?: string; // "news" | "knowledge" | "store" ...
  tags?: string[];
  language?: "vi" | "en";
  readTime?: number;
  isPublished?: boolean;
  views?: number;

  // UI/SEO
  excerpt?: string;
  thumbnail?: string;

  // Knowledge
  subCategory?: KnowledgeSubCategory;

  // Product
  type?: "blog" | "product";
  storeCategory?: StoreCategory;
  price?: number;

  // Publish time
  publishedAt?: Date | null;

  // 6 bài cố định
  isFixed?: boolean;
  fixedKey?: FixedKey; // ❗ không default null

  // Google Maps
  mapUrl?: string;
  lat?: number;
  lng?: number;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    coverImage: String,
    author: { type: String, default: "Admin" },
    category: String,
    tags: [{ type: String }],
    language: { type: String, default: "vi" },
    readTime: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: true },
    views: { type: Number, default: 0 },

    excerpt: { type: String, default: "" },
    thumbnail: { type: String, default: "" },

    subCategory: {
      type: String,
      enum: ["can-ban", "nang-cao", "thermal", "xc", "khi-tuong"],
    },

    type: { type: String, enum: ["blog", "product"], default: "blog" },
    storeCategory: {
      type: String,
      enum: ["thiet-bi-bay", "phu-kien", "sach-du-luon", "khoa-hoc-du-luon"],
    },
    price: { type: Number, min: 0 },

    publishedAt: { type: Date, default: null },

    isFixed: { type: Boolean, default: false },
    // ❗ không set default null để field không tồn tại khi không dùng
    fixedKey: {
      type: String,
      enum: ["hoa-binh", "ha-noi", "mu-cang-chai", "yen-bai", "da-nang", "sapa"],
      required: false,
    },

    mapUrl: { type: String, default: "" },
    lat: Number,
    lng: Number,
  },
  { timestamps: true }
);

// ===== Indexes =====
PostSchema.index({ type: 1, storeCategory: 1, isPublished: 1, createdAt: -1 });
PostSchema.index({ category: 1, subCategory: 1, isPublished: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, publishedAt: -1, createdAt: -1 });
PostSchema.index({ isFixed: 1, createdAt: -1 });

// ❗ Mỗi fixedKey chỉ 1 bài, chỉ áp dụng khi isFixed=true
PostSchema.index(
  { fixedKey: 1 },
  { unique: true, partialFilterExpression: { isFixed: true } }
);

export const Post =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);
