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

export type PostCategory = "news" | "knowledge" | "store";
export type PostType = "blog" | "product";

export type FixedKey =
  | "hoa-binh"
  | "ha-noi"
  | "mu-cang-chai"
  | "yen-bai"
  | "da-nang"
  | "sapa";

const FIXED_KEYS: FixedKey[] = [
  "hoa-binh",
  "ha-noi",
  "mu-cang-chai",
  "yen-bai",
  "da-nang",
  "sapa",
];

export interface IPost {
  title: string;
  titleVi: string;
  slug: string;

  content: string;
  contentVi: string;

  contentBlocks?: Array<Record<string, unknown>>;
  contentBlocksVi?: Array<Record<string, unknown>>;

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

  isPublished?: boolean;
  views?: number;

  fixed?: boolean;
  isFixed?: boolean; // alias của fixed
  fixedKey?: FixedKey | null;

  type?: PostType;
  storeCategory?: StoreCategory;
  price?: number;

  publishedAt?: Date | null;

  mapUrl?: string;
  lat?: number;
  lng?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    titleVi: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },

    content: { type: String, default: "" },
    contentVi: { type: String, default: "" },

    contentBlocks: { type: [Schema.Types.Mixed], default: [] },
    contentBlocksVi: { type: [Schema.Types.Mixed], default: [] },

    excerpt: { type: String, default: "" },
    excerptVi: { type: String, default: "" },

    coverImage: { type: String, default: "" },
    thumbnail: { type: String, default: "" },

    author: { type: String, default: "Admin" },
    category: {
      type: String,
      enum: ["news", "knowledge", "store"],
      default: "news",
    },
    subCategory: {
      type: String,
      enum: ["can-ban", "nang-cao", "thermal", "xc", "khi-tuong"],
      required: false,
    },
    tags: [{ type: String }],

    language: { type: String, default: "bilingual" },
    readTime: { type: Number, default: 1 },

    isPublished: { type: Boolean, default: false },
    views: { type: Number, default: 0 },

    fixed: {
      type: Boolean,
      default: false,
      alias: "isFixed",
    },
    fixedKey: {
      type: String,
      enum: FIXED_KEYS,
      default: null,
    },

    type: { type: String, enum: ["blog", "product"], default: "blog" },
    storeCategory: {
      type: String,
      enum: ["thiet-bi-bay", "phu-kien", "sach-du-luon", "khoa-hoc-du-luon"],
      required: false,
    },
    price: { type: Number, min: 0 },

    publishedAt: { type: Date, default: null },

    mapUrl: { type: String, default: "" },
    lat: { type: Number },
    lng: { type: Number },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PostSchema.index({ slug: 1 }, { unique: true });
PostSchema.index({ category: 1, subCategory: 1, isPublished: 1, createdAt: -1 });
PostSchema.index({ type: 1, storeCategory: 1, isPublished: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, publishedAt: -1, createdAt: -1 });
PostSchema.index({ fixed: 1, fixedKey: 1, isPublished: 1, createdAt: -1 });

export const Post =
  (mongoose.models.Post as mongoose.Model<IPost>) ||
  mongoose.model<IPost>("Post", PostSchema);