import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";
import { Types } from "mongoose";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/** Kiểu rút gọn cho những trường ta cần dùng khi lean() */
type PostLeanBase = {
  _id: Types.ObjectId;
  slug?: string;
  isFixed?: boolean;
  fixedKey?: string | null;
  publishedAt?: Date | null;
};

/** ObjectId “chuẩn” (không mơ hồ) */
function isObjectIdStrict(v: string): boolean {
  return Types.ObjectId.isValid(v) && String(new Types.ObjectId(v)) === v;
}

/** Chuyển chuỗi có dấu -> slug, đủ dùng */
function slugifyVN(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/** Tạo slug duy nhất khi cập nhật */
async function ensureUniqueSlug(base: string, excludeId?: string) {
  const root = slugifyVN(base) || `post-${Date.now().toString(36)}`;
  let candidate = root;
  let i = 1;
  // nếu đã tồn tại, nối đuôi -1, -2, ...
  // excludeId để không tự “đụng” chính mình
  while (
    await Post.exists(
      excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate }
    )
  ) {
    candidate = `${root}-${i++}`;
  }
  return candidate;
}

/** Chuẩn hoá boolean từ string */
function toBool(v: unknown): boolean | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "published", "public"].includes(s)) return true;
  if (["false", "0", "no", "n", "off", "draft"].includes(s)) return false;
  return undefined;
}

/* =================================================================== */
/* GET /api/posts/[id] — id có thể là ObjectId hoặc slug              */
/* =================================================================== */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const idOrSlug = id;
    const cond = isObjectIdStrict(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

    const doc = await Post.findOne(cond).lean<PostLeanBase & Record<string, any>>();
    if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(doc, { status: 200 });
  } catch (err) {
    console.error("GET /api/posts/[id] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/* =================================================================== */
/* PUT /api/posts/[id] — cập nhật; chặn đổi slug/fixedKey nếu isFixed */
/* =================================================================== */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const idOrSlug = id;
    const cond = isObjectIdStrict(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

    // chỉ lấy các trường cần cho logic bảo vệ
    const current = await Post.findOne(cond)
      .select("_id slug isFixed publishedAt fixedKey")
      .lean<PostLeanBase>();
    if (!current) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const patch: Record<string, any> = await req.json().catch(() => ({}));

    // isPublished có thể được gửi dạng string
    if (typeof patch.isPublished === "string") {
      const b = toBool(patch.isPublished);
      if (b !== undefined) patch.isPublished = b;
    }

    // Nếu là bài cố định: không cho đổi slug và fixedKey
    if (current.isFixed) {
      delete patch.slug;
      delete patch.fixedKey;
    }

    // Xử lý publishedAt theo isPublished
    if (typeof patch.isPublished === "boolean") {
      if (patch.isPublished === false) {
        patch.publishedAt = null;
      } else if (!current.publishedAt && !patch.publishedAt) {
        patch.publishedAt = new Date();
      }
    }

    // Nếu có yêu cầu đổi slug (và bài KHÔNG phải fixed)
    if (patch.slug && !current.isFixed && patch.slug !== current.slug) {
      patch.slug = await ensureUniqueSlug(String(patch.slug), String(current._id));
    }

    try {
      const updated = await Post.findByIdAndUpdate(current._id, patch, { new: true });
      if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });
      return NextResponse.json(updated, { status: 200 });
    } catch (err: any) {
      // lỗi unique fixedKey (đã có bài cố định khác dùng cùng fixedKey)
      if (err?.code === 11000 && err?.keyPattern?.fixedKey) {
        return NextResponse.json(
          { message: "fixedKey đã được dùng cho một bài cố định khác." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("PUT /api/posts/[id] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/* =================================================================== */
/* DELETE /api/posts/[id] — chặn xoá nếu là bài cố định               */
/* =================================================================== */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const idOrSlug = id;
    const cond = isObjectIdStrict(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

    const doc = await Post.findOne(cond).select("_id isFixed").lean<PostLeanBase>();
    if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (doc.isFixed) {
      return NextResponse.json(
        { message: "Không thể xoá bài viết cố định." },
        { status: 403 }
      );
    }

    await Post.findByIdAndDelete(doc._id);
    return NextResponse.json({ ok: true, id: String(doc._id) }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/posts/[id] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
