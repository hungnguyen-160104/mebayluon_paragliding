// lib/fixed-posts/fixedPosts.service.ts
import { Types } from "mongoose";
import { Post } from "@/models/Post.model";
import { FIXED_POSTS, FIXED_ORDER } from "./fixedPosts.config";

/** Seed 6 bài cố định nếu chưa có */
export async function seedFixedPosts() {
  for (const item of FIXED_POSTS) {
    const exists = await Post.findOne({ fixedKey: item.key }).lean();
    if (!exists) {
      await Post.create({
        title: item.title,
        slug: item.key,         // slug = fixedKey (không đổi)
        fixedKey: item.key,
        isFixed: true,
        category: "news",
        isPublished: true,
        publishedAt: new Date(),
        content: `<p>Cập nhật nội dung cho <strong>${item.title}</strong>…</p>`,
        language: "vi",
      });
    }
  }
}

/** Kiểm tra một bài có phải bài cố định không (chấp nhận id hoặc slug) */
export async function isFixedPost(idOrSlug: string): Promise<boolean> {
  const byId = Types.ObjectId.isValid(idOrSlug);
  const cond = byId ? { _id: idOrSlug } : { slug: idOrSlug };
  const doc = await Post.findOne(cond).select("isFixed").lean();
  return !!doc?.isFixed;
}

/** Loại bỏ các field không được phép sửa trên bài cố định */
export function sanitizeUpdateForFixedPost(patch: Record<string, any>) {
  if (!patch) return {};
  const clean = { ...patch };
  delete clean.slug;
  delete clean.fixedKey;
  return clean;
}

/** Trả về 6 bài cố định theo thứ tự định nghĩa trong FIXED_POSTS */
export async function getAllFixedPosts() {
  const keys = FIXED_POSTS.map((p) => p.key);
  const items = await Post.find({
    fixedKey: { $in: keys },
    isPublished: { $ne: false },
  })
    .select("slug title excerpt coverImage fixedKey createdAt publishedAt")
    .lean();

  // Sắp xếp theo thứ tự cấu hình (not lexicographic)
  return items.sort((a: any, b: any) => {
    const ia = FIXED_ORDER.get(a.fixedKey) ?? 999;
    const ib = FIXED_ORDER.get(b.fixedKey) ?? 999;
    return ia - ib;
  });
}
