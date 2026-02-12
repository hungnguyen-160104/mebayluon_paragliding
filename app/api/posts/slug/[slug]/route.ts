// app/api/posts/slug/[slug]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getPostBySlug } from "@/services/post.service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }   // 👈 Promise
) {
  try {
    await connectDB();
    const { slug } = await ctx.params;         // 👈 await
    const post = await getPostBySlug(slug);
    if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (err) {
    console.error("GET /api/posts/slug/[slug] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
