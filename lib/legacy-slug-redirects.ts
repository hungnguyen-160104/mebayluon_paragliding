// lib/legacy-slug-redirects.ts
/**
 * Bảng chuyển hướng slug bài viết CŨ -> slug MỚI.
 *
 * Dùng khi đổi slug một bài đã được Google index hoặc đã share ra ngoài:
 * URL cũ sẽ 404 và mất toàn bộ thứ hạng + backlink đã tích luỹ. Khai vào
 * đây thì /blog/<slug-cũ> tự động 301 sang /blog/<slug-mới>.
 *
 * Vì sao không tự dò được: MongoDB không lưu lịch sử slug, và slug nằm
 * trong DB chứ không phải trong code nên git cũng không có vết. Mỗi lần
 * đổi slug, thêm một dòng vào đây NGAY để không mất traffic.
 *
 * Quy tắc:
 * - Key: slug cũ (chữ thường, không có "/blog/").
 * - Value: slug mới đang dùng trong DB.
 * - Không tạo vòng lặp (A -> B rồi B -> A).
 */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  // Ví dụ — bỏ dấu // và sửa lại khi có slug thật cần chuyển:
  // "slug-cu-cua-bai": "slug-moi-cua-bai",
};

/**
 * Trả về slug mới nếu slug được truyền vào là slug cũ đã khai ở trên.
 * Trả về null nếu không có ánh xạ.
 */
export function resolveLegacySlug(slug: string): string | null {
  const target = LEGACY_SLUG_REDIRECTS[slug.toLowerCase()];
  return target && target !== slug ? target : null;
}
