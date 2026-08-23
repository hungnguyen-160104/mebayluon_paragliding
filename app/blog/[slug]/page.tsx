import { PageBackground } from "@/components/page-background";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { notFound, permanentRedirect } from "next/navigation";
import { getPostBySlug, getPosts, findPostSlugInsensitive, findPostByPreviousSlug } from "@/lib/posts-data";
import { resolveLegacySlug } from "@/lib/legacy-slug-redirects";
import { postLocales } from "@/lib/post-locales";
import { ShareButtons } from "@/components/share-buttons";
import {
  RelatedPostsGrid,
  RelatedPostsSidebar,
  type RelatedPostItem,
} from "./RelatedPosts";
import { ViewCounter } from "@/components/ViewCounter";
import { buildMetadata, generateArticleSchema, generateBreadcrumbSchema } from "@/lib/metadata-builder";
import { collectPostVideos, generateVideoSchema } from "@/lib/video-schema";
import type { ContentBlock, EmbedType, Post, SupportedLocale } from "@/types/frontend/post";

type Lang = SupportedLocale;

type SearchParams = {
  preview?: string | string[];
};

function getSafeLang(v: unknown): Lang {
  const l = String(v ?? "vi") as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(l) ? l : "vi";
}

function isPreviewRequested(searchParams?: SearchParams) {
  const raw = searchParams?.preview;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1" || value === "true";
}

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInlineText(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function detectEmbedType(url: string): EmbedType {
  const value = String(url || "").trim();
  if (!value) return "unknown";

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname.includes("youtube.com") ||
      hostname.includes("youtu.be") ||
      hostname.includes("youtube-nocookie.com")
    ) {
      return "youtube";
    }

    if (
      hostname.includes("google.com") ||
      hostname.includes("maps.google.") ||
      hostname.includes("maps.app.goo.gl")
    ) {
      return "googleMaps";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

function getYouTubeEmbedUrl(rawUrl: string): string | null {
  const value = String(rawUrl || "").trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    let videoId = "";

    if (hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    } else if (hostname.includes("youtube.com") || hostname.includes("youtube-nocookie.com")) {
      if (parsed.pathname.startsWith("/watch")) {
        videoId = parsed.searchParams.get("v") || "";
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      } else if (parsed.pathname.startsWith("/live/")) {
        videoId = parsed.pathname.split("/live/")[1]?.split("/")[0] || "";
      }
    }

    videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!videoId) return null;

    const start = parsed.searchParams.get("t") || parsed.searchParams.get("start");
    const embed = new URL(`https://www.youtube.com/embed/${videoId}`);

    if (start) {
      const startSeconds = Number(String(start).replace(/[^\d]/g, ""));
      if (!Number.isNaN(startSeconds) && startSeconds > 0) {
        embed.searchParams.set("start", String(startSeconds));
      }
    }

    return embed.toString();
  } catch {
    return null;
  }
}

function pickTitle(post: Post, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: Post, isVietnamese: boolean) {
  if (isVietnamese) {
    if (post.excerptVi?.trim()) return normalizeInlineText(post.excerptVi);
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
  }

  if (post.excerpt?.trim()) return normalizeInlineText(post.excerpt);
  const text = stripHtml(post.content || post.contentVi || "");
  return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
}

function pickContent(post: Post, isVietnamese: boolean) {
  return isVietnamese
    ? post.contentVi || post.content || ""
    : post.content || post.contentVi || "";
}

function pickBlocks(post: Post, isVietnamese: boolean): ContentBlock[] {
  const blocks = isVietnamese
    ? post.contentBlocksVi || post.contentBlocks || []
    : post.contentBlocks || post.contentBlocksVi || [];

  return Array.isArray(blocks) ? blocks : [];
}

/**
 * Đổi ký hiệu định dạng nhanh trong đoạn văn thành thẻ HTML:
 * **chữ đậm** -> <strong>, *chữ nghiêng* -> <em>, [chữ](#neo) -> liên kết trong trang.
 * Chỉ nhận 3 ký hiệu này — mọi thứ khác giữ nguyên là chữ thường.
 *
 * Liên kết chỉ nhận đích bắt đầu bằng "#" (neo trong cùng bài), không nhận URL
 * ngoài — để nội dung biên tập nhập vào không chèn được link ra ngoài.
 */
