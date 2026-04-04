import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { publishPost } from "@/services/post.service";
import { requireAuth } from "@/middlewares/requireAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/posts/:id/publish
// body: { isPublished: boolean }
export async function PATCH(req: Request, context: RouteContext) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const updated = await publishPost(
      id,
      { isPublished: body?.isPublished ?? true },
      auth
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/posts/[id]/publish error:", err);

    const status = err?.status || 500;
    const message = err?.message || "Internal Server Error";

    return NextResponse.json({ message }, { status });
  }
}