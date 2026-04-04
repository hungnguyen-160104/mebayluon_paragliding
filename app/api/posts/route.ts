import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { listPosts, createPost } from "@/services/post.service";
import { requireAuth } from "@/middlewares/requireAuth";

// GET /api/posts
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    const result = await listPosts(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/posts (admin only)
export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const body = await req.json();
    const created = await createPost(body, auth);

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/posts error:", err);

    const status = err?.status || 500;
    const message = err?.message || "Internal Server Error";

    return NextResponse.json({ message }, { status });
  }
}