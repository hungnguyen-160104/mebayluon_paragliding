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
    const result = await addView(slug);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/posts/slug/[slug]/view error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
