import { HaGiangLoopMap } from "@/components/spots/HaGiangLoopMap";
import { HA_GIANG_SITE_URL } from "@/lib/ha-giang-site";
import { chonKhoi, chonNoiDung, chonTieuDe, chonTomTat } from "@/lib/post-translation";
import { PageBackground } from "@/components/page-background";
import { PostGallery, PostImage } from "@/components/blog/PostGallery";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "@/components/locale-link";
import { linkifyPhones, linkifyPhonesInHtml } from "@/lib/phone-link";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { notFound, permanentRedirect } from "next/navigation";
import { getPostBySlug, getPosts, findPostSlugInsensitive, findPostByPreviousSlug } from "@/lib/posts-data";
import { resolveLegacySlug } from "@/lib/legacy-slug-redirects";
import { SPOT_TAGS } from "@/lib/spot-tags";
import { clusterOf } from "@/lib/spot-hub";
import { categoryOfPost } from "@/lib/blog-categories";
import { bookingHrefForSpot, bookingLocationForSpot } from "@/lib/booking/spot-to-location";
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
import { cloudinaryOptimize, optimizeContentImages } from "@/lib/cloudinary-url";
import { getProductPathMap, rewriteProductLinks } from "@/lib/product-links";
import { canonicalUrlFor, localizedUrl, type Locale } from "@/lib/site-config";
import {
  AUTHOR_LABEL,
  authorProfileUrl,
  findArticleAuthor,
  isBrandAuthor,
  pilotPersonId,
} from "@/lib/authors";
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

function pickTitle(post: Post, lang: string) {
  return chonTieuDe(post, lang);
}

function pickExcerpt(post: Post, lang: string) {
  return chonTomTat(post, lang);
}

function pickContent(post: Post, lang: string) {
  return chonNoiDung(post, lang);
}

