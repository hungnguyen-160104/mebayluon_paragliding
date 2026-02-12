// services/product.service.ts
import { Types } from "mongoose";
import { Post } from "@/models/Post.model"; // dùng chung Post model cho cả product
import { toSlug } from "@/utils/slug";
import { estimateReadTime } from "@/utils/readTime";

/** ===== Types ===== */
export type ProductInput = {
  title: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  language?: string;
  slug?: string;
  isPublished?: boolean;
  // product-specific
  storeCategory?: string;
  price?: number;
  author?: string;
};

/** ===== Query / List ===== */
export async function listProducts(query: any = {}) {
  const {
    page = 1,
    limit = 20,
    q,
    lang,
    published,
    sort = "-createdAt",
    storeCategory,
  } = query;

  const filter: any = { type: "product" };
  if (q) {
    filter.$or = [
      { title: new RegExp(String(q), "i") },
      { content: new RegExp(String(q), "i") },
      { tags: { $in: [new RegExp(String(q), "i")] } },
    ];
  }
  if (lang) filter.language = String(lang);
  if (storeCategory) filter.storeCategory = String(storeCategory);
  if (published === "true") filter.isPublished = true;
  if (published === "false") filter.isPublished = false;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

  const [items, total] = await Promise.all([
    Post.find(filter).sort(sort as any).skip((pageNum - 1) * limitNum).limit(limitNum),
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

export async function getProductBySlug(slug: string) {
  return Post.findOne({ type: "product", slug });
}

/** ===== Mutations ===== */
export async function createProduct(data: ProductInput, _auth?: any) {
  const baseSlug = (data.slug?.trim() || toSlug(data.title)).toLowerCase();
  let slug = baseSlug;
  let n = 1;
  while (await Post.exists({ slug })) {
    slug = `${baseSlug}-${n++}`;
  }

  const readTime = estimateReadTime(data.content || "");
  const doc = await Post.create({
    // chung
    title: data.title,
    slug,
    content: data.content,
    coverImage: data.coverImage,
    author: data.author || "Admin",
    tags: data.tags,
    language: data.language || "vi",
    readTime,
    isPublished: data.isPublished ?? true,

    // product-specific
    type: "product",
    category: "store", // để FE cũ/fallback lọc được
    storeCategory: data.storeCategory,
    price: data.price,
  });

  return doc;
}

export async function updateProduct(id: string, data: Partial<ProductInput>, _auth?: any) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }

  const patch: any = { ...data };

  // Nếu đổi title mà không truyền slug, tự cập nhật slug
  if (patch.title && !patch.slug) {
    const baseSlug = toSlug(patch.title);
    let next = baseSlug;
    let n = 1;
    while (await Post.exists({ slug: next, _id: { $ne: id } })) {
      next = `${baseSlug}-${n++}`;
    }
    patch.slug = next;
  }

  if (typeof patch.content === "string") {
    patch.readTime = estimateReadTime(patch.content);
  }

  const updated = await Post.findOneAndUpdate(
    { _id: id, type: "product" },
    patch,
    { new: true }
  );
  if (!updated) {
    const err: any = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return updated;
}

export async function deleteProduct(id: string, _auth?: any) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }
  const removed = await Post.findOneAndDelete({ _id: id, type: "product" });
  if (!removed) {
    const err: any = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return { ok: true, id };
}

export async function publishProduct(
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

  const updated = await Post.findOneAndUpdate(
    { _id: id, type: "product" },
    { isPublished },
    { new: true }
  );
  if (!updated) {
    const err: any = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return updated;
}
