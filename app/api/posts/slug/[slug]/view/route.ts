// app/api/posts/slug/[slug]/view/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { addView } from "@/services/post.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { message: "Invalid slug parameter" },
        { status: 400 }
      );
    }

    const result = await addView(slug);

    if (!result) {
      return NextResponse.json(
        { message: "Post not found", slug },
        { status: 404 }
      );
    }

    return NextResponse.json({
      slug: result.slug,
      views: result.views || 0,
      success: true,
    });
  } catch (err) {
    console.error("POST /api/posts/slug/[slug]/view error:", err);
    return NextResponse.json(
      { message: "Internal Server Error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

