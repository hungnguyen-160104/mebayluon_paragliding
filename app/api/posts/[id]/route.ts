import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getPostById,
  updatePost,
  deletePost,
} from "@/services/post.service";
import { requireAuth } from "@/middlewares/requireAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/posts/:id
export async function GET(_req: Request, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (err) {
    console.error("GET /api/posts/[id] error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/posts/:id (admin only)
export async function PUT(req: Request, context: RouteContext) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    const updated = await updatePost(id, body, auth);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/posts/[id] error:", err);

    const status = err?.status || 500;
    const message = err?.message || "Internal Server Error";

    return NextResponse.json({ message }, { status });
  }
}

// DELETE /api/posts/:id (admin only)
export async function DELETE(req: Request, context: RouteContext) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const { id } = await context.params;
    const result = await deletePost(id, auth);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /api/posts/[id] error:", err);

    const status = err?.status || 500;
    const message = err?.message || "Internal Server Error";

    return NextResponse.json({ message }, { status });
  }
}