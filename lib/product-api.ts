// lib/product-api.ts
import api from "@/lib/api";
import type { Paginated, Post, StoreCategory } from "@/types/frontend/post";

export async function listProductsByCategory(opts: {
  category?: StoreCategory | "all" | string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Post>> {
  const { category, page = 1, limit = 50 } = opts;
  try {
    const isCategoryAll = !category || category === "all";
    const categoryQuery = isCategoryAll ? "" : `&storeCategory=${category}`;
    return await api<Paginated<Post>>(
      `/api/products?published=true&page=${page}&limit=${limit}${categoryQuery}`
    );
  } catch {
    const isCategoryAll = !category || category === "all";
    const categoryQuery = isCategoryAll ? "" : `&storeCategory=${category}`;
    return await api<Paginated<Post>>(
      `/api/posts?category=store&published=true&page=${page}&limit=${limit}${categoryQuery}`
    );
  }
}

export async function getProductBySlug(slug: string): Promise<Post> {
  try {
    // 👇 sửa đúng endpoint
    return await api<Post>(`/api/products/slug/${slug}`);
  } catch {
    return await api<Post>(`/api/posts/slug/${slug}`);
  }
}
