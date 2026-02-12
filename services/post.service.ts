// services/post.service.ts
import { Types } from "mongoose";
import { Post } from "@/models/Post.model";
import { toSlug } from "@/utils/slug";
import { estimateReadTime } from "@/utils/readTime";

/** ===== Types ===== */
export type PostInput = {
  title: string;
  content?: string;
  coverImage?: string;
  author?: string;
  category?: string;
  tags?: string[];
  language?: string;
  slug?: string;
  isPublished?: boolean;
};

/** ===== Queries / Lists ===== */
export async function listPosts(query: any = {}) {
  const {
    page = 1,
    limit = 20,
    q,
    lang,
    published,
    sort = "-createdAt",
    category,
    subCategory, // 👈 thêm
  } = query;

  const filter: any = {};

  if (q) {
    const rx = new RegExp(String(q), "i");
    filter.$or = [
      { title: rx },
      { content: rx },
      { tags: { $in: [rx] } },
    ];
  }

  if (lang) filter.language = String(lang);
  if (category) filter.category = String(category);
  if (subCategory) filter.subCategory = String(subCategory); // 👈 thêm

  if (published === "true") filter.isPublished = true;
  if (published === "false") filter.isPublished = false;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort(sort as any)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Post.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  };
}

export async function getPostBySlug(slug: string) {
  return Post.findOne({ slug });
}

export async function getPostById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return Post.findById(id);
}

/** ===== Mutations ===== */
export async function addView(slug: string) {
  return Post.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true, upsert: false }
  );
}

export async function createPost(data: PostInput, _auth?: any) {
  const baseSlug = (data.slug?.trim() || toSlug(data.title)).toLowerCase();
  let slug = baseSlug;
  let n = 1;

  while (await Post.exists({ slug })) {
    slug = `${baseSlug}-${n++}`; // ✅ fix template string
  }

  const readTime = estimateReadTime(data.content || "");
  const doc = await Post.create({
    title: data.title,
    slug,
    content: data.content,
    coverImage: data.coverImage,
    author: data.author,
    category: data.category,
    tags: data.tags,
    language: data.language || "vi",
    readTime,
    isPublished: data.isPublished ?? true,
    views: 0,
  });

  return doc;
}

export async function updatePost(id: string, data: Partial<PostInput>, _auth?: any) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }

  const patch: any = { ...data };

  // Tự tính slug mới nếu đổi title mà chưa truyền slug
  if (patch.title && !patch.slug) {
    const baseSlug = toSlug(patch.title);
    let slug = baseSlug;
    let n = 1;
    while (await Post.exists({ slug, _id: { $ne: id } })) {
      slug = `${baseSlug}-${n++}`; // ✅ fix template string
    }
    patch.slug = slug;
  }

  if (typeof patch.content === "string") {
    patch.readTime = estimateReadTime(patch.content);
  }

  const updated = await Post.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }
  return updated;
}

export async function deletePost(id: string, _auth?: any) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }
  const deleted = await Post.findByIdAndDelete(id);
  if (!deleted) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }
  return { ok: true, id };
}

export async function publishPost(
  id: string,
  body: { isPublished?: boolean } = {},
  _auth?: any
) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }

  const isPublished = body.isPublished ?? true;
  const updated = await Post.findByIdAndUpdate(
    id,
    { isPublished },
    { new: true }
  );

  if (!updated) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }
  return updated;
}
