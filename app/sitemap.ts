import { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import { SITE_URL, languageAlternates, type Locale } from "@/lib/site-config";
import { postLocales } from "@/lib/post-locales";
import { SPOT_SLUGS } from "@/lib/spots-slugs";
import { STORE_CATEGORY_CONFIG } from "@/lib/store-texts";
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

/**
 * Ngày nội dung các TRANG TĨNH thay đổi lần gần nhất.
 *
 * Trước đây mỗi mục tĩnh khai `lastModified: new Date()`, tức lấy giờ build.
 * Hệ quả: 46 URL — toàn bộ /spots/*, /pilots/*, /store/*, /knowledge/* và các
 * trang danh sách — cứ mỗi lần deploy lại báo với Google là "vừa thay đổi",
 * kể cả khi chỉ sửa một dòng CSS ở trang khác. Google đối chiếu thấy nội dung
 * không đổi, học được rằng lastmod của web này là nhiễu, rồi bỏ qua luôn tín
 * hiệu đó. Đúng nhóm 46 URL này đang nằm trong "Đã phát hiện thấy — hiện chưa
 * được lập chỉ mục" của Search Console.
 *
 * Nay dùng một mốc cố định, không đổi theo mỗi lần deploy.
 *
 * KHI NÀO SỬA: chỉ khi thật sự viết lại nội dung các trang tĩnh (đổi mô tả
 * điểm bay, thêm phi công, sửa bảng giá...). Sửa giao diện, đổi cỡ chữ, dọn
 * link thì ĐỪNG đụng vào — nội dung không đổi thì không được báo là đổi.
 *
 * Bài viết và sản phẩm KHÔNG dùng mốc này: chúng đã có ngày thật trong cơ sở
 * dữ liệu, và lấy theo `updatedAt` — NGÀY SỬA GẦN NHẤT, không phải ngày đăng.
 *
 * Trước đây ưu tiên `publishedAt`, nên sửa lại bài bao nhiêu lần thì lastmod
 * vẫn đứng nguyên ở ngày xuất bản: Google không hề nhận được tín hiệu "trang
 * này đổi rồi", nên hoãn việc quay lại đọc. Với site cập nhật liên tục thì đó
 * là thứ làm chậm mọi nỗ lực SEO khác.
 *
 * Đi kèm điều kiện: `updatedAt` chỉ được đổi khi NỘI DUNG đổi. Vì thế
 * `addView` (đếm lượt xem) phải chạy với `timestamps: false` — xem chú thích
 * ở services/post.service.ts. Bỏ chỗ đó là mọi bài lastmod = bây giờ, tín
 * hiệu thành nhiễu, còn tệ hơn lúc chưa sửa.
 */
const STATIC_CONTENT_UPDATED = new Date("2026-08-10T00:00:00Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 1,
      alternates: alts(BASE),
    },
    {
      url: `${BASE}/spots`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alts(`${BASE}/spots`),
    },
    {
      url: `${BASE}/blog`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: alts(`${BASE}/blog`),
    },
    {
      url: `${BASE}/knowledge`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alts(`${BASE}/knowledge`),
    },
    {
      url: `${BASE}/store`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alts(`${BASE}/store`),
    },
    {
      url: `${BASE}/ppg`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alts(`${BASE}/ppg`),
    },
    {
      url: `${BASE}/pilots`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: alts(`${BASE}/pilots`),
    },
    {
      url: `${BASE}/contact`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: alts(`${BASE}/contact`),
    },
    {
      url: `${BASE}/homestay`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: alts(`${BASE}/homestay`),
    },
    {
      url: `${BASE}/homestay/dat-phong`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: alts(`${BASE}/homestay/dat-phong`),
    },
    {
      url: `${BASE}/booking`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alts(`${BASE}/booking`),
    },
    {
      url: `${BASE}/pre-notice`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: alts(`${BASE}/pre-notice`),
    },
    {
      url: `${BASE}/terms`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: alts(`${BASE}/terms`),
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
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: alts(url),
    };
  });

  /**
   * Trang danh mục con: chuyên mục kiến thức và danh mục cửa hàng.
   *
   * Đây là tầng giữa nối trang danh sách với trang chi tiết. Thiếu chúng
   * trong sitemap thì bài kiến thức và sản phẩm chỉ còn đúng một đường vào,
   * và đó là lý do /store/khoa-hoc-du-luon/... nằm mãi ở nhóm chưa index.
   */
  const KNOWLEDGE_SUBS = ["basic", "advanced", "thermal", "xc", "weather"] as const;

  const sectionRoutes: MetadataRoute.Sitemap = [
    ...KNOWLEDGE_SUBS.map((sub) => `/knowledge/${sub}`),
    "/knowledge/all",
    // Bỏ "all": /store/all hiện đúng nội dung của /store nên là URL trùng.
    ...STORE_CATEGORY_CONFIG.filter((c) => c.key !== "all").map(
      (c) => `/store/${c.key}`,
    ),
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: STATIC_CONTENT_UPDATED,
    changeFrequency: "weekly" as const,
    priority: 0.6,
    alternates: alts(`${BASE}${path}`),
  }));

  /** Trang chi tiết phi công đang hoạt động. */
  const pilotRoutes: MetadataRoute.Sitemap = getActivePilots().map((pilot) => {
    const url = `${BASE}/pilots/${pilot.slug}`;
    return {
      url,
      lastModified: STATIC_CONTENT_UPDATED,
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
        lastModified: new Date(p.updatedAt ?? p.publishedAt ?? p.createdAt),
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
        lastModified: new Date(p.updatedAt ?? p.publishedAt ?? p.createdAt),
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
        lastModified: new Date(p.updatedAt ?? p.publishedAt ?? p.createdAt),
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
      ...sectionRoutes,
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
    return [...staticRoutes, ...spotRoutes, ...sectionRoutes, ...pilotRoutes];
  }
}
