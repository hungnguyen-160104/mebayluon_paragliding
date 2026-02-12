// lib/posts-data.ts
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";
import type { SortOrder } from "mongoose";

interface GetPostsOptions {
  category?: string;
  subCategory?: string;
  isPublished?: boolean;
  fixed?: boolean;
  fixedKey?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

function buildSort(s?: string): string | [string, SortOrder][] | Record<string, SortOrder> {
  const v = (s ?? "-publishedAt,-createdAt").trim();
  if (v.includes(",")) {
    return v.split(",").map(f => f.trim()).filter(Boolean)
      .map<[string, SortOrder]>(f => f.startsWith("-") ? [f.slice(1), "desc"] : [f, "asc"]);
  }
  if (v.startsWith("-")) return { [v.slice(1)]: "desc" };
  return { [v]: "asc" };
}

export async function getPosts(options: GetPostsOptions = {}) {
  const {
    category,
    subCategory,
    isPublished = true,
    fixed,
    fixedKey,
    page = 1,
    limit = 12,
    sort = "-publishedAt,-createdAt",
  } = options;

  try {
    await connectDB();

    const filter: Record<string, any> = {};

    if (category) {
      filter.category = new RegExp(`^${category}$`, "i");
    }

    if (subCategory && subCategory !== "all") {
      filter.subCategory = new RegExp(`^${subCategory}$`, "i");
    }

    if (isPublished) {
      filter.$and = [
        { isPublished: { $ne: false } },
        { status: { $not: /^draft$/i } },
      ];
    }

    if (fixed === true) {
      filter.isFixed = true;
    } else if (fixed === false) {
      filter.$or = [{ isFixed: { $ne: true } }, { isFixed: { $exists: false } }];
    }

    if (fixedKey) {
      filter.fixedKey = fixedKey;
    }

    const skip = (page - 1) * limit;
    const sortObj = buildSort(sort);

    const [items, total] = await Promise.all([
      Post.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Post.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  } catch (error) {
    console.error("Error in getPosts:", error);
    return { items: [], total: 0, page: 1, limit };
  }
}

export async function getPostBySlug(slug: string) {
  try {
    await connectDB();
    const post = await Post.findOne({ slug }).lean();
    return post;
  } catch (error) {
    console.error("Error in getPostBySlug:", error);
    return null;
  }
}