function slugifyHeading(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isExternalHref(href: string): boolean {
  return (
    /^https?:\/\//i.test(href) &&
    !/^https?:\/\/(www\.)?mebayluon\.com(\/|$)/i.test(href)
  );
}

function renderInlineFormat(text: string): React.ReactNode[] {
  const parts = String(text || "").split(
    /(\[[^\]\n]+\]\((?:#|https:\/\/)[^)\s]+\)|\*\*[^*]+\*\*|\*[^*\n]+\*)/g
  );
  return parts.map((part, i) => {
    const link = /^\[([^\]\n]+)\]\(((?:#|https:\/\/)[^)\s]+)\)$/.exec(part);
    if (link) {
      const href = link[2];
      const external = isExternalHref(href);
      return (
        <a
          key={i}
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
        >
          {link[1]}
        </a>
      );
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*\n]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const PARAGRAPH_ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const PARAGRAPH_SIZE: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

function hasVisibleBlockData(blocks: ContentBlock[]): boolean {
  return blocks.some((block) => {
    const data = block?.data || {};
    if (typeof data.text === "string" && data.text.trim()) return true;
    if (typeof data.url === "string" && data.url.trim()) return true;
    if (Array.isArray(data.items) && data.items.some((item) => String(item || "").trim())) {
      return true;
    }
    if (typeof data.caption === "string" && data.caption.trim()) return true;
    if (typeof data.author === "string" && data.author.trim()) return true;
    if (typeof data.link === "string" && data.link.trim()) return true;
    if (block?.type === "divider") return true;
    if (Array.isArray(data.images) && data.images.some((img) => img?.url)) return true;
    return false;
  });
}

function hasHtmlTag(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ""));
}

/**
 * Điền alt cho các thẻ <img> bị thiếu hoặc rỗng trong nội dung HTML cũ.
 *
 * Nhiều bài viết lưu HTML thô với <img> không có alt, khiến Google Images
 * không index được ảnh. Ưu tiên giữ alt sẵn có; nếu thiếu thì dùng fallback
 * (thường là tiêu đề bài viết).
 */
function fillMissingImgAlt(html: string, fallback: string): string {
  const safeFallback = fallback
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const altMatch = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
    const currentAlt = (altMatch?.[2] ?? altMatch?.[3] ?? "").trim();

    if (currentAlt) return tag;

    if (altMatch) return tag.replace(altMatch[0], `alt="${safeFallback}"`);
    return tag.replace(/<img\b/i, `<img alt="${safeFallback}"`);
  });
}

function renderContentBlock(block: ContentBlock, index: number, fallbackAlt = "") {
  const key = block.id || `block-${index}`;
  const data = block.data || {};

  switch (block.type) {
    case "heading": {
      const level = Math.min(4, Math.max(1, Number(data.level || 2)));
      const text = data.text || "";
      const anchorId = slugifyHeading(text);

      if (level === 1) {
        return (
          <h1 key={key} id={anchorId} className="scroll-mt-24 mt-10! md:mt-12! text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
            {text}
          </h1>
        );
      }

      if (level === 2) {
        return (
          <h2 key={key} id={anchorId} className="scroll-mt-24 mt-10! md:mt-12! text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
            {text}
          </h2>
        );
      }

      if (level === 3) {
        return (
          <h3 key={key} id={anchorId} className="scroll-mt-24 mt-7! text-xl font-semibold leading-snug text-white md:text-2xl">
            {text}
          </h3>
        );
      }

      return (
        <h4 key={key} id={anchorId} className="scroll-mt-24 mt-6! text-lg font-semibold leading-snug text-white/95 md:text-xl">
          {text}
        </h4>
      );
    }

    case "paragraph": {
      const align = PARAGRAPH_ALIGN[data.align || "left"] || "text-left";
      const size = PARAGRAPH_SIZE[data.fontSize || "base"] || "text-base";
      return (
        <p key={key} className={`whitespace-pre-line ${size} ${align} font-light leading-relaxed text-white/90`}>
          {renderInlineFormat(data.text || "")}
        </p>
      );
    }

    case "image":
      return data.url ? (
        <figure key={key} className="space-y-3">
          <img src={data.url} alt={data.alt || data.caption || fallbackAlt} loading="lazy" className="w-full md:w-auto md:max-w-2xl mx-auto block rounded-lg" />
          {data.caption ? (
            <figcaption className="text-sm text-white/80 text-center italic font-semibold mt-2">{data.caption}</figcaption>
          ) : null}
        </figure>
      ) : null;

    case "gallery": {
      const images = (Array.isArray(data.images) ? data.images : []).filter(
        (img) => img?.url,
      );
      if (!images.length) return null;

      const cols = Math.min(4, Math.max(2, Number(data.columns) || 3));
      const colClass =
        cols === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : cols === 4
            ? "grid-cols-2 md:grid-cols-4"
            : "grid-cols-2 md:grid-cols-3";

      return (
        <div key={key} className={`not-prose grid gap-3 ${colClass}`}>
          {images.map((img, imgIndex) => (
            <figure key={`${img.url}-${imgIndex}`} className="overflow-hidden rounded-lg">
              <img
                src={img.url}
                alt={img.caption || `${fallbackAlt} - ${imgIndex + 1}`}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-105"
              />
              {img.caption ? (
                <figcaption className="mt-1 text-center text-xs italic text-white/70">
                  {img.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      );
    }

    case "quote":
      return (
        <blockquote
          key={key}
          className="rounded-xl border-l-4 border-red-400/80 bg-white/5 px-5 py-4"
        >
          <p className="text-lg italic text-white">{data.text || ""}</p>
          {data.author ? <cite className="mt-2 block text-sm text-white/70">— {data.author}</cite> : null}
        </blockquote>
      );

    case "bulletList": {
      const items = Array.isArray(data.items)
        ? data.items.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      if (!items.length) return null;

      return (
        <ul key={key} className="list-disc space-y-2 pl-6 text-white/95">
          {items.map((item, itemIndex) => (
            <li key={`${key}-item-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    }

    case "divider":
      return <hr key={key} className="border-white/15" />;

    case "cta": {
      const ctaHref = String(data.link || "#");
      const ctaExternal = isExternalHref(ctaHref);
      return data.text ? (
        <p key={key} className="not-prose">
          <a
            href={ctaHref}
            {...(ctaExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="cta-btn rounded-full bg-red-600 px-6 py-3 text-lg font-semibold text-orange-50 transition hover:bg-red-700"
          >
            {data.text}
          </a>
        </p>
      ) : null;
    }

    case "embed": {
      const rawUrl = String(data.url || "").trim();
      const embedType = data.embedType || detectEmbedType(rawUrl);

      if (embedType === "youtube") {
        const embedUrl = getYouTubeEmbedUrl(rawUrl);

        if (!embedUrl) {
          return rawUrl ? (
            <p key={key}>
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-300 underline"
              >
                {data.caption || rawUrl}
              </a>
            </p>
          ) : null;
        }

        return (
          <figure key={key} className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  title={data.caption || "YouTube video"}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
            {data.caption ? (
              <figcaption className="text-sm text-white/70">{data.caption}</figcaption>
            ) : null}
          </figure>
        );
      }

      if (embedType === "googleMaps") {
        return rawUrl ? (
          <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 text-white/85">{data.caption || "Mở Google Maps"}</p>
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Mở Google Maps
            </a>
          </div>
        ) : null;
      }

      return rawUrl ? (
        <p key={key}>
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-300 underline"
          >
            {data.caption || rawUrl}
          </a>
        </p>
      ) : null;
    }

    default:
      return null;
  }
}

const LOCALE_BY_LANG: Record<Lang, string> = {
  vi: "vi-VN",
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
  hi: "hi-IN",
};

const UI: Record<
  Lang,
  {
    back: string;
    related: string;
    seeMore: string;
    unknownDate: string;
    views: (n: number) => string;
    noContent: string;
    previewLabel: string;
  }
> = {
  vi: {
    back: "Quay lại",
    related: "Bài viết liên quan",
    seeMore: "Xem thêm",
    unknownDate: "Không rõ ngày đăng",
    views: (n) => `${n} lượt xem`,
    noContent: "Bài viết chưa có nội dung.",
    previewLabel: "Đang xem bản nháp",
  },
  en: {
    back: "Back",
    related: "Related posts",
    seeMore: "See more",
    unknownDate: "Date unknown",
    views: (n) => `${n} views`,
    noContent: "This article has no content yet.",
    previewLabel: "Draft preview",
  },
  fr: {
    back: "Retour",
    related: "Articles associés",
    seeMore: "Voir plus",
    unknownDate: "Date inconnue",
    views: (n) => `${n} vues`,
    noContent: "Cet article n’a pas encore de contenu.",
    previewLabel: "Aperçu du brouillon",
  },
  ru: {
    back: "Назад",
    related: "Похожие статьи",
    seeMore: "Показать ещё",
    unknownDate: "Дата неизвестна",
    views: (n) => `${n} просмотров`,
    noContent: "У этой статьи пока нет содержимого.",
    previewLabel: "Предпросмотр черновика",
  },
  zh: {
    back: "返回",
    related: "相关文章",
    seeMore: "查看更多",
    unknownDate: "日期未知",
    views: (n) => `${n} 次浏览`,
    noContent: "这篇文章还没有内容。",
    previewLabel: "草稿预览",
  },
  hi: {
    back: "वापस जाएँ",
    related: "संबंधित पोस्ट",
    seeMore: "और देखें",
    unknownDate: "तारीख अज्ञात",
    views: (n) => `${n} व्यूज़`,
    noContent: "इस लेख में अभी सामग्री नहीं है।",
    previewLabel: "ड्राफ्ट प्रीव्यू",
  },
};

async function getCurrentLang() {
  // URL có prefix ngôn ngữ (/en/blog/...) thì URL thắng cookie
  return getSafeLang(await getRequestLang());
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const previewParams = searchParams ? await searchParams : undefined;
  const isPreview = isPreviewRequested(previewParams);
  const lang = await getCurrentLang();
  const isVietnamese = lang === "vi";

  const post = (await getPostBySlug(slug, { publishedOnly: !isPreview })) as Post | null;

  if (!post) {
    return {
      title: "Bài viết không tồn tại | Mebayluon",
      // URL không tồn tại: trang render kiểu streaming nên không đổi được mã
      // trạng thái sang 404 — chặn index để tránh URL rác lọt vào Google.
      robots: { index: false, follow: false },
    };
  }

  const title = pickTitle(post, isVietnamese);
  const description = pickExcerpt(post, isVietnamese);
  // Dùng slug thật trong DB (không phải slug trên URL) để canonical luôn chuẩn
  const basePath = `/blog/${post.slug || slug}`;
  const urlLocale = await getUrlLocale();
  const image = post.coverImage || post.thumbnail || undefined;

  // Chỉ khai hreflang cho ngôn ngữ bài này THẬT SỰ có nội dung. Mở
  // /fr/blog/... khi bài chưa dịch tiếng Pháp thì canonical trỏ về bản
  // tiếng Anh, tránh 5 URL cùng nội dung bị tính là trùng lặp.
  return buildMetadata({
    title,
    description,
    image,
    url: basePath,
    type: "article",
    author: post.author || "Mebayluon Team",
    publishedDate: post.publishedAt ? new Date(post.publishedAt) : undefined,
    updatedDate: post.updatedAt ? new Date(post.updatedAt) : undefined,
    locale: urlLocale,
    availableLocales: postLocales(post),
  });
}

/**
 * Ngày đăng / cập nhật cho JSON-LD Article. Bài luôn có createdAt
 * (Mongoose timestamps), nhánh dự phòng chỉ phòng dữ liệu cũ thiếu ngày.
 * Tách ra khỏi thân component để không gọi Date lúc render
 * (quy tắc react-hooks/purity).
 */
function articleSchemaDates(post: {
  publishedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}) {
  const published = (post.publishedAt || post.createdAt) as string | undefined;
  const updated = (post.updatedAt || published) as string | undefined;
  const fallback = new Date();

  return {
    publishedDate: published ? new Date(published) : fallback,
    updatedDate: updated ? new Date(updated) : fallback,
  };
}

/**
 * Nhãn cho đường dẫn phân cấp (BreadcrumbList). Lấy đúng chữ mà trang danh
 * sách đang dùng làm tiêu đề để hai nơi không nói khác nhau.
 */
const CRUMB: Record<Lang, { home: string; blog: string; knowledge: string }> = {
  vi: { home: "Trang chủ", blog: "Tin tức & Blog", knowledge: "Kiến thức dù lượn" },
  en: { home: "Home", blog: "News & Blog", knowledge: "Paragliding knowledge" },
  fr: { home: "Accueil", blog: "Actualités & Blog", knowledge: "Connaissances en parapente" },
  ru: { home: "Главная", blog: "Новости и блог", knowledge: "Знания о парапланеризме" },
  zh: { home: "首页", blog: "资讯与博客", knowledge: "滑翔伞知识" },
  hi: { home: "होम", blog: "समाचार और ब्लॉग", knowledge: "पैराग्लाइडिंग ज्ञान" },
};

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const previewParams = searchParams ? await searchParams : undefined;
  const isPreview = isPreviewRequested(previewParams);

  const lang = await getCurrentLang();
  const isVietnamese = lang === "vi";
  const ui = UI[lang];
  const locale = LOCALE_BY_LANG[lang];

  const post = (await getPostBySlug(slug, {
    publishedOnly: !isPreview,
  })) as Post | null;

  if (!post) {
    /**
     * Bài đã đổi slug: URL cũ vẫn còn trong Google và trên các link đã
     * share. Redirect 301 sang slug mới để giữ thứ hạng, thay vì 404.
     */
    const newSlug = resolveLegacySlug(slug);
    if (newSlug) {
      permanentRedirect(`/blog/${newSlug}`);
    }

    /**
     * Bài từng dùng slug này rồi đổi (previousSlugs được service ghi lại
     * khi người dùng chủ động đổi slug) → chuyển về slug hiện tại.
     */
    const bySlugHistory = await findPostByPreviousSlug(slug);
    if (bySlugHistory) {
      permanentRedirect(`/blog/${bySlugHistory}`);
    }

    /**
     * Link cũ có thể viết hoa (ví dụ /blog/DeoKhauPha từ footer cũ hoặc
     * bài share Facebook) trong khi slug trong DB là chữ thường.
     * Redirect 301 về URL chuẩn thay vì báo 404.
     */
    const actualSlug = await findPostSlugInsensitive(slug);
    if (actualSlug && actualSlug !== slug) {
      permanentRedirect(`/blog/${actualSlug}`);
    }
    notFound();
  }

  /**
   * MongoDB có thể so slug không phân biệt hoa/thường (collation),
   * khi đó /blog/DeoKhauPha vẫn tìm thấy bài "deokhaupha" và render 200
   * ở URL sai → Google coi là nội dung trùng lặp. Ép về URL chuẩn.
   */
  if (post.slug && post.slug !== slug) {
    permanentRedirect(`/blog/${post.slug}`);
  }

  /**
   * Lấy RỘNG danh sách bài liên quan (không chỉ 6-7 bài): client hiển thị
   * 8 bài đầu, bấm "Xem thêm" mở thêm 10 bài mỗi lần — dữ liệu đã có sẵn
   * nên không cần gọi API khi bấm.
   */
  const relatedResp = await getPosts({
    forList: true,
    category: String(post.category || "news"),
    type: "blog",
    isPublished: true,
    limit: 100,
    sort: "-publishedAt,-createdAt",
    excludeSlug: post.slug,
  });

  /**
   * XOAY VÒNG quanh bài đang đọc thay vì lấy mới nhất: xếp theo ngày thì bài
   * nào cũng trỏ về đúng 8 bài mới nhất — bài cũ không nhận được liên kết nội
   * bộ nào và Google bỏ crawl (nhóm "đã phát hiện – chưa lập chỉ mục" trong
   * Search Console). Lấy các bài ĐỨNG CẠNH bài hiện tại theo vòng tròn thời
   * gian thì mỗi bài trong blog đều được ~8 bài khác trỏ tới, và người đọc
   * cũng được gợi ý bài cùng thời kỳ thay vì mãi một rổ bài mới.
   */
  const sorted = (relatedResp.items ?? []) as Post[];
  const myTime = new Date(post.publishedAt || post.createdAt || 0).getTime();
  // vị trí bài hiện tại nếu nó nằm trong danh sách (danh sách sắp mới → cũ)
  let cut = sorted.findIndex((x) => new Date(x.publishedAt || x.createdAt || 0).getTime() <= myTime);
  if (cut < 0) cut = sorted.length;
  const relatedPosts = [...sorted.slice(cut), ...sorted.slice(0, cut)];

  const title = pickTitle(post, isVietnamese);
  const excerpt = pickExcerpt(post, isVietnamese);
  const content = pickContent(post, isVietnamese);
  const blocks = pickBlocks(post, isVietnamese);
  const canRenderBlocks = blocks.length > 0 && hasVisibleBlockData(blocks);
  const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
  const backUrl = post.category === "knowledge" ? "/knowledge" : "/blog";
  const publishedLabel =
    post.publishedAt || post.createdAt
      ? new Date(post.publishedAt || post.createdAt).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : ui.unknownDate;

  // Dữ liệu phẳng cho component "bài liên quan" (client) — format ngày ngay
  // tại server để tránh lệch hydration giữa server/trình duyệt.
  const relatedItems: RelatedPostItem[] = relatedPosts.map((item) => {
    const itemDate = item.publishedAt || item.createdAt;
    return {
      slug: String(item.slug),
      title: pickTitle(item, isVietnamese),
      cover: item.coverImage || item.thumbnail || "/images/mebayluon.jpg",
      dateLabel: itemDate
        ? new Date(itemDate).toLocaleDateString(locale)
        : undefined,
    };
  });

  const schemaDates = articleSchemaDates(post);

  const articleSchema = generateArticleSchema({
    title,
    description: excerpt,
    image: cover,
    ...schemaDates,
    author: post.author || "Mebayluon Team",
    url: `/blog/${slug}`,
  });

  /**
   * VideoObject cho từng video nhúng trong bài. Không có phần này thì Search
   * Console báo "Video không nằm trên trang xem" — Google thấy iframe nhưng
   * không biết đây là trang xem của video nào.
   */
  // Đường dẫn phân cấp: Trang chủ > Tin tức (hoặc Kiến thức) > Tiêu đề bài.
  // Bậc giữa bám theo backUrl để khớp với nút "Quay lại" ngay trên trang.
  const crumb = CRUMB[lang];
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: crumb.home, url: "/" },
    backUrl === "/knowledge"
      ? { name: crumb.knowledge, url: "/knowledge" }
      : { name: crumb.blog, url: "/blog" },
    { name: title, url: `/blog/${slug}` },
  ]);

  const videoSchemas = collectPostVideos(blocks, {
    title,
    description: excerpt,
  }).map((video) =>
    generateVideoSchema(video, {
      pageUrl: `/blog/${slug}`,
      uploadDate: schemaDates.publishedDate,
    }),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {videoSchemas.map((schema) => (
        <script
          key={schema.embedUrl}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ViewCounter slug={slug} />
      <main className="relative min-h-screen w-full">
        <PageBackground src="/images/mebayluon.jpg" />
        {/* Nền xanh lá đậm (xanh như lá lúa) thay vì gần như đen — theo yêu cầu khách hàng */}
        <div className="fixed inset-0 -z-10 bg-[#0b3a1c]/85" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-28">

          {/* ── 2-cột desktop: article (trái) + sidebar (phải) ── */}
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 xl:grid-cols-[1fr_320px]">

            {/* ── CỘT TRÁI: bài viết ── */}
            <div className="rounded-2xl border border-white/10 bg-[#14532d]/85 p-5 text-white shadow-xl backdrop-blur-lg sm:p-7">

              {/* back + category */}
              <div className="mb-5 flex items-center justify-between gap-4">
                <Link
                  href={backUrl}
                  className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  ← {ui.back}
                </Link>
                <div className="flex items-center gap-2">
                  {isPreview && (
                    <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-200">
                      {ui.previewLabel}
                    </span>
                  )}
                  {post.category && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                      {String(post.category)}
                    </span>
                  )}
                </div>
              </div>

              {/* tiêu đề */}
              <h1 className="mb-3 text-center text-4xl font-bold leading-tight text-white sm:text-5xl" style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}>
                {title}
              </h1>

              {/* ngày + lượt xem */}
              <div className="mb-3 text-center text-xs text-white/60">
                {publishedLabel} • {ui.views(Number(post.views || 0))}
              </div>

              {/* thanh chia sẻ — ngay dưới tiêu đề để khách dễ thấy */}
              <div className="mb-5 flex justify-center">
                <ShareButtons lang={lang} variant="article" title={title} />
              </div>

              {/* lead paragraph — dùng font body (Roboto), nhẹ hơn để không bị "béo/bôi đen" */}
              {excerpt && (
                <p className="mb-5 border-l-2 border-white/30 pl-4 text-base font-light leading-relaxed text-white/80">
                  {excerpt}
                </p>
              )}

              {/* ảnh featured */}
              {cover && (
                <div className="mb-6 overflow-hidden rounded-xl bg-white/5">
                  <Image
                    src={cover}
                    alt={title}
                    width={1200}
                    height={675}
                    priority
                    className="h-auto w-full rounded-xl"
                    style={{ objectFit: "contain", display: "block" }}
                  />
                </div>
              )}

              {/* nội dung bài viết — prose-lg trên desktop cho chữ lớn hơn */}
              <article
                className="prose prose-invert max-w-none prose-sm md:prose-base
                  prose-p:leading-[1.85] prose-p:text-white/90 prose-p:font-light
                  prose-headings:text-white prose-headings:font-semibold
                  prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:font-bold prose-h2:tracking-tight
                  prose-h3:text-xl md:prose-h3:text-2xl prose-h3:font-semibold
                  prose-h4:text-lg md:prose-h4:text-xl prose-h4:font-semibold
                  prose-strong:text-white prose-a:text-sky-300
                  prose-img:rounded-lg prose-img:mx-auto
                  prose-blockquote:border-sky-400 prose-blockquote:text-white/75"
              >
                {canRenderBlocks ? (
                  <div className="space-y-5">
                    {blocks.map((block, index) => renderContentBlock(block, index, title))}
                  </div>
                ) : content ? (
                  hasHtmlTag(content) ? (
                    <div dangerouslySetInnerHTML={{ __html: fillMissingImgAlt(content, title) }} />
                  ) : (
                    <div className="whitespace-pre-line">{content}</div>
                  )
                ) : (
                  <p>{ui.noContent}</p>
                )}
              </article>

              {/* tags */}
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* related posts — chỉ hiện trên MOBILE (lg ẩn, vì desktop có sidebar) */}
              {relatedItems.length > 0 && (
                <section className="mt-10 lg:hidden">
                  <h2 className="mb-4 text-xl font-bold text-white">{ui.related}</h2>
                  <RelatedPostsGrid posts={relatedItems} seeMoreLabel={ui.seeMore} />
                </section>
              )}
            </div>

            {/* ── CỘT PHẢI: sidebar (chỉ desktop) ── */}
            {relatedItems.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border border-white/10 bg-[#071f0e]/75 p-5 text-white shadow-xl backdrop-blur-lg">
                  <h2 className="mb-4 border-b border-white/15 pb-3 text-sm font-bold uppercase tracking-widest text-white/70">
                    {ui.related}
                  </h2>
                  <RelatedPostsSidebar posts={relatedItems} seeMoreLabel={ui.seeMore} />
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
