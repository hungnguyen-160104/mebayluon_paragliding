import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";

/** Lấy base URL tuyệt đối từ env hoặc từ header (ưu tiên cổng bạn đang chạy) */
function getBaseFromReq(req: Request) {
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (env) return env;

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host  = req.headers.get("x-forwarded-host")
            || req.headers.get("host")
            || "localhost:8080";
  return `${proto}://${host}`;
}

function absolutize(base: string, src?: string | null) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${base}${src}`;
  return `${base}/${src}`;
}

function firstImageFromContent(html?: string | null) {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] || null;
}

function buildExcerpt(excerpt?: string | null, content?: string | null) {
  if (excerpt) return excerpt;
  const text = String(content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 140);
}

/**
 * GET /api/posts/recent?limit=3&lang=vi
 * Trả về mảng các bài viết mới nhất (đã publish) kèm thumbnail là URL tuyệt đối.
 */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit") || "3")));
    const lang = searchParams.get("lang") || undefined;

    const q: any = { isPublished: { $ne: false } };
    if (lang) q.language = lang;

    const items = await Post.find(q)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .select("slug title excerpt content thumbnail coverImage createdAt publishedAt")
      .lean();

    const base = getBaseFromReq(req);

    const data = items.map((p: any) => {
      const rawThumb =
        p.thumbnail || p.coverImage || firstImageFromContent(p.content);
      return {
        id: p._id?.toString?.(),
        slug: p.slug,
        title: p.title,
        date: p.publishedAt ?? p.createdAt,
        thumbnail: absolutize(base, rawThumb), // luôn trả về URL tuyệt đối
        excerpt: buildExcerpt(p.excerpt, p.content),
      };
    });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[API] /posts/recent", err);
    return NextResponse.json({ error: "Failed to load recent posts" }, { status: 500 });
  }
}
