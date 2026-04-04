import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import type { Post, ContentBlock } from "@/types/frontend/post";
import type { SortOrder } from "mongoose";

export interface GetPostsOptions {
  category?: string;
  subCategory?: string;
  isPublished?: boolean;
  type?: "blog" | "product";
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  excludeSlug?: string;
  excludeId?: string;
}

type RawPostLike = Record<string, any>;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSort(
  s?: string
): string | [string, SortOrder][] | Record<string, SortOrder> {
  const v = (s ?? "-publishedAt,-createdAt").trim();

  if (v.includes(",")) {
    return v
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean)
      .map<[string, SortOrder]>((f) =>
        f.startsWith("-") ? [f.slice(1), "desc"] : [f, "asc"]
      );
  }

  if (v.startsWith("-")) return { [v.slice(1)]: "desc" };
  return { [v]: "asc" };
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any, index) => ({
      id: String(item?.id || `block-${index}`),
      type: item?.type || "paragraph",
      data: typeof item?.data === "object" && item?.data ? item.data : {},
    }));
}

function normalizePostRecord(raw: RawPostLike): Post {
  const createdAt = toIsoString(raw?.createdAt) || new Date(0).toISOString();
  const updatedAt = toIsoString(raw?.updatedAt) || createdAt;

  return {
    _id: String(raw?._id ?? ""),
    title: String(raw?.title ?? ""),
    titleVi: String(raw?.titleVi ?? raw?.title ?? ""),
    slug: String(raw?.slug ?? ""),

    content: String(raw?.content ?? ""),
    contentVi: String(raw?.contentVi ?? raw?.content ?? ""),

    contentBlocks: normalizeBlocks(raw?.contentBlocks),
    contentBlocksVi: normalizeBlocks(raw?.contentBlocksVi),

    excerpt: String(raw?.excerpt ?? ""),
    excerptVi: String(raw?.excerptVi ?? raw?.excerpt ?? ""),

    coverImage: String(raw?.coverImage ?? ""),
    thumbnail: String(raw?.thumbnail ?? raw?.coverImage ?? ""),

    author: String(raw?.author ?? "Admin"),
    category: String(raw?.category ?? "news"),
    subCategory: raw?.subCategory ? String(raw.subCategory) as any : undefined,
    tags: normalizeTags(raw?.tags),

    language:
      raw?.language === "vi" || raw?.language === "en" || raw?.language === "bilingual"
        ? raw.language
        : "bilingual",

    readTime:
      typeof raw?.readTime === "number" && Number.isFinite(raw.readTime)
        ? raw.readTime
        : 1,

    isPublished: Boolean(raw?.isPublished),
    views:
      typeof raw?.views === "number" && Number.isFinite(raw.views)
        ? raw.views
        : 0,

    type: raw?.type === "product" ? "product" : "blog",
    storeCategory: raw?.storeCategory ? String(raw.storeCategory) as any : undefined,
    price:
      typeof raw?.price === "number" && Number.isFinite(raw.price)
        ? raw.price
        : undefined,

    publishedAt: toIsoString(raw?.publishedAt),
    createdAt,
    updatedAt,

    mapUrl: String(raw?.mapUrl ?? ""),
    lat:
      typeof raw?.lat === "number" && Number.isFinite(raw.lat)
        ? raw.lat
        : undefined,
    lng:
      typeof raw?.lng === "number" && Number.isFinite(raw.lng)
        ? raw.lng
        : undefined,
  };
}

export async function getPosts(options: GetPostsOptions = {}) {
  const {
    category,
    subCategory,
    isPublished = true,
    type = "blog",
    page = 1,
    limit = 12,
    sort = "-publishedAt,-createdAt",
    search,
    excludeSlug,
    excludeId,
  } = options;

  try {
    await connectDB();

    const andFilters: Record<string, any>[] = [];

    if (type) {
      andFilters.push({ type });
    }

    if (category) {
      andFilters.push({
        category: new RegExp(`^${escapeRegex(category)}$`, "i"),
      });
    }

    if (subCategory && subCategory !== "all") {
      andFilters.push({
        subCategory: new RegExp(`^${escapeRegex(subCategory)}$`, "i"),
      });
    }

    if (isPublished === true) {
      andFilters.push({ isPublished: true });
    }

    if (excludeSlug) {
      andFilters.push({ slug: { $ne: excludeSlug } });
    }

    if (excludeId) {
      andFilters.push({ _id: { $ne: excludeId } });
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      andFilters.push({
        $or: [
          { title: rx },
          { titleVi: rx },
          { excerpt: rx },
          { excerptVi: rx },
          { content: rx },
          { contentVi: rx },
          { tags: { $in: [rx] } },
        ],
      });
    }

    const filter =
      andFilters.length === 0
        ? {}
        : andFilters.length === 1
          ? andFilters[0]
          : { $and: andFilters };

    const skip = (page - 1) * limit;
    const sortObj = buildSort(sort);

    const [rawItems, total] = await Promise.all([
      PostModel.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      PostModel.countDocuments(filter),
    ]);

    const items = (rawItems as RawPostLike[]).map(normalizePostRecord);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error in getPosts:", error);
    return {
      items: [] as Post[],
      total: 0,
      page: 1,
      limit,
      pages: 0,
    };
  }
}

export async function getPostBySlug(
  slug: string,
  options: { publishedOnly?: boolean } = {}
): Promise<Post | null> {
  try {
    await connectDB();

    const filter: Record<string, any> = { slug };
    if (options.publishedOnly !== false) {
      filter.isPublished = true;
    }

    const rawPost = await PostModel.findOne(filter).lean();
    if (!rawPost) return null;

    return normalizePostRecord(rawPost as RawPostLike);
  } catch (error) {
    console.error("Error in getPostBySlug:", error);
    return null;
  }
}