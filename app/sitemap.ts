import { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";

export const revalidate = 3600; // regenerate every hour

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://mebayluon.com"
).replace(/\/$/, "");

const LANGS = ["vi", "en", "fr", "ru", "zh", "hi"] as const;

function alts(url: string): { languages: Record<string, string> } {
  const languages: Record<string, string> = { "x-default": url };
  for (const lang of LANGS) languages[lang] = url;
  return { languages };
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

    return [...staticRoutes, ...blogRoutes, ...knowledgeRoutes, ...storeRoutes];
  } catch (err) {
    console.error("[sitemap] DB fetch failed, serving static only:", err);
    return staticRoutes;
  }
}
