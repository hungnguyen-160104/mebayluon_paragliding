import { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import { SITE_URL, languageAlternates, type Locale } from "@/lib/site-config";
import { postLocales } from "@/lib/post-locales";
import { SPOT_SLUGS } from "@/lib/spots-slugs";
import { getActivePilots } from "@/lib/pilots-data";
import { collectPostVideos } from "@/lib/video-schema";

export const revalidate = 3600; // regenerate every hour

const BASE = SITE_URL;

/**
 * hreflang cho sitemap: mỗi ngôn ngữ trỏ về URL prefix riêng
 * (/en/..., /ru/...) — trước đây cả 6 ngôn ngữ trỏ chung một URL nên
 * Google chỉ index được bản tiếng Việt.
 */
function alts(
  url: string,
  available?: readonly Locale[],
): { languages: Record<string, string> } {
  const path = url.startsWith(BASE) ? url.slice(BASE.length) || "/" : url;
  return { languages: languageAlternates(path, available) };
}

/**
 * Khai báo video nhúng trong bài ngay trong sitemap. Search Console báo
 * "Video không nằm trên trang xem" — khai ở đây là cách Google khuyên dùng để
 * biết trang nào là trang xem của video nào. Bài không có video thì trả về {}
 * nên mục sitemap giữ nguyên như cũ.
 */
function postVideos(slug: string, bySlug: Map<string, ReturnType<typeof collectPostVideos>>) {
  const videos = bySlug.get(slug);
  if (!videos?.length) return {};

  return {
    videos: videos.map((v) => ({
      title: v.name,
      thumbnail_loc: v.thumbnailUrl[0],
      description: v.description || v.name,
      // Không khai content_loc — chuẩn sitemap bắt trường đó phải là file
      // video thật, video YouTube chỉ khai được player_loc.
      player_loc: v.embedUrl,
    })),
  };
}

/**
 * Chỉ lấy khối nội dung của những bài THẬT SỰ có video nhúng.
 *
 * Ban đầu tôi kéo contentBlocks trong chính truy vấn danh sách bài, nhưng như
 * thế là tải toàn bộ nội dung của ~90 bài chỉ để tìm 2 bài có video — đủ chậm
 * để làm /sitemap.xml quá 60 giây lúc build. Lọc thẳng bằng contentBlocks.type
 * thì Mongo chỉ trả về đúng mấy bài cần.
 */
async function loadVideosBySlug() {
  const posts = (await PostModel.find({
    isPublished: true,
    $or: [{ "contentBlocks.type": "embed" }, { "contentBlocksVi.type": "embed" }],
  })
    .select("slug title titleVi excerpt excerptVi contentBlocks contentBlocksVi")
    .lean()) as any[];

  const map = new Map<string, ReturnType<typeof collectPostVideos>>();
  for (const p of posts) {
    const videos = collectPostVideos(p.contentBlocksVi || p.contentBlocks, {
      title: p.titleVi || p.title || "",
      description: p.excerptVi || p.excerpt || "",
    });
    if (videos.length) map.set(p.slug, videos);
  }
  return map;
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

    const [blogPosts, knowledgePosts, storeProducts, videosBySlug] = await Promise.all([
      PostModel.find({
        isPublished: true,
        // Loại category knowledge để không trùng với knowledgeRoutes bên dưới
        // (bài knowledge cũng có type "blog" nên từng bị liệt kê 2 lần —
        // 37 URL lặp trong sitemap).
        category: { $ne: "knowledge" },
        $or: [{ category: "news" }, { type: "blog" }],
      })
        .select("slug title titleVi translatedLangs publishedAt updatedAt createdAt")
        .lean(),

      PostModel.find({
        isPublished: true,
        category: "knowledge",
      })
        .select("slug title titleVi translatedLangs publishedAt updatedAt createdAt")
        .lean(),

      PostModel.find({
        isPublished: true,
        type: "product",
      })
        .select("slug storeCategory title titleVi translatedLangs publishedAt updatedAt createdAt")
        .lean(),

      loadVideosBySlug(),
    ]);

    const blogRoutes: MetadataRoute.Sitemap = (blogPosts as any[]).map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      return {
        url,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: alts(url, postLocales(p)),
        ...postVideos(p.slug, videosBySlug),
      };
    });

    const knowledgeRoutes: MetadataRoute.Sitemap = (knowledgePosts as any[]).map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      return {
        url,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.65,
        alternates: alts(url, postLocales(p)),
        ...postVideos(p.slug, videosBySlug),
      };
    });

    const storeRoutes: MetadataRoute.Sitemap = (storeProducts as any[]).map((p) => {
      const url = `${BASE}/store/${p.storeCategory ?? "all"}/${p.slug}`;
      return {
        url,
        lastModified: new Date(p.publishedAt ?? p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.55,
        alternates: alts(url, postLocales(p)),
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
