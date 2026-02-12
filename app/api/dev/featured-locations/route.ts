// app/api/posts/featured-locations/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getAllFixedPosts } from "@/lib/fixed-posts/fixedPosts.service";

export async function GET() {
  try {
    await connectDB();
    const data = await getAllFixedPosts();
    return NextResponse.json(
      data.map((p: any) => ({
        ...p,
        id: p._id?.toString?.(),
        date: p.publishedAt ?? p.createdAt,
        thumbnail: p.coverImage ?? null,
      })),
      { status: 200 }
    );
  } catch (err) {
    console.error("[API] /posts/featured-locations", err);
    return NextResponse.json(
      { error: "Failed to load featured locations" },
      { status: 500 }
    );
  }
}
