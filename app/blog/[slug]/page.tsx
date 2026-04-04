export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/lib/posts-data";
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
    return false;
  });
}

function hasHtmlTag(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ""));
}

function renderContentBlock(block: ContentBlock, index: number) {
  const key = block.id || `block-${index}`;
  const data = block.data || {};

  switch (block.type) {
    case "heading": {
      const level = Math.min(4, Math.max(1, Number(data.level || 2)));
      const text = data.text || "";

      if (level === 1) {
        return (
          <h1 key={key} className="text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {text}
          </h1>
        );
      }

      if (level === 2) {
        return (
          <h2 key={key} className="text-3xl font-bold leading-tight text-white md:text-4xl">
            {text}
          </h2>
        );
      }

      if (level === 3) {
        return (
          <h3 key={key} className="text-2xl font-bold leading-snug text-white md:text-3xl">
            {text}
          </h3>
        );
      }

      return (
        <h4 key={key} className="text-xl font-semibold leading-snug text-white md:text-2xl">
          {text}
        </h4>
      );
    }

    case "paragraph":
      return (
        <p key={key} className="whitespace-pre-line text-base font-normal leading-relaxed text-white/95">
          {data.text || ""}
        </p>
      );

    case "image":
      return data.url ? (
        <figure key={key} className="space-y-3">
          <img src={data.url} alt={data.alt || ""} className="w-full rounded-lg" />
          {data.caption ? (
            <figcaption className="text-sm text-white/70">{data.caption}</figcaption>
          ) : null}
        </figure>
      ) : null;

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

    case "cta":
      return data.text ? (
        <p key={key}>
          <a
            href={data.link || "#"}
            className="inline-flex items-center rounded-full bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-600"
          >
            {data.text}
          </a>
        </p>
      ) : null;

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
    unknownDate: string;
    views: (n: number) => string;
    noContent: string;
    previewLabel: string;
  }
> = {
  vi: {
    back: "Quay lại",
    related: "Bài viết liên quan",
    unknownDate: "Không rõ ngày đăng",
    views: (n) => `${n} lượt xem`,
    noContent: "Bài viết chưa có nội dung.",
    previewLabel: "Đang xem bản nháp",
  },
  en: {
    back: "Back",
    related: "Related posts",
    unknownDate: "Date unknown",
    views: (n) => `${n} views`,
    noContent: "This article has no content yet.",
    previewLabel: "Draft preview",
  },
  fr: {
    back: "Retour",
    related: "Articles associés",
    unknownDate: "Date inconnue",
    views: (n) => `${n} vues`,
    noContent: "Cet article n’a pas encore de contenu.",
    previewLabel: "Aperçu du brouillon",
  },
  ru: {
    back: "Назад",
    related: "Похожие статьи",
    unknownDate: "Дата неизвестна",
    views: (n) => `${n} просмотров`,
    noContent: "У этой статьи пока нет содержимого.",
    previewLabel: "Предпросмотр черновика",
  },
  zh: {
    back: "返回",
    related: "相关文章",
    unknownDate: "日期未知",
    views: (n) => `${n} 次浏览`,
    noContent: "这篇文章还没有内容。",
    previewLabel: "草稿预览",
  },
  hi: {
    back: "वापस जाएँ",
    related: "संबंधित पोस्ट",
    unknownDate: "तारीख अज्ञात",
    views: (n) => `${n} व्यूज़`,
    noContent: "इस लेख में अभी सामग्री नहीं है।",
    previewLabel: "ड्राफ्ट प्रीव्यू",
  },
};

async function getCurrentLang() {
  const cookieStore = await cookies();
  const raw =
    cookieStore.get("language")?.value ??
    cookieStore.get("Language")?.value ??
    cookieStore.get("lang")?.value;

  return getSafeLang(raw);
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

  const post = (await getPostBySlug(slug, {
    publishedOnly: !isPreview,
  })) as Post | null;

  if (!post) {
    return {
      title: "Article not found",
    };
  }

  const title = pickTitle(post, isVietnamese);
  const description = pickExcerpt(post, isVietnamese);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

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

  if (!post) notFound();

  const relatedResp = await getPosts({
    category: String(post.category || "news"),
    type: "blog",
    isPublished: true,
    limit: 5,
    sort: "-publishedAt,-createdAt",
    excludeSlug: post.slug,
  });

  const relatedPosts = ((relatedResp.items ?? []) as Post[]).slice(0, 4);

  const title = pickTitle(post, isVietnamese);
  const excerpt = pickExcerpt(post, isVietnamese);
  const content = pickContent(post, isVietnamese);
  const blocks = pickBlocks(post, isVietnamese);
  const canRenderBlocks = blocks.length > 0 && hasVisibleBlockData(blocks);
  const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
  const publishedLabel =
    post.publishedAt || post.createdAt
      ? new Date(post.publishedAt || post.createdAt).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : ui.unknownDate;

  return (
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/mebayluon.jpg')" }}
    >
      <div className="absolute inset-0 z-0 bg-black/30" />

      <div className="container relative z-10 mx-auto px-4 pb-16 pt-28">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white shadow-xl backdrop-blur-lg md:p-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              href="/blog"
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

          <h1 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            {title}
          </h1>

          {excerpt && (
            <p className="mb-6 w-full text-lg leading-relaxed text-white/85">
              {excerpt}
            </p>
          )}

          <div className="mb-6 text-sm text-gray-300">
            {publishedLabel} • {ui.views(Number(post.views || 0))}
          </div>

          {cover && (
            <div className="mb-8 w-full overflow-hidden rounded-lg bg-white/5">
              <Image
                src={cover}
                alt={title}
                width={1600}
                height={900}
                priority
                className="h-auto w-full rounded-lg"
                style={{
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          )}

          <article className="prose prose-invert max-w-none">
            {canRenderBlocks ? (
              <div className="space-y-5">{blocks.map(renderContentBlock)}</div>
            ) : content ? (
              hasHtmlTag(content) ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                <div className="whitespace-pre-line">{content}</div>
              )
            ) : (
              <p>{ui.noContent}</p>
            )}
          </article>

          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {relatedPosts.length > 0 && (
            <>
              <hr className="my-10 border-white/15" />

              <section>
                <h2 className="mb-6 text-2xl font-bold text-white">{ui.related}</h2>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedPosts.map((item) => {
                    const itemTitle = pickTitle(item, isVietnamese);
                    const itemExcerpt = pickExcerpt(item, isVietnamese);
                    const itemCover =
                      item.coverImage || item.thumbnail || "/images/mebayluon.jpg";

                    return (
                      <Link
                        key={item._id || item.slug}
                        href={`/blog/${item.slug}`}
                        className="group overflow-hidden rounded-xl border border-white/15 bg-white/10 transition-all duration-300 hover:bg-white/20 hover:shadow-xl"
                      >
                        <div className="relative h-44 w-full overflow-hidden">
                          <Image
                            src={itemCover}
                            alt={itemTitle}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        <div className="p-4">
                          <h3 className="mb-2 line-clamp-2 text-base font-semibold text-white transition-colors group-hover:text-red-300">
                            {itemTitle}
                          </h3>
                          <p className="line-clamp-3 text-sm text-white/75">
                            {itemExcerpt}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}