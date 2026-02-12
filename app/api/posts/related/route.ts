// app/api/posts/related/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
// Nếu Post export default:  import Post from "@/models/Post.model";
import { Post } from "@/models/Post.model";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Query inputs
    const category = String(searchParams.get("category") || "");
    const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit") || "4")));

    // Cho phép truyền nhiều exclude (?excludeSlug=a&excludeSlug=b)
    const excludeSlugs = searchParams.getAll("excludeSlug").filter(Boolean);
    const excludeIds = searchParams.getAll("excludeId").filter(Boolean);

    // Base filter
    const q: any = { isPublished: { $ne: false } };
    if (category) q.category = category;
    if (excludeIds.length) q._id = { $nin: excludeIds };
    if (excludeSlugs.length) q.slug = { $nin: excludeSlugs };

    const posts = await Post.find(q)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      // ✅ THÊM price, type, storeCategory để FE có thể hiển thị giá
      .select(
        "slug title excerpt thumbnail coverImage category createdAt publishedAt price type storeCategory"
      )
      .lean();

    const data = posts.map((p: any) => ({
      ...p,
      id: p._id?.toString?.(),
      date: p.publishedAt ?? p.createdAt,
      thumbnail: p.thumbnail ?? p.coverImage ?? null,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[API] /posts/related", err);
    return NextResponse.json(
      { error: "Failed to load related posts" },
      { status: 500 }
    );
  }
}
