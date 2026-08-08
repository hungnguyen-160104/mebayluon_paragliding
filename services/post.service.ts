import { Types } from "mongoose";
import { Post } from "@/models/Post.model";
import { toSlug } from "@/utils/slug";
import { estimateReadTime } from "@/utils/readTime";
import type { ContentBlock, EmbedType } from "@/types/frontend/post";

export type PostInput = {
  title: string;
  titleVi: string;

  content?: string;
  contentVi?: string;

  contentBlocks?: ContentBlock[];
  contentBlocksVi?: ContentBlock[];

  excerpt?: string;
  excerptVi?: string;

  coverImage?: string;
  author?: string;
  category?: string;
  subCategory?: string;
  blogCategory?: string;
  tags?: string[];
  slug?: string;
  isPublished?: boolean;

  type?: "blog" | "product";
  storeCategory?: string;
  price?: number;

  mapUrl?: string;
  lat?: number;
  lng?: number;

  language?: string;

  fixed?: boolean;
  isFixed?: boolean;
  fixedKey?: string | null;
};

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function autoExcerpt(html: string, maxLength = 180): string {
  const plain = stripHtml(html);
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}…`;
}

function normalizeBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "published", "public"].includes(v)) return true;
  if (["false", "0", "no", "n", "off", "draft"].includes(v)) return false;
  if (v === "all") return undefined;
  return undefined;
}

async function createUniqueSlug(baseTitle: string, currentId?: string) {
  const baseSlug = toSlug(baseTitle).toLowerCase() || `post-${Date.now().toString(36)}`;
  let slug = baseSlug;
  let n = 1;

  while (
    await Post.exists(
      currentId
        ? { slug, _id: { $ne: currentId } }
        : { slug }
    )
  ) {
    slug = `${baseSlug}-${n++}`;
  }

  return slug;
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function normalizeBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any, index) => ({
      id: String(item?.id || `block-${index}-${Date.now()}`),
      type: item?.type || "paragraph",
      data: typeof item?.data === "object" && item?.data ? item.data : {},
    }));
}

function textToParagraphBlock(text: string): ContentBlock[] {
  const plain = stripHtml(text || "");
  if (!plain) return [];
  return [
    {
      id: `block-${Date.now()}`,
      type: "paragraph",
      data: { text: plain },
    },
  ];
}

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      const data = block.data || {};

      switch (block.type) {
        case "heading": {
          const level = data.level || 2;
          const tag = `h${Math.min(4, Math.max(1, Number(level)))}`;
          return `<${tag}>${escapeHtml(data.text || "")}</${tag}>`;
        }

        case "paragraph":
          return `<p>${escapeHtml(data.text || "")}</p>`;

        case "image":
          return `
            <figure>
              <img src="${data.url || ""}" alt="${escapeHtml(data.alt || "")}" />
              ${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ""}
            </figure>
          `;

        case "quote":
          return `
            <blockquote>
              <p>${escapeHtml(data.text || "")}</p>
              ${data.author ? `<cite>${escapeHtml(data.author)}</cite>` : ""}
            </blockquote>
          `;

        case "bulletList":
          return `<ul>${(data.items || [])
            .map((item: string) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`;

        case "divider":
          return "<hr />";

        case "cta":
          return `<p><a href="${data.link || "#"}">${escapeHtml(data.text || "")}</a></p>`;

        case "embed": {
          const rawUrl = String(data.url || "").trim();
          const embedType = data.embedType || detectEmbedType(rawUrl);

          if (embedType === "youtube") {
            const embedUrl = getYouTubeEmbedUrl(rawUrl);
            if (!embedUrl) {
              return rawUrl
                ? `<p><a href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                    data.caption || rawUrl
                  )}</a></p>`
                : "";
            }

            return `
              <figure>
                <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;">
                  <iframe
                    src="${embedUrl}"
                    title="${escapeHtml(data.caption || "YouTube video")}"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                  ></iframe>
                </div>
                ${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ""}
              </figure>
            `;
          }

          if (embedType === "googleMaps") {
            return rawUrl
              ? `<p><a href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  data.caption || "Mở Google Maps"
                )}</a></p>`
              : "";
          }

          return rawUrl
            ? `<p><a href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                data.caption || rawUrl
              )}</a></p>`
            : "";
        }

        default:
          return "";
      }
    })
    .join("\n");
}

function computeReadTime(englishHtml?: string, vietnameseHtml?: string) {
  const merged = `${englishHtml || ""}\n${vietnameseHtml || ""}`.trim();
  return estimateReadTime(merged);
}

/**
 * Đổi from/to (YYYY-MM-DD) thành điều kiện $gte/$lte cho Mongo.
 * `to` được đẩy tới cuối ngày để bài đăng lúc 20h vẫn lọt vào khoảng.
 * Trả về null khi không có mốc nào hợp lệ.
 */
