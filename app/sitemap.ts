import { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import { SITE_URL, languageAlternates } from "@/lib/site-config";
import { SPOT_SLUGS } from "@/lib/spots-slugs";
import { getActivePilots } from "@/lib/pilots-data";

export const revalidate = 3600; // regenerate every hour

const BASE = SITE_URL;

/**
 * hreflang cho sitemap: mỗi ngôn ngữ trỏ về URL prefix riêng
 * (/en/..., /ru/...) — trước đây cả 6 ngôn ngữ trỏ chung một URL nên
 * Google chỉ index được bản tiếng Việt.
 */
function alts(url: string): { languages: Record<string, string> } {
  const path = url.startsWith(BASE) ? url.slice(BASE.length) || "/" : url;
  return { languages: languageAlternates(path) };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: alts(BASE),
    },
    {
      url: `${BASE}/spots`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alts(`${BASE}/spots`),
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
      alternates: alts(`${BASE}/blog`),
    },
    {
      url: `${BASE}/knowledge`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alts(`${BASE}/knowledge`),
    },
    {
      url: `${BASE}/store`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alts(`${BASE}/store`),
    },
    {
      url: `${BASE}/pilots`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: alts(`${BASE}/pilots`),
    },
    {
      url: `${BASE}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: alts(`${BASE}/contact`),
    },
    {
      url: `${BASE}/homestay`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: alts(`${BASE}/homestay`),
    },
    {
      url: `${BASE}/booking`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alts(`${BASE}/booking`),
    },
  ];

  /**
   * Trang chi tiết điểm bay — các trang SEO quan trọng nhất
   * ("bay dù lượn Sapa", "dù lượn Khau Phạ"...). Chỉ đưa slug chuẩn,
   * không đưa alias (ví dụ /spots/sapa) để tránh URL trùng lặp.
   */
  const spotRoutes: MetadataRoute.Sitemap = SPOT_SLUGS.map((slug) => {
    const url = `${BASE}/spots/${slug}`;
    return {
      url,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: alts(url),
    };
  });

  /** Trang chi tiết phi công đang hoạt động. */
  const pilotRoutes: MetadataRoute.Sitemap = getActivePilots().map((pilot) => {
    const url = `${BASE}/pilots/${pilot.slug}`;
    return {
      url,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: alts(url),
    };
  });

  try {
    await connectDB();

    const [blogPosts, knowledgePosts, storeProducts] = await Promise.all([
      PostModel.find({
        isPublished: true,
        // Loại category knowledge để không trùng với knowledgeRoutes bên dưới
        // (bài knowledge cũng có type "blog" nên từng bị liệt kê 2 lần —
        // 37 URL lặp trong sitemap).
        category: { $ne: "knowledge" },
        $or: [{ category: "news" }, { type: "blog" }],
      })
        .select("slug publishedAt updatedAt createdAt")
        .lean(),

      PostModel.find({
        isPublished: true,
        category: "knowledge",
      })
        .select("slug publishedAt updatedAt createdAt")
        .lean(),

      PostModel.find({
        isPublished: true,
        type: "product",
      })
        .select("slug storeCategory publishedAt updatedAt createdAt")
        .lean(),
    ]);

    const blogRoutes: MetadataRoute.Sitemap = (blogPosts as any[]).map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      return {
        url,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: alts(url),
      };
    });

    const knowledgeRoutes: MetadataRoute.Sitemap = (knowledgePosts as any[]).map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      return {
        url,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.65,
        alternates: alts(url),
      };
    });

    const storeRoutes: MetadataRoute.Sitemap = (storeProducts as any[]).map((p) => {
      const url = `${BASE}/store/${p.storeCategory ?? "all"}/${p.slug}`;
      return {
        url,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.55,
        alternates: alts(url),
      };
    });

    // Chốt chặn cuối: loại URL trùng (giữ bản đầu tiên) — sitemap có URL
    // lặp sẽ bị Google Search Console cảnh báo.
    const seen = new Set<string>();
    return [
      ...staticRoutes,
      ...spotRoutes,
      ...pilotRoutes,
      ...blogRoutes,
      ...knowledgeRoutes,
      ...storeRoutes,
    ].filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });
  } catch (err) {
    console.error("[sitemap] DB fetch failed, serving static only:", err);
    return [...staticRoutes, ...spotRoutes, ...pilotRoutes];
  }
}
