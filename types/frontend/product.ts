// mbl-paragliding/lib/product-api.ts
import api from "@/lib/api";
import type { Paginated, Post, StoreCategory } from "@/types/frontend/post";

/**
 * Ưu tiên gọi /api/products; nếu backend chưa tạo, fallback về /api/posts?category=store
 * (frontend-only) — an toàn cho giai đoạn chuyển tiếp.
 */
export async function listProductsByCategory(opts: {
  category: StoreCategory;
  page?: number;
  limit?: number;
}): Promise<Paginated<Post>> {
  const { category, page = 1, limit = 12 } = opts;

  // Thử endpoint chuyên sản phẩm
  try {
    return await api<Paginated<Post>>(
      `/api/products?storeCategory=${category}&page=${page}&limit=${limit}`
    );
  } catch {
    // Fallback tạm thời nếu backend chưa có /api/products
    return await api<Paginated<Post>>(
      `/api/posts?category=store&storeCategory=${category}&page=${page}&limit=${limit}`
    );
  }
}

export async function getProductBySlug(slug: string): Promise<Post> {
  try {
    return await api<Post>(`/api/products/${slug}`);
  } catch {
    return await api<Post>(`/api/posts/slug/${slug}`);
  }
}
