// lib/post-locales.ts
/**
 * Xác định một bài viết / sản phẩm THẬT SỰ có nội dung ở những ngôn ngữ nào.
 *
 * Bối cảnh: giao diện web đã dịch đủ 6 thứ tiếng, nhưng NỘI DUNG bài viết
 * trong database chỉ có 2 cột — tiếng Việt (`titleVi`/`contentVi`) và tiếng
 * Anh (`title`/`content`). Trước đây mọi trang đều khai hreflang đủ 6 ngôn
 * ngữ, nên /fr/blog/x, /ru/blog/x, /zh/blog/x... đều nói với Google là bản
 * dịch riêng trong khi thực chất cùng trả về nội dung tiếng Anh. Google
 * nhận tín hiệu mâu thuẫn và coi đó là nội dung trùng lặp.
 *
 * Hàm này trả về đúng danh sách ngôn ngữ có nội dung, để:
 *   - hreflang chỉ khai những ngôn ngữ đó,
 *   - canonical của ngôn ngữ chưa dịch trỏ về bản tiếng Anh,
 *   - sitemap chỉ liệt kê những URL có thật.
 *
 * KHI DỊCH THÊM: thêm mã ngôn ngữ vào mảng `translatedLangs` của bài trong
 * MongoDB (ví dụ ["fr"]). Hreflang và sitemap tự động có thêm bản đó cho
 * riêng bài này — không phải sửa code.
 */

import { type Locale } from "@/lib/site-config";
import { ngonNguDaDich } from "@/lib/post-translation";

type PostLike = {
  title?: unknown;
  titleVi?: unknown;
  content?: unknown;
  contentVi?: unknown;
  translatedLangs?: unknown;
  translations?: unknown;
};

const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

/**
 * Danh sách ngôn ngữ có nội dung riêng cho bài này.
 * Luôn có ít nhất một phần tử để không sinh ra trang không có hreflang nào.
 */
export function postLocales(post: PostLike | null | undefined): Locale[] {
  if (!post) return ["vi"];

  const out: Locale[] = [];

  // Bản tiếng Việt là bản gốc — coi là có nếu còn tiêu đề
  if (hasText(post.titleVi) || hasText(post.contentVi)) out.push("vi");

  // Bản tiếng Anh nằm ở cột không hậu tố
  if (hasText(post.title) || hasText(post.content)) out.push("en");

  /**
   * Các ngôn ngữ ĐÃ DỊCH VÀ ĐÃ DUYỆT (29/09/2026): tính từ nội dung thật trong
   * `translations`, không tin cờ `translatedLangs` nữa — cờ đó bật mà chưa có
   * nội dung thì /fr/blog/x khai là bản riêng trong khi vẫn hiện tiếng Anh.
   */
  for (const code of ngonNguDaDich(post as Parameters<typeof ngonNguDaDich>[0])) {
    if (!out.includes(code as Locale)) out.push(code as Locale);
  }

  return out.length > 0 ? out : ["vi"];
}
