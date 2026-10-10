// lib/checkin-map-published.ts
/**
 * BÀI VIẾT ĐÃ ĐĂNG của các điểm trên bản đồ check-in (chỉ dùng phía máy chủ).
 *
 * lib/checkin-map khai sẵn slug bài cho đủ 18 điểm (CK_ARTICLES), kể cả bài
 * CHƯA đăng. Hàm này hỏi DB một lần — find theo chỉ mục `slug`, chỉ lấy trường
 * slug (18 bản ghi vài trăm byte) — rồi trả về đúng những điểm có bài đang
 * `isPublished`. Trang /spots/khau-pha truyền kết quả vào <CheckinMap articles>.
 *
 * → Bảng tên chỉ thành link khi bài THẬT SỰ đã đăng: đăng 15 bài xong link tự
 *   hiện, gỡ một bài thì link bài đó tự mất, không phải sửa code hay deploy lại.
 *
 * Trang /spots/<slug> render động theo từng request (đọc cookie ngôn ngữ) và
 * các dữ liệu DB khác của trang (lib/spot-hub.ts) cũng đọc thẳng mỗi lượt, nên
 * ở đây không thêm tầng cache riêng — cache() chỉ gộp các lời gọi trong cùng
 * một request.
 */
import { cache } from "react";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import { CK_ARTICLES, CK_ARTICLES_FALLBACK, type CkStopId } from "@/lib/checkin-map";
import { CK_HUB_SLUG } from "@/lib/checkin-map/embed";

/** Một truy vấn theo chỉ mục slug cho 18 bài điểm + bài trụ; cache() gộp các lời gọi trong cùng một request. */
export const getCheckinLinks = cache(async function getCheckinLinks(): Promise<{
  stops: Partial<Record<CkStopId, string>>;
  /** Bài trụ "Bản đồ du lịch … 18 điểm check-in" đã đăng. */
  hub: boolean;
}> {
  try {
    await connectDB();
    const rows = await PostModel.find({ slug: { $in: [...Object.values(CK_ARTICLES), CK_HUB_SLUG] }, isPublished: true })
      .select({ slug: 1, _id: 0 })
      .lean();
    const daDang = new Set(rows.map((r) => String((r as { slug?: unknown }).slug)));
    const stops: Partial<Record<CkStopId, string>> = {};
    for (const [id, slug] of Object.entries(CK_ARTICLES) as [CkStopId, string][]) {
      if (daDang.has(slug)) stops[id] = slug;
    }
    return { stops, hub: daDang.has(CK_HUB_SLUG) };
  } catch (error) {
    console.error("Error in getCheckinLinks:", error);
    return { stops: CK_ARTICLES_FALLBACK, hub: false };
  }
});

/** Mã điểm → slug bài ĐÃ ĐĂNG. */
export async function getPublishedCheckinArticles(): Promise<Partial<Record<CkStopId, string>>> {
  return (await getCheckinLinks()).stops;
}