function buildDateRange(from?: unknown, to?: unknown) {
  const range: Record<string, Date> = {};

  if (from) {
    const d = new Date(`${String(from)}T00:00:00.000`);
    if (!Number.isNaN(d.getTime())) range.$gte = d;
  }

  if (to) {
    const d = new Date(`${String(to)}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) range.$lte = d;
  }

  return Object.keys(range).length ? range : null;
}

export async function listPosts(query: any = {}) {
  const {
    page = 1,
    limit = 20,
    q,
    published = "all",
    sort = "-updatedAt,-createdAt",
    category,
    subCategory,
    type,
    storeCategory,
    from,
    to,
  } = query;

  const filter: any = {};
  const andFilters: any[] = [];

  if (q) {
    const rx = new RegExp(String(q), "i");
    andFilters.push({
      $or: [
        { title: rx },
        { titleVi: rx },
        { excerpt: rx },
        { excerptVi: rx },
        { content: rx },
        { contentVi: rx },
        { tags: { $in: [rx] } },
      ],
    });
  }

  /**
   * Lọc theo khoảng ngày đăng (from/to dạng YYYY-MM-DD, tính cả hai đầu).
   *
   * Bài chưa xuất bản không có publishedAt, nên xét cả createdAt: nếu có
   * publishedAt thì so theo publishedAt, không có thì so theo createdAt —
   * đúng với cột ngày mà trang quản trị đang hiện.
   */
  const dateRange = buildDateRange(from, to);
  if (dateRange) {
    andFilters.push({
      $or: [
        { publishedAt: dateRange },
        {
          publishedAt: { $in: [null, undefined] },
          createdAt: dateRange,
        },
      ],
    });
  }

  if (category) filter.category = String(category);
  if (subCategory) filter.subCategory = String(subCategory);
  if (type) filter.type = String(type);
  if (storeCategory) filter.storeCategory = String(storeCategory);

  const publishedBool = normalizeBooleanLike(published);
  if (publishedBool === true) filter.isPublished = true;
  if (publishedBool === false) filter.isPublished = false;

  if (andFilters.length > 0) {
    filter.$and = andFilters;
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

  // Mongoose KHÔNG hiểu chuỗi sort ngăn cách bằng dấu phẩy
  // ("-publishedAt,-createdAt" bị coi là một tên trường không tồn tại nên
  // kết quả trả về không sort gì cả — chính là lỗi "danh sách bài trong
  // admin xáo trộn"). Tách dấu phẩy thành object sort đúng chuẩn.
  const sortObj: Record<string, 1 | -1> = {};
  for (const part of String(sort).split(",")) {
    const f = part.trim();
    if (!f) continue;
    if (f.startsWith("-")) sortObj[f.slice(1)] = -1;
    else sortObj[f] = 1;
  }

  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Post.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  };
}

export async function getPostBySlug(slug: string, publishedOnly = false) {
  const filter: any = { slug };
  if (publishedOnly) filter.isPublished = true;
  return Post.findOne(filter);
}

export async function getPostById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return Post.findById(id);
}

export async function addView(slug: string) {
  return Post.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true, upsert: false }
  );
}

export async function createPost(data: PostInput, _auth?: any) {
  const title = String(data.title || "").trim();
  const titleVi = String(data.titleVi || "").trim();

  if (!title && !titleVi) {
    const err: any = new Error("Missing bilingual title");
    err.status = 400;
    throw err;
  }

  const normalizedTitle = title || titleVi;
  const normalizedTitleVi = titleVi || title || normalizedTitle;

  const blocksEn = normalizeBlocks(data.contentBlocks);
  const blocksVi = normalizeBlocks(data.contentBlocksVi);

  const fallbackContentEn = String(data.content || "").trim();
  const fallbackContentVi = String(data.contentVi || "").trim();

  const normalizedBlocksEn = blocksEn.length ? blocksEn : textToParagraphBlock(fallbackContentEn);
  const normalizedBlocksVi = blocksVi.length
    ? blocksVi
    : textToParagraphBlock(fallbackContentVi || fallbackContentEn);

  const normalizedContent = blocksToHtml(normalizedBlocksEn);
  const normalizedContentVi = blocksToHtml(normalizedBlocksVi);

  const slug =
    data.slug?.trim()
      ? await createUniqueSlug(data.slug.trim())
      : await createUniqueSlug(normalizedTitle || normalizedTitleVi);

  const isPublished = data.isPublished ?? true;

  const doc = await Post.create({
    title: normalizedTitle,
    titleVi: normalizedTitleVi,
    slug,

    content: normalizedContent,
    contentVi: normalizedContentVi,

    contentBlocks: normalizedBlocksEn,
    contentBlocksVi: normalizedBlocksVi,

    excerpt: data.excerpt?.trim() || autoExcerpt(normalizedContent),
    excerptVi: data.excerptVi?.trim() || autoExcerpt(normalizedContentVi),

    coverImage: data.coverImage || "",
    thumbnail: data.coverImage || "",
    author: data.author || "Admin",
    category: data.category || "news",
    subCategory: data.subCategory,
    blogCategory: data.blogCategory,
    tags: data.tags || [],
    language: "bilingual",
    readTime: computeReadTime(normalizedContent, normalizedContentVi),

    isPublished,
    publishedAt: isPublished ? new Date() : null,
    views: 0,

    type: data.type || (data.category === "store" ? "product" : "blog"),
    storeCategory: data.storeCategory,
    price: data.price,

    mapUrl: data.mapUrl || "",
    lat: data.lat,
    lng: data.lng,

    fixed: data.fixed ?? data.isFixed ?? false,
    fixedKey: data.fixedKey ?? undefined,
  });

  return doc;
}

export async function updatePost(id: string, data: Partial<PostInput>, _auth?: any) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }

  const current = await Post.findById(id);
  if (!current) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }

  const patch: any = { ...data };

  const nextTitle = typeof patch.title === "string" ? patch.title.trim() : current.title;
  const nextTitleVi =
    typeof patch.titleVi === "string" ? patch.titleVi.trim() : current.titleVi;

  patch.title = nextTitle || nextTitleVi || current.title;
  patch.titleVi = nextTitleVi || nextTitle || current.titleVi;

  /**
   * QUY TẮC SLUG (đừng nới lỏng!):
   * - Slug chỉ tự sinh từ tiêu đề LÚC TẠO MỚI (createPost).
   * - Khi CẬP NHẬT, slug chỉ đổi nếu người dùng CHỦ ĐỘNG truyền slug khác.
   *
   * Trước đây nhánh else-if tự sinh lại slug từ title mỗi lần lưu — mà
   * patch.title luôn được điền ở trên, nên SỬA MỘT CHỮ trong bài cũng làm
   * URL đổi và Google mất trang (đã xảy ra thật với 4 bài).
   */
  if (typeof patch.slug === "string" && patch.slug.trim()) {
    const nextSlug = await createUniqueSlug(patch.slug.trim(), id);
    if (nextSlug !== current.slug) {
      patch.slug = nextSlug;
      // Lưu vết slug cũ để URL cũ tự 301 về bài (xem app/blog/[slug])
      patch.$addToSet = { ...(patch.$addToSet || {}), previousSlugs: current.slug };
    } else {
      delete patch.slug;
    }
  } else {
    delete patch.slug;
  }

  const blocksEn = normalizeBlocks(
    patch.contentBlocks !== undefined ? patch.contentBlocks : current.contentBlocks
  );
  const blocksVi = normalizeBlocks(
    patch.contentBlocksVi !== undefined ? patch.contentBlocksVi : current.contentBlocksVi
  );

  const fallbackContentEn =
    typeof patch.content === "string" ? patch.content.trim() : current.content;
  const fallbackContentVi =
    typeof patch.contentVi === "string" ? patch.contentVi.trim() : current.contentVi;

  const normalizedBlocksEn = blocksEn.length ? blocksEn : textToParagraphBlock(fallbackContentEn);
  const normalizedBlocksVi = blocksVi.length
    ? blocksVi
    : textToParagraphBlock(fallbackContentVi || fallbackContentEn);

  patch.contentBlocks = normalizedBlocksEn;
  patch.contentBlocksVi = normalizedBlocksVi;

  patch.content = blocksToHtml(normalizedBlocksEn);
  patch.contentVi = blocksToHtml(normalizedBlocksVi);

  if (typeof patch.excerpt !== "string" || !patch.excerpt.trim()) {
    patch.excerpt = autoExcerpt(patch.content);
  } else {
    patch.excerpt = patch.excerpt.trim();
  }

  if (typeof patch.excerptVi !== "string" || !patch.excerptVi.trim()) {
    patch.excerptVi = autoExcerpt(patch.contentVi);
  } else {
    patch.excerptVi = patch.excerptVi.trim();
  }

  if (patch.coverImage !== undefined) {
    patch.thumbnail = patch.coverImage || "";
  }

  patch.language = "bilingual";
  patch.readTime = computeReadTime(patch.content, patch.contentVi);

  const nextPublished =
    typeof patch.isPublished === "boolean" ? patch.isPublished : current.isPublished;

  if (nextPublished && !current.publishedAt) {
    patch.publishedAt = new Date();
  } else if (!nextPublished) {
    patch.publishedAt = null;
  }

  if (patch.category === "store") {
    patch.type = "product";
  } else if (patch.category) {
    patch.type = "blog";
  }

  if (patch.fixed === undefined && patch.isFixed !== undefined) {
    patch.fixed = patch.isFixed;
  }

  const updated = await Post.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }

  return updated;
}

export async function deletePost(id: string, _auth?: any) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }

  const deleted = await Post.findByIdAndDelete(id);
  if (!deleted) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }

  return { ok: true, id };
}

export async function publishPost(
  id: string,
  body: { isPublished?: boolean } = {},
  _auth?: any
) {
  if (!Types.ObjectId.isValid(id)) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }

  const isPublished = body.isPublished ?? true;
  const updated = await Post.findByIdAndUpdate(
    id,
    {
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
    { new: true }
  );

  if (!updated) {
    const err: any = new Error("Post not found");
    err.status = 404;
    throw err;
  }

  return updated;
}