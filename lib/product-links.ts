// lib/product-links.ts
/**
 * Link nội bộ /blog/<slug sản phẩm> → /store/<danh mục>/<slug> (SEO 01/10/2026).
 *
 * Sản phẩm cửa hàng (sách, khoá học) cũng là bản ghi trong bảng posts nên mở
 * được bằng /blog/<slug>; nay URL đó chuyển 308 sang trang cửa hàng (app/blog/
 * [slug]/page.tsx). Vài bài (và chính trang sản phẩm) vẫn link dạng /blog/…
 * trong nội dung lưu ở DB — viết lại lúc render để link đi thẳng tới đích,
 * không qua một bước chuyển hướng. Không sửa dữ liệu trong DB.
 */
import { unstable_cache } from "next/cache";

import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";

export type ProductPathMap = Record<string, string>;

/** slug sản phẩm → "/store/<danh mục>/<slug>". Lưu đệm 10 phút; lỗi DB → {}. */
export const getProductPathMap = unstable_cache(
  async (): Promise<ProductPathMap> => {
    try {
      await connectDB();
      const rows = await PostModel.find({ type: "product" })
        .select("slug storeCategory")
        .lean<{ slug?: string; storeCategory?: string }[]>();
      const map: ProductPathMap = {};
      for (const r of rows) {
        if (r.slug) map[r.slug] = `/store/${r.storeCategory || "all"}/${r.slug}`;
      }
      return map;
    } catch (error) {
      console.error("[product-links] load failed:", error);
      return {};
    }
  },
  ["product-path-map"],
  { revalidate: 600, tags: ["posts"] },
);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Viết lại mọi "/blog/<slug sản phẩm>" trong một chuỗi (HTML hay JSON khối
 * nội dung), giữ nguyên tên miền và tiền tố ngôn ngữ đứng trước nếu có.
 */
export function rewriteProductLinks(text: string, map: ProductPathMap): string {
  const slugs = Object.keys(map);
  if (!text || slugs.length === 0) return text;
  const re = new RegExp(
    `((?:https?:\\/\\/(?:www\\.)?mebayluon\\.com)?(?:\\/(?:en|fr|ru|zh|hi))?)\\/blog\\/(${slugs
      .map(escapeRe)
      .join("|")})(?![a-z0-9-])`,
    "gi",
  );
  return text.replace(re, (_all, prefix: string, slug: string) => `${prefix}${map[slug.toLowerCase()] ?? `/blog/${slug}`}`);
}
