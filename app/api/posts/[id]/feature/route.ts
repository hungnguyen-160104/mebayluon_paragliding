import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";
import { requireAuth } from "@/middlewares/requireAuth";

/**
 * PATCH /api/posts/[id]/feature   body: { featured: boolean }
 *
 * Tick / bỏ tick "hiển thị đầu trang" cho một bài — dùng cho nút ghim trong
 * trang quản trị. Tách khỏi PUT /api/posts/[id] vì endpoint đó nhận cả bài
 * (title, content...) trong khi ở đây chỉ đổi đúng một cờ.
 *
 * Quy tắc:
 * - Tối đa MAX_FEATURED bài ghim TRONG CÙNG category (news/knowledge/store) —
 *   quá thì trả 400 kèm thông báo tiếng Việt để admin bỏ bớt bài cũ.
 * - `featuredAt` ghi thời điểm tick; trang công khai xếp bài ghim theo thứ
 *   tự tick (tick trước đứng trước).
 */

const MAX_FEATURED = 6;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const featured = Boolean(body?.featured);

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { message: "Không tìm thấy bài viết" },
        { status: 404 }
      );
    }

    if (featured && !post.fixed) {
      const count = await Post.countDocuments({
        fixed: true,
        category: post.category,
        _id: { $ne: post._id },
      });

      if (count >= MAX_FEATURED) {
        return NextResponse.json(
          {
            message: `Đã đủ ${MAX_FEATURED} bài ghim trong mục này. Bỏ ghim một bài khác trước khi thêm.`,
          },
          { status: 400 }
        );
      }
    }

    post.fixed = featured;
    post.featuredAt = featured ? new Date() : null;
    await post.save();

    return NextResponse.json({
      ok: true,
      id: String(post._id),
      fixed: post.fixed,
      featuredAt: post.featuredAt,
    });
  } catch (err) {
    console.error("PATCH /api/posts/[id]/feature error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
