// lib/post-translation.ts
/**
 * CHỌN NỘI DUNG BÀI VIẾT THEO NGÔN NGỮ (29/09/2026).
 *
 * Bài có sẵn hai bản trong cột riêng: tiếng Việt (`titleVi`...) và tiếng Anh
 * (`title`...). Các ngôn ngữ khác (fr, zh, ru, hi) nằm trong `translations`.
 * Một bản dịch chỉ được DÙNG khi:
 *   - có tiêu đề và có nội dung (khối hoặc HTML), và
 *   - `published: true` — tức người biết tiếng đã đọc duyệt.
 * Bản dịch máy chưa duyệt thì trang /fr/blog/x vẫn hiện tiếng Anh, canonical
 * về /en và noindex như cũ — Google phạt nội dung dịch máy hàng loạt không
 * qua biên tập, nên thà chưa hiện còn hơn hiện bản chưa đọc.
 *
 * Trang bài, trang danh sách, sitemap và hreflang đều đi qua đây để luôn nói
 * cùng một điều.
 */
import type { ContentBlock, Post, PostTranslation } from "@/types/frontend/post";

export const NGON_NGU_DICH = ["fr", "zh", "ru", "hi"] as const;
export type NgonNguDich = (typeof NGON_NGU_DICH)[number];

const coChu = (v: unknown) => typeof v === "string" && v.trim().length > 0;

type PostCoBanDich = Pick<Post, "translations"> & { contentMode?: Post["contentMode"] };

/** Bản dịch DÙNG ĐƯỢC của bài ở ngôn ngữ `lang`, hoặc null. */
export function banDich(post: PostCoBanDich | null | undefined, lang: string): PostTranslation | null {
  if (!post || !(NGON_NGU_DICH as readonly string[]).includes(lang)) return null;
  const t = post.translations?.[lang as NgonNguDich];
  if (!t || !t.published || !coChu(t.title)) return null;
  const coNoiDung = (Array.isArray(t.contentBlocks) && t.contentBlocks.length > 0) || coChu(t.content);
  return coNoiDung ? t : null;
}

/** Các ngôn ngữ dịch đã duyệt của bài — cho hreflang / sitemap. */
export function ngonNguDaDich(post: PostCoBanDich | null | undefined): NgonNguDich[] {
  return NGON_NGU_DICH.filter((l) => banDich(post, l) !== null);
}

function stripHtml(html: string) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
const gon = (s: string) => String(s || "").replace(/\s+/g, " ").trim();

/** Tiêu đề theo ngôn ngữ: vi → cột Vi; bản dịch đã duyệt; còn lại → tiếng Anh. */
export function chonTieuDe(post: Post, lang: string): string {
  if (lang === "vi") return post.titleVi || post.title || "";
  return banDich(post, lang)?.title || post.title || post.titleVi || "";
}

export function chonTomTat(post: Post, lang: string): string {
  if (lang === "vi") {
    if (post.excerptVi?.trim()) return gon(post.excerptVi);
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
  }
  const t = banDich(post, lang);
  if (t) {
    if (t.excerpt?.trim()) return gon(t.excerpt);
    const text = stripHtml(t.content || "");
    if (text) return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
  }
  if (post.excerpt?.trim()) return gon(post.excerpt);
  const text = stripHtml(post.content || post.contentVi || "");
  return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
}

export function chonNoiDung(post: Post, lang: string): string {
  if (lang === "vi") return post.contentVi || post.content || "";
  const t = banDich(post, lang);
  if (t?.content?.trim()) return t.content;
  return post.content || post.contentVi || "";
}

export function chonKhoi(post: Post, lang: string): ContentBlock[] {
  let blocks: unknown;
  if (lang === "vi") blocks = post.contentBlocksVi?.length ? post.contentBlocksVi : post.contentBlocks;
  else {
    const t = banDich(post, lang);
    blocks = t?.contentBlocks?.length ? t.contentBlocks : post.contentBlocks?.length ? post.contentBlocks : post.contentBlocksVi;
  }
  return Array.isArray(blocks) ? (blocks as ContentBlock[]) : [];
}
