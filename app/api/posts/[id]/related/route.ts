// app/api/posts/[id]/related/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
// Nếu Post export default hãy dùng:  import Post from "@/models/Post.model";
import { Post } from "@/models/Post.model";
import { Types } from "mongoose";

/** Kiểu rút gọn cho bài hiện tại (đủ dùng trong route này) */
type CurrentPostLean = {
  _id: Types.ObjectId;
  slug: string;
  category?: string | string[];
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const idOrSlug = decodeURIComponent(id);

    // Cho phép truyền limit qua query (?limit=4)
    const { searchParams } = new URL(req.url);
    const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit") || "4")));

    // id có thể là ObjectId hoặc slug
    const byId =
      Types.ObjectId.isValid(idOrSlug) &&
      String(new Types.ObjectId(idOrSlug)) === idOrSlug;

    // Lấy bài hiện tại, chỉ cần _id/slug/category
    const current = await Post.findOne(byId ? { _id: idOrSlug } : { slug: idOrSlug })
      .select("_id slug category")
      .lean<CurrentPostLean>()
      .exec();

    if (!current) {
      return NextResponse.json([], { status: 200 });
    }

    // Chuẩn hoá category thành mảng để query $in an toàn
    const categories = Array.isArray(current.category)
      ? current.category
      : current.category
      ? [current.category]
      : [];

    // Query: khác _id hiện tại, đã publish, cùng category (nếu có)
    const query: any = {
      _id: { $ne: current._id },
      isPublished: { $ne: false },
    };
    if (categories.length) {
      query.category = { $in: categories };
    }

    const related = await Post.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      // ✅ chọn thêm price/type/storeCategory để FE có thể hiển thị giá khi là bài trong Cửa hàng
      .select(
        "slug title excerpt thumbnail coverImage category createdAt publishedAt price type storeCategory"
      )
      .lean();

    // Chuẩn hoá dữ liệu trả về cho frontend
    const data = related.map((p: any) => ({
      ...p,
      id: p._id?.toString?.(),
      date: p.publishedAt ?? p.createdAt,
      thumbnail: p.thumbnail ?? p.coverImage ?? null,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[API] /posts/[id]/related", err);
    return NextResponse.json(
      { error: "Failed to load related posts" },
      { status: 500 }
    );
  }
}
