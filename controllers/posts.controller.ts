// controllers/posts.controller.ts
import type { Request, Response } from "express";
import { Post } from "@/models/Post.model";
import { createPost } from "@/services/post.service";
import { estimateReadTime } from "@/utils/readTime";
import { toSlug } from "@/utils/slug";

/** ================================
 *  📄 Lấy danh sách bài viết (REST)
 *  ================================ */
export async function listPosts(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const skip = (page - 1) * limit;

    const {
      search,
      tag,
      category,
      lang,
      status,
      type,
      storeCategory,
      subCategory, // ✅ thêm
    } = req.query as any;

    const q: any = {};
    if (search) q.title = { $regex: String(search), $options: "i" };
    if (tag) q.tags = { $in: [String(tag)] };
    if (category) q.category = String(category);
    if (type) q.type = String(type);
    if (storeCategory) q.storeCategory = String(storeCategory);
    if (subCategory) q.subCategory = String(subCategory); // ✅ filter theo tiểu mục kiến thức
    if (lang) q.language = String(lang);
    if (status === "draft") q.isPublished = false;
    if (status === "published") q.isPublished = true;

    const [items, total] = await Promise.all([
      Post.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments(q),
    ]);

    res.json({ page, limit, total, items });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** ================================
 *  📄 Lấy bài viết theo ID (REST)
 *  ================================ */
export async function getPostById(req: Request, res: Response) {
  try {
    const doc = await Post.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** =================================
 *  📄 Lấy bài viết theo slug (REST)
 *  ================================= */
export async function getPostBySlug(req: Request, res: Response) {
  try {
    const doc = await Post.findOne({ slug: req.params.slug });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** ===============================
 *  🆕 Tạo bài viết mới (REST)
 *  =============================== */
export async function createPostCtrl(req: Request, res: Response) {
  try {
    const { title, content } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ message: "Missing title or content" });
    }
    const doc = await createPost(req.body);
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** ===============================
 *  ✏️ Cập nhật bài viết (REST)
 *  =============================== */
export async function updatePost(req: Request, res: Response) {
  try {
    const data: any = { ...req.body };

    if (typeof data.title === "string" && !data.slug) {
      data.slug = toSlug(data.title);
    }
    if (typeof data.content === "string") {
      data.readTime = estimateReadTime(data.content);
    }

    const doc = await Post.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** ===============================
 *  🗑️ Xóa bài viết (REST)
 *  =============================== */
export async function deletePost(req: Request, res: Response) {
  try {
    const doc = await Post.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted", id: doc.id });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** ==========================================
 *  ✅ Xuất bản / hủy xuất bản bài viết (REST)
 *  ========================================== */
export async function publishPost(req: Request, res: Response) {
  try {
    const { isPublished } = req.body || {};
    const doc = await Post.findByIdAndUpdate(
      req.params.id,
      { isPublished: !!isPublished },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}

/** ==========================================
 *  👁️‍🗨️ Tăng lượt xem (theo slug) (REST)
 *  ========================================== */
export async function addView(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const doc = await Post.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ slug: doc.slug, views: doc.views });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
}
