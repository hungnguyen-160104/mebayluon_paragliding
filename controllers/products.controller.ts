import { Request, Response } from "express";
import { Post } from "../models/Post.model";
import { createProduct } from "../services/product.service";
import { estimateReadTime } from "../utils/readTime";
import { toSlug } from "../utils/slug";

const STORE_SET = new Set([
  "thiet-bi-bay",
  "phu-kien",
  "sach-du-luon",
  "khoa-hoc-du-luon",
]);

// GET /api/products
export async function listProducts(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
  const skip = (page - 1) * limit;

  const { search, storeCategory, lang, status } = req.query as any;

  const q: any = { type: "product" };
  if (search) q.title = { $regex: search, $options: "i" };
  if (storeCategory) q.storeCategory = storeCategory;
  if (lang) q.language = lang;
  if (status === "draft") q.isPublished = false;
  if (status === "published") q.isPublished = true;

  const [items, total] = await Promise.all([
    Post.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments(q),
  ]);

  res.json({ page, limit, total, items });
}

// GET /api/products/:slug
export async function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const doc = await Post.findOne({ type: "product", slug });
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
}

// POST /api/products
export async function createProductCtrl(req: Request, res: Response) {
  const { title, content, storeCategory, price } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ message: "Missing title or content" });
  }
  if (!STORE_SET.has(String(storeCategory))) {
    return res.status(400).json({ message: "Invalid storeCategory" });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ message: "Invalid price" });
  }

  const doc = await createProduct({
    ...req.body,
    storeCategory,
    price: priceNum,
  });

  res.status(201).json(doc);
}

// PATCH /api/products/:id
export async function updateProduct(req: Request, res: Response) {
  const data: any = { ...req.body };

  if (data.title && !data.slug) data.slug = toSlug(data.title);
  if (typeof data.content === "string")
    data.readTime = estimateReadTime(data.content);

  // Nếu client gửi storeCategory/price => validate nhanh
  if (data.storeCategory && !STORE_SET.has(String(data.storeCategory))) {
    return res.status(400).json({ message: "Invalid storeCategory" });
  }
  if (data.price != null) {
    const priceNum = Number(data.price);
    if (!Number.isFinite(priceNum) || priceNum < 0)
      return res.status(400).json({ message: "Invalid price" });
    data.price = priceNum;
  }

  const doc = await Post.findByIdAndUpdate(
    req.params.id,
    { $set: data },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
}

// DELETE /api/products/:id
export async function deleteProduct(req: Request, res: Response) {
  const doc = await Post.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted", id: doc.id });
}

// PATCH /api/products/:id/publish
export async function publishProduct(req: Request, res: Response) {
  const { isPublished } = req.body || {};
  const doc = await Post.findByIdAndUpdate(
    req.params.id,
    { isPublished: !!isPublished },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
}
