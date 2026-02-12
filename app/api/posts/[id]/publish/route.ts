// app/api/posts/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { publishPost } from "@/services/post.service";
import { requireAuth } from "@/middlewares/requireAuth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // 401

  try {
    await connectDB();
    const { id } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}
    const result = await publishPost(id, body, auth);
    return NextResponse.json(result);
  } catch (err) {
    console.error("PATCH /api/posts/[id]/publish error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
