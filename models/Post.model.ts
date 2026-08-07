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
  /** Slug cũ của bài — dùng để 301 URL cũ về bài khi slug đã đổi. */
  previousSlugs?: string[];

  content: string;
  contentVi: string;

  contentBlocks?: Array<Record<string, unknown>>;
  contentBlocksVi?: Array<Record<string, unknown>>;

  excerpt?: string;
  excerptVi?: string;

  /**
   * Những ngôn ngữ NGOÀI tiếng Việt + tiếng Anh mà bài này đã có bản dịch
   * thật sự (ví dụ ["fr", "zh"]).
   *
   * Chỉ dùng cho SEO: hreflang và sitemap chỉ khai những ngôn ngữ có trong
   * đây. Khai một ngôn ngữ chưa dịch sẽ khiến Google thấy nhiều URL cùng
   * một nội dung — bị tính là trùng lặp. Mặc định rỗng, tức bài chỉ có
   * tiếng Việt + tiếng Anh.
   */
  translatedLangs?: string[];

  coverImage?: string;
  thumbnail?: string;

  author?: string;
  category?: PostCategory | string;
  subCategory?: KnowledgeSubCategory;
  /** Chuyên mục bài blog: tin-tuc | su-kien | tip | du-lich. */
  blogCategory?: "tin-tuc" | "su-kien" | "tip" | "du-lich";
  tags?: string[];

  language?: "bilingual" | "vi" | "en";
  readTime?: number;

  isPublished?: boolean;
  views?: number;

  fixed?: boolean;
  isFixed?: boolean;
  fixedKey?: FixedKey | null;

  /**
   * Thời điểm bài được tick "hiển thị đầu trang" trong admin.
   * Dùng để xếp thứ tự các bài ghim: tick trước đứng trước.
   * null/không có = bài không ghim.
   */
  featuredAt?: Date | null;

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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleVi: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      // unique/index khai ở PostSchema.index({ slug: 1 }, { unique: true })
      // phía dưới — khai cả hai nơi sẽ bị Mongoose cảnh báo duplicate index.
      trim: true,
    },

    /**
     * Các slug CŨ của bài (tự ghi lại mỗi khi người dùng chủ động đổi slug)
     * — để URL cũ đã được Google index tự chuyển hướng về bài thay vì 404.
     */
    previousSlugs: {
      type: [String],
      default: [],
    },

    content: { type: String, default: "" },
    contentVi: { type: String, default: "" },

    contentBlocks: { type: [Schema.Types.Mixed], default: [] },
    contentBlocksVi: { type: [Schema.Types.Mixed], default: [] },

    excerpt: { type: String, default: "" },
    excerptVi: { type: String, default: "" },

    /** Ngôn ngữ đã dịch ngoài vi + en — xem chú thích ở IPost. */
    translatedLangs: {
      type: [String],
      default: [],
    },

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
    // Chuyên mục của bài blog. Bài cũ chưa có giá trị -> trang /blog tự xếp
    // theo bảng slug trong lib/blog-categories.ts.
    blogCategory: {
      type: String,
      enum: ["tin-tuc", "su-kien", "tip", "du-lich"],
      required: false,
    },
    tags: [{ type: String }],

    language: {
      type: String,
      enum: ["bilingual", "vi", "en"],
      default: "bilingual",
    },
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
      default: undefined,
    },

    featuredAt: { type: Date, default: null },

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
PostSchema.index({ previousSlugs: 1 });
PostSchema.index({ category: 1, subCategory: 1, isPublished: 1, createdAt: -1 });
PostSchema.index({ category: 1, blogCategory: 1, isPublished: 1, publishedAt: -1 });
PostSchema.index({ type: 1, storeCategory: 1, isPublished: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, publishedAt: -1, createdAt: -1 });
PostSchema.index({ fixed: 1, fixedKey: 1, isPublished: 1, createdAt: -1 });

PostSchema.index(
  { fixedKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      fixed: true,
      fixedKey: { $exists: true, $ne: null },
    },
    name: "fixedKey_unique_when_fixed",
  }
);

export const Post =
  (mongoose.models.Post as mongoose.Model<IPost>) ||
  mongoose.model<IPost>("Post", PostSchema);