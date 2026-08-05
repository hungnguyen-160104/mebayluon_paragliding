import { NextResponse } from "next/server";
import { getPosts } from "@/lib/posts-data";

/**
 * GET /api/post-cards?category=&sub=&skip=&limit=&lang=&exclude=
 *
 * Endpoint công khai, TRẢ VỀ BẢN NHẸ (chỉ tiêu đề/mô tả/ảnh/ngày — không có
 * content) cho nút "Xem thêm" ở /blog và /knowledge. Trang server chỉ render
 * 25 bài đầu; mỗi lần bấm nút, client gọi endpoint này lấy thêm 15 bài.
 *
 * - category: "knowledge" (mặc định) hoặc "news"
 * - sub:      chuyên mục con của knowledge ("all" = tất cả)
 * - exclude:  slug cần loại (bài đang ghim đã render sẵn trên trang)
 */

const LANGS = ["vi", "en", "fr", "ru", "zh", "hi"] as const;
type Lang = (typeof LANGS)[number];

const CATEGORIES = ["knowledge", "news"] as const;

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInlineText(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function pickTitle(post: any, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: any, isVietnamese: boolean) {
  if (isVietnamese) {
    if (post.excerptVi?.trim()) return normalizeInlineText(post.excerptVi);
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
  }

  if (post.excerpt?.trim()) return normalizeInlineText(post.excerpt);
  const text = stripHtml(post.content || post.contentVi || "");
  return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryRaw = (searchParams.get("category") || "knowledge").toLowerCase();
    const category = (CATEGORIES as readonly string[]).includes(categoryRaw)
      ? categoryRaw
      : "knowledge";

    const subRaw = (searchParams.get("sub") || "all").toLowerCase();
    const sub = category === "knowledge" && subRaw !== "all" ? subRaw : undefined;

    // Nhiều slug ngăn cách bởi dấu phẩy (các bài đang ghim ở đầu trang)
    const exclude = (searchParams.get("exclude") || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10) || 0);
    const limit = Math.min(
      30,
      Math.max(1, parseInt(searchParams.get("limit") || "15", 10) || 15)
    );

    const langRaw = String(searchParams.get("lang") || "vi").slice(0, 2);
    const lang: Lang = (LANGS as readonly string[]).includes(langRaw)
      ? (langRaw as Lang)
      : "vi";
    const isVi = lang === "vi";

    const data = await getPosts({
    forList: true,
      category,
      subCategory: sub,
      isPublished: true,
      excludeSlug: exclude.length ? exclude : undefined,
      skip,
      limit,
      sort: "-publishedAt,-createdAt",
    });

    // Chỉ gửi những trường thẻ bài viết cần — giữ payload nhỏ.
    // Ưu tiên ảnh giống trang server render: blog dùng coverImage trước,
    // knowledge dùng thumbnail trước.
    const items = (data.items || []).map((p: any) => ({
      slug: p.slug,
      title: pickTitle(p, isVi),
      excerpt: pickExcerpt(p, isVi),
      cover:
        category === "news"
          ? p.coverImage || p.thumbnail || "/images/mebayluon.jpg"
          : p.thumbnail || p.coverImage || "/images/mebayluon.jpg",
      date: p.publishedAt || p.createdAt || null,
    }));

    return NextResponse.json({ items, total: data.total ?? 0 });
  } catch (err) {
    console.error("GET /api/post-cards error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
