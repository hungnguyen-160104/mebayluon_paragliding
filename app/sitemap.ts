import { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import { pilots } from "@/lib/pilots-data";

export const revalidate = 3600; // regenerate every hour

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://mebayluon.com"
).replace(/\/$/, "");

/**
 * LƯU Ý về hreflang:
 * Website hiện đổi ngôn ngữ bằng cookie trên CÙNG một URL, nên KHÔNG khai
 * alternates.languages ở đây — hreflang nhiều ngôn ngữ trỏ về cùng một URL
 * là không hợp lệ và bị Google bỏ qua. Khi nào chuyển sang routing theo path
 * (/en, /fr, ...) thì mới khai hreflang thật.
 */

/**
 * Các điểm bay trong app/spots/[slug]/page.tsx.
 * Không đưa alias "sapa" vào vì canonical của nó trỏ về "muong-hoa-sapa".
 */
const SPOT_SLUGS = [
  "muong-hoa-sapa",
  "son-tra",
  "khau-pha",
  "tram-tau",
  "ha-giang",
  "vien-nam",
  "doi-bu",
  "dalat",
];

/** Các trang con kiến thức trong app/knowledge/[sub]/page.tsx (SUB_MAP). */
const KNOWLEDGE_SUBS = ["basic", "advanced", "thermal", "xc", "weather"];

/** Phi công đã gỡ khỏi website (đồng bộ với app/pilots/[slug]/page.tsx). */
const REMOVED_PILOT_SLUGS = new Set(["removed-pilot-01", "yupi"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/knowledge`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/knowledge/all`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/store`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/pilots`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/homestay`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Trang điểm bay — quan trọng nhất về SEO (từ khoá "bay dù lượn + địa danh")
  const spotRoutes: MetadataRoute.Sitemap = SPOT_SLUGS.map((slug) => ({
    url: `${BASE}/spots/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const knowledgeSubRoutes: MetadataRoute.Sitemap = KNOWLEDGE_SUBS.map(
    (sub) => ({
      url: `${BASE}/knowledge/${sub}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })
  );

  const pilotRoutes: MetadataRoute.Sitemap = pilots
    .filter((p) => p.slug && !REMOVED_PILOT_SLUGS.has(p.slug))
    .map((p) => ({
      url: `${BASE}/pilots/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  const baseRoutes: MetadataRoute.Sitemap = [
    ...staticRoutes,
    ...spotRoutes,
    ...knowledgeSubRoutes,
    ...pilotRoutes,
  ];

  try {
    await connectDB();

    const [blogPosts, knowledgePosts, storeProducts] = await Promise.all([
      PostModel.find({
        isPublished: true,
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

    const blogRoutes: MetadataRoute.Sitemap = (blogPosts as any[]).map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    // Bài kiến thức cũng được phục vụ tại /blog/{slug}
    const knowledgeRoutes: MetadataRoute.Sitemap = (knowledgePosts as any[]).map(
      (p) => ({
        url: `${BASE}/blog/${p.slug}`,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.65,
      })
    );

    const storeRoutes: MetadataRoute.Sitemap = (storeProducts as any[]).map(
      (p) => ({
        url: `${BASE}/store/${p.storeCategory ?? "all"}/${p.slug}`,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.55,
      })
    );

    return [...baseRoutes, ...blogRoutes, ...knowledgeRoutes, ...storeRoutes];
  } catch (err) {
    console.error("[sitemap] DB fetch failed, serving static only:", err);
    return baseRoutes;
  }
}
