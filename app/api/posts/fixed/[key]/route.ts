// app/api/posts/fixed/[key]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await connectDB();
    const { key } = await params;

    const doc =
      (await Post.findOne({
        fixedKey: new RegExp(`^${key}$`, "i"),
        isPublished: { $ne: false },
      }).lean()) ||
      (await Post.findOne({
        slug: new RegExp(`^${key}$`, "i"),
        isPublished: { $ne: false },
      }).lean());

    if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(doc, { status: 200 });
  } catch (err) {
    console.error("GET /api/posts/fixed/[key] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