function pickBlocks(post: Post, lang: string): ContentBlock[] {
  return chonKhoi(post, lang);
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

/**
 * Link tuyệt đối về chính mebayluon.com → đường dẫn nội bộ, để đi qua <Link>
 * (components/locale-link) và giữ tiền tố ngôn ngữ trên trang /en, /fr…
 * (SEO 29/09/2026). Link ngoài và neo "#" giữ nguyên.
 */
function veDuongDanNoiBo(href: string): string {
  const m = /^https?:\/\/(?:www\.)?mebayluon\.com(\/[^\s]*)?$/i.exec(href);
  return m ? m[1] || "/" : href;
}

function isExternalHref(href: string): boolean {
  return (
    /^https?:\/\//i.test(href) &&
    !/^https?:\/\/(www\.)?mebayluon\.com(\/|$)/i.test(href)
  );
}

/**
 * ĐỊA CHỈ NÀO ĐƯỢC PHÉP trong link markdown của bài viết — DANH SÁCH TRẮNG:
 *
 *   #muc-1                  neo trong trang
 *   /blog/bai-viet          đường dẫn nội bộ
 *   https://… · http://…    trang ngoài
 *
 * Trước đây thiếu nhánh "/" nên link nội bộ hiện ra nguyên văn cả dấu ngoặc
 * giữa bài, rất xấu — mà đây lại đúng là kiểu link hay dùng nhất (link nội bộ
 * giữa các bài).
 *
 * "//" bị loại: "//trang-la.com" trông như đường dẫn nội bộ nhưng trình duyệt
 * hiểu là sang hẳn tên miền khác.
 *
 * Phải là DANH SÁCH TRẮNG chứ không nhận mọi thứ: chữ trong bài đi thẳng vào
 * href, mà "javascript:" trong href là chạy mã ngay trên trình duyệt người đọc.
 */
const MD_HREF = String.raw`(?:#|\/(?!\/)|https?:\/\/)`;

function renderInlineFormat(text: string): React.ReactNode[] {
  const parts = String(text || "").split(
    new RegExp(`(\\[[^\\]\\n]+\\]\\(${MD_HREF}[^)\\s]+\\)|\\*\\*[^*]+\\*\\*|\\*[^*\\n]+\\*)`, "g")
  );
  const linkRe = new RegExp(`^\\[([^\\]\\n]+)\\]\\((${MD_HREF}[^)\\s]+)\\)$`);
  return parts.map((part, i) => {
    const link = linkRe.exec(part);
    if (link) {
      const href = veDuongDanNoiBo(link[2]);
      const external = isExternalHref(href);
      const cls = "font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200";
      /**
       * Link nội bộ đi qua <Link> để chuyển trang không phải tải lại cả trang;
       * neo "#..." và trang ngoài thì <a> thường là đúng.
       */
      if (href.startsWith("/")) {
        return (
          <Link key={i} href={href} className={cls}>
            {link[1]}
          </Link>
        );
      }
      return (
        <a
          key={i}
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className={cls}
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
    return linkifyPhones(part, `p${i}`);
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
          {/* Bấm vào ảnh là phóng to (components/blog/PostGallery.tsx). */}
          <PostImage
            url={data.url}
            alt={data.alt || data.caption || fallbackAlt}
            caption={data.caption}
            className="w-full md:w-auto md:max-w-2xl mx-auto block rounded-lg"
          />
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
      /**
       * SỐ CỘT ĐÚNG NHƯ ĐÃ CHỌN, KỂ CẢ TRÊN ĐIỆN THOẠI (chủ 25/09): trước đây
       * điện thoại luôn 2 cột nên thư viện 3 ảnh bị lẻ một ảnh xuống hàng dưới.
       * Riêng 4 cột vẫn hạ xuống 2 trên máy nhỏ, không thì ảnh bé quá.
       */
      const colClass = cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3";
      /**
       * TỈ LỆ KHUNG: mặc định 4:3 như cũ để bài cũ không đổi dáng; "auto" giữ
       * nguyên ảnh (không cắt), hợp với bộ ảnh so sánh chụp sẵn đúng khung.
       */
      const ratioClass =
        data.ratio === "1/1"
          ? "aspect-square object-cover"
          : data.ratio === "3/4"
            ? "aspect-[3/4] object-cover"
            : data.ratio === "auto"
              ? "h-auto object-contain"
              : "aspect-[4/3] object-cover";

      // Lưới + hộp phóng to khi bấm (chủ 25/09: ảnh nhỏ quá, khách khó soi).
      return (
        <PostGallery
          key={key}
          images={images.map((img) => ({ url: String(img.url), caption: img.caption || undefined }))}
          colClass={colClass}
          ratioClass={ratioClass}
          alt={fallbackAlt}
        />
      );
    }

    /**
     * BẢNG (chủ 25/09) — cùng một bảng, hai cách đọc:
     *
     *  · Màn hình ≥ 640px: bảng thật, tự cuộn ngang nếu nhiều cột (bảng so
     *    sánh 4–5 cột trên máy tính bảng dựng đứng vẫn đọc được).
     *  · Điện thoại: mỗi HÀNG thành một thẻ, ô đầu làm tiêu đề thẻ, các ô sau
     *    tự gắn tên cột trước giá trị (`data-label`). Không bắt người đọc
     *    cuộn ngang trên màn 360px, cũng không phải chụp bảng thành ảnh.
     */
    case "table": {
      const headers = (Array.isArray(data.headers) ? data.headers : []).map((h) => String(h ?? ""));
      const rows = (Array.isArray(data.rows) ? data.rows : [])
        .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []))
        .filter((r) => r.some((c) => c.trim()));
      if (!headers.length || !rows.length) return null;

      return (
        <figure key={key} className="not-prose my-6">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse text-left text-sm text-white/90 sm:min-w-[34rem]">
              <thead className="hidden sm:table-header-group">
                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-white/25 px-3 py-2 align-bottom text-[13px] font-bold uppercase tracking-wide text-amber-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block sm:table-row-group">
                {rows.map((row, rIndex) => (
                  <tr
                    key={rIndex}
                    className="mb-3 block rounded-xl border border-white/15 bg-white/[0.04] p-3 last:mb-0 sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:odd:bg-white/[0.03]"
                  >
                    {headers.map((h, cIndex) => {
                      const cell = row[cIndex] ?? "";
                      if (cIndex === 0) {
                        return (
                          <td
                            key={cIndex}
                            className="block pb-2 text-[15px] font-bold text-white sm:table-cell sm:border-b sm:border-white/10 sm:px-3 sm:py-2 sm:text-sm sm:font-semibold"
                          >
                            {renderInlineFormat(String(cell ?? ""))}
                          </td>
                        );
                      }
                      return (
                        <td
                          key={cIndex}
                          data-label={h}
                          className="block border-t border-white/10 py-1.5 leading-relaxed before:mr-2 before:font-semibold before:text-amber-300/90 before:content-[attr(data-label)_':'] sm:table-cell sm:border-t-0 sm:border-b sm:border-white/10 sm:px-3 sm:py-2 sm:before:content-none"
                        >
                          {renderInlineFormat(String(cell ?? ""))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.caption ? (
            <figcaption className="mt-2 text-center text-sm italic text-white/70">{data.caption}</figcaption>
          ) : null}
        </figure>
      );
    }

    case "quote":
      return (
        <blockquote
          key={key}
          className="rounded-xl border-l-4 border-red-400/80 bg-white/5 px-5 py-4"
        >
          <p className="text-lg italic text-white">{renderInlineFormat(data.text || "")}</p>
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
            <li key={`${key}-item-${itemIndex}`}>{renderInlineFormat(item)}</li>
          ))}
        </ul>
      );
    }

    case "divider":
      return <hr key={key} className="border-white/15" />;

    case "cta": {
      const ctaHref = veDuongDanNoiBo(String(data.link || "#"));
      const ctaExternal = isExternalHref(ctaHref);
      const ctaCls =
        "cta-btn rounded-full bg-red-600 px-6 py-3 text-lg font-semibold text-orange-50 transition hover:bg-red-700";
      if (data.text && ctaHref.startsWith("/") && !ctaHref.startsWith("//")) {
        return (
          <p key={key} className="not-prose">
            <Link href={ctaHref} className={ctaCls}>
              {data.text}
            </Link>
          </p>
        );
      }
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

      if (embedType === "haGiangLoop") {
        return (
          <figure key={key} className="not-prose space-y-3">
            <HaGiangLoopMap />
            {data.caption ? (
              <figcaption className="text-sm text-white/70">
                {data.caption}{" "}
                <a href={HA_GIANG_SITE_URL} target="_blank" rel="noopener" className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200">
                  Ha Giang Paragliding
                </a>
              </figcaption>
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

const NOT_FOUND_TITLE: Record<Lang, string> = {
  vi: "Bài viết không tồn tại",
  en: "Article not found",
  fr: "Article introuvable",
  ru: "Статья не найдена",
  zh: "文章不存在",
  hi: "लेख नहीं मिला",
};

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
    /** Thẻ "Điểm bay liên quan" cuối bài (bài có trường `spots`). */
    relatedSpots: string;
    viewSpot: string;
    bookSpot: string;
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
    relatedSpots: "Điểm bay liên quan",
    viewSpot: "Xem điểm bay",
    bookSpot: "Đặt bay",
  },
  en: {
    back: "Back",
    related: "Related posts",
    seeMore: "See more",
    unknownDate: "Date unknown",
    views: (n) => `${n} views`,
    noContent: "This article has no content yet.",
    previewLabel: "Draft preview",
    relatedSpots: "Related flying sites",
    viewSpot: "View site",
    bookSpot: "Book a flight",
  },
  fr: {
    back: "Retour",
    related: "Articles associés",
    seeMore: "Voir plus",
    unknownDate: "Date inconnue",
    views: (n) => `${n} vues`,
    noContent: "Cet article n’a pas encore de contenu.",
    previewLabel: "Aperçu du brouillon",
    relatedSpots: "Sites de vol associés",
    viewSpot: "Voir le site",
    bookSpot: "Réserver un vol",
  },
  ru: {
    back: "Назад",
    related: "Похожие статьи",
    seeMore: "Показать ещё",
    unknownDate: "Дата неизвестна",
    views: (n) => `${n} просмотров`,
    noContent: "У этой статьи пока нет содержимого.",
    previewLabel: "Предпросмотр черновика",
    relatedSpots: "Связанные места полётов",
    viewSpot: "Смотреть место",
    bookSpot: "Забронировать полёт",
  },
  zh: {
    back: "返回",
    related: "相关文章",
    seeMore: "查看更多",
    unknownDate: "日期未知",
    views: (n) => `${n} 次浏览`,
    noContent: "这篇文章还没有内容。",
    previewLabel: "草稿预览",
    relatedSpots: "相关飞行点",
    viewSpot: "查看飞行点",
    bookSpot: "预订飞行",
  },
  hi: {
    back: "वापस जाएँ",
    related: "संबंधित पोस्ट",
    seeMore: "और देखें",
    unknownDate: "तारीख अज्ञात",
    views: (n) => `${n} व्यूज़`,
    noContent: "इस लेख में अभी सामग्री नहीं है।",
    previewLabel: "ड्राफ्ट प्रीव्यू",
    relatedSpots: "संबंधित उड़ान स्थल",
    viewSpot: "स्थल देखें",
    bookSpot: "उड़ान बुक करें",
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

  const post = (await getPostBySlug(slug, { publishedOnly: !isPreview })) as Post | null;

  if (!post) {
    return {
      title: `${NOT_FOUND_TITLE[lang]} | Mebayluon`,
      // Thân trang gọi notFound() → HTTP 404 thật; noindex chỉ là lớp phụ.
      robots: { index: false, follow: false },
    };
  }

  const title = pickTitle(post, lang);
  const description = pickExcerpt(post, lang);
  // Dùng slug thật trong DB (không phải slug trên URL) để canonical luôn chuẩn
  const basePath = `/blog/${post.slug || slug}`;
  const urlLocale = await getUrlLocale();
  const image = post.coverImage || post.thumbnail || undefined;

  // Chỉ khai hreflang cho ngôn ngữ bài này THẬT SỰ có nội dung. Mở
  // /fr/blog/... khi bài chưa dịch tiếng Pháp thì canonical trỏ về bản
  // tiếng Anh, tránh 5 URL cùng nội dung bị tính là trùng lặp.
  const knownAuthor = findArticleAuthor(post.author);
  const meta = buildMetadata({
    title,
    description,
    image,
    url: basePath,
    type: "article",
    author: knownAuthor
      ? knownAuthor.name
      : isBrandAuthor(post.author)
        ? "Mebayluon Paragliding"
        : String(post.author),
    authorUrl: knownAuthor ? authorProfileUrl(knownAuthor, urlLocale) : undefined,
    publishedDate: post.publishedAt ? new Date(post.publishedAt) : undefined,
    updatedDate: post.updatedAt ? new Date(post.updatedAt) : undefined,
    locale: urlLocale,
    availableLocales: postLocales(post),
  });

  /**
   * Bản nháp mở bằng ?preview=1 để gửi link duyệt — không cho Google index
   * (29/09/2026: trước đây bản nháp xem trước vẫn "index, follow").
   */
  if (!post.isPublished) return { ...meta, robots: { index: false, follow: false } };
  return meta;
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

  /** Ngôn ngữ theo URL — chỉ dùng cho URL trong JSON-LD và chuyển hướng. */
  const urlLocale = await getUrlLocale();
  const localePrefix = urlLocale === "vi" ? "" : `/${urlLocale}`;

  /**
   * SẢN PHẨM CỬA HÀNG mở bằng /blog/<slug> (SEO 01/10/2026): trang này render
   * mọi bài theo slug, kể cả type "product", nên sách/khoá học có hai URL index
   * được — /blog/x và /store/<danh mục>/x. Chuyển hẳn (308) về trang cửa hàng,
   * giữ tiền tố ngôn ngữ. Xem trước bản nháp (?preview=1) thì không chuyển.
   */
  if (post.type === "product" && !isPreview) {
    permanentRedirect(`${localePrefix}/store/${post.storeCategory || "all"}/${post.slug}`);
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
  const rotation = [...sorted.slice(cut), ...sorted.slice(0, cut)];

  /**
   * XẾP HẠNG BÀI LIÊN QUAN (10/2026): (1) bài cùng ĐIỂM BAY (trường spots,
   * khác chuyên mục cũng được — nối kỹ thuật ↔ cẩm nang ↔ dịch vụ), tối đa 4;
   * (2) bài cùng CỤM + cùng mục con, lấy đủ 6; (3) phần còn lại giữ vòng
   * xoay theo ngày như trên, để bài cũ vẫn được link tới.
   */
  const mySpots = Array.isArray(post.spots) ? post.spots : [];
  const sameSpotResp = mySpots.length
    ? await getPosts({
        forList: true,
        type: "blog",
        isPublished: true,
        spots: mySpots,
        excludeSlug: post.slug,
        limit: 24,
        sort: "-publishedAt,-createdAt",
      })
    : { items: [] as Post[] };
  const myCluster = clusterOf(post);
  const overlap = (x: Post) => (x.spots ?? []).filter((s) => mySpots.includes(s)).length;
  // Thứ tự: cùng cụm trước (cẩm nang ↔ cẩm nang), rồi trùng nhiều điểm hơn,
  // rồi bài chuyên một điểm trước bài tổng hợp nhiều điểm; còn lại giữ ngày mới → cũ
  const sameSpot = ((sameSpotResp.items ?? []) as Post[])
    .slice()
    .sort(
      (a, b) =>
        Number(clusterOf(a) !== myCluster) - Number(clusterOf(b) !== myCluster) ||
        overlap(b) - overlap(a) ||
        (a.spots?.length ?? 0) - (b.spots?.length ?? 0),
    )
    .slice(0, 4);
  const sameSub = (x: Post) =>
    post.category === "knowledge"
      ? x.subCategory === post.subCategory
      : categoryOfPost(x) === categoryOfPost(post);
  const picked = new Set(sameSpot.map((x) => x.slug));
  const sameCluster = rotation
    .filter((x) => !picked.has(x.slug) && clusterOf(x) === myCluster && sameSub(x))
    .slice(0, Math.max(0, 6 - sameSpot.length));
  for (const x of sameCluster) picked.add(x.slug);
  const relatedPosts = [...sameSpot, ...sameCluster, ...rotation.filter((x) => !picked.has(x.slug))];

  // Thẻ "Điểm bay liên quan": mỗi trang /spots một thẻ (Đồi Bù + Viên Nam
  // cùng về /spots/doi-bu); điểm chưa có trang (Đại Tuệ) thì bỏ.
  const spotCards: { page: string; name: string }[] = [];
  for (const key of mySpots) {
    const info = SPOT_TAGS.find((x) => x.key === key);
    if (!info?.page) continue;
    const name = info.name[lang as keyof typeof info.name] ?? info.name.en;
    const existing = spotCards.find((c) => c.page === info.page);
    if (existing) existing.name = `${existing.name} · ${name}`;
    else spotCards.push({ page: info.page, name });
  }

  const title = pickTitle(post, lang);
  const excerpt = pickExcerpt(post, lang);
  /**
   * Link /blog/<sản phẩm> trong nội dung → thẳng /store/<danh mục>/<slug>
   * (trang /blog/<sản phẩm> giờ chỉ là chuyển hướng 308).
   */
  const productPaths = await getProductPathMap();
  const content = rewriteProductLinks(pickContent(post, lang), productPaths);
  const rawBlocks = pickBlocks(post, lang);
  const blocks: ContentBlock[] = Object.keys(productPaths).length
    ? (JSON.parse(rewriteProductLinks(JSON.stringify(rawBlocks), productPaths)) as ContentBlock[])
    : rawBlocks;
  const canRenderBlocks = blocks.length > 0 && hasVisibleBlockData(blocks);
  const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
  /** Ảnh bìa hiển thị: bản Cloudinary đã nén/đổi định dạng (URL gốc giữ cho JSON-LD). */
  const coverDisplay = cloudinaryOptimize(cover);
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
      title: pickTitle(item, lang),
      cover: cloudinaryOptimize(item.coverImage || item.thumbnail || "/images/mebayluon.jpg", 600),
      dateLabel: itemDate
        ? new Date(itemDate).toLocaleDateString(locale)
        : undefined,
    };
  });

  const schemaDates = articleSchemaDates(post);

  /**
   * URL trong JSON-LD theo NGÔN NGỮ CỦA TRANG (SEO 01/10/2026): trước đây mọi
   * bản /en, /fr… đều khai URL tiếng Việt. Bài chưa dịch sang ngôn ngữ đang
   * xem (vd /ru/blog/x hiện bản tiếng Anh) thì URL bài = canonical (/en/…),
   * còn các bậc giữa của breadcrumb (/ru/blog) vẫn theo ngôn ngữ trang.
   */
  const postPath = `/blog/${post.slug || slug}`;
  const available = postLocales(post);
  const postUrl = canonicalUrlFor(postPath, urlLocale, available);
  const contentLocale: Locale =
    available.length === 0 || available.includes(urlLocale)
      ? urlLocale
      : available.includes("en")
        ? "en"
        : available[0];

  const author = findArticleAuthor(post.author);
  const articleSchema = generateArticleSchema({
    title,
    description: excerpt,
    image: cover,
    ...schemaDates,
    author: author ? author.name : String(post.author || "Mebayluon Paragliding"),
    authorIsBrand: !author && isBrandAuthor(post.author),
    authorId: author ? pilotPersonId(author.pilotSlug) : undefined,
    authorUrl: author ? authorProfileUrl(author, urlLocale) : undefined,
    authorJobTitle: author ? author.jobTitle[contentLocale] : undefined,
    url: postUrl,
    inLanguage: contentLocale,
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
    { name: crumb.home, url: localizedUrl("/", urlLocale) },
    backUrl === "/knowledge"
      ? { name: crumb.knowledge, url: localizedUrl("/knowledge", urlLocale) }
      : { name: crumb.blog, url: localizedUrl("/blog", urlLocale) },
    { name: title, url: postUrl },
  ]);

  const videoSchemas = collectPostVideos(blocks, {
    title,
    description: excerpt,
  }).map((video) =>
    generateVideoSchema(video, {
      pageUrl: postUrl,
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

              {/* Dòng tác giả — chỉ người viết có hồ sơ (lib/authors.ts) */}
              {author && (
                <p className="mb-2 text-center text-sm text-white/80">
                  {AUTHOR_LABEL[lang]}:{" "}
                  <Link
                    href={`/pilots/${author.pilotSlug}`}
                    rel="author"
                    className="font-semibold text-white underline-offset-4 hover:underline"
                  >
                    {author.name}
                  </Link>
                  {" · "}
                  <span className="text-white/70">{author.jobTitle[lang]}</span>
                </p>
              )}

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
                    src={coverDisplay}
                    alt={title}
                    width={1200}
                    height={675}
                    sizes="(min-width: 1280px) 860px, (min-width: 1024px) 70vw, 100vw"
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
                    <div dangerouslySetInnerHTML={{ __html: linkifyPhonesInHtml(optimizeContentImages(fillMissingImgAlt(content, title))) }} />
                  ) : (
                    <div className="whitespace-pre-line">{linkifyPhones(content)}</div>
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

              {/* Điểm bay liên quan — trang điểm bay + đặt bay (bài có `spots`) */}
              {spotCards.length > 0 && (
                <section className="mt-10 rounded-2xl border border-white/15 bg-black/25 p-5 text-white backdrop-blur-lg">
                  <h2 className="mb-4 text-xl font-bold">{ui.relatedSpots}</h2>
                  <ul className="space-y-3">
                    {spotCards.map((c) => (
                      <li
                        key={c.page}
                        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-semibold leading-snug">{c.name}</span>
                        <span className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href={`/spots/${c.page}`}
                            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
                          >
                            {ui.viewSpot}
                          </Link>
                          {/* Điểm chưa mở đặt online (Trạm Tấu) thì không có nút đặt */}
                          {bookingLocationForSpot(c.page) && (
                            <Link
                              href={bookingHrefForSpot(c.page)}
                              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                            >
                              {ui.bookSpot}
                            </Link>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
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
