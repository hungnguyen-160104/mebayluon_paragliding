// lib/seo-text.ts
/**
 * Cắt chuỗi cho thẻ meta (title/description) ở RANH GIỚI TỪ, thêm "…".
 *
 * Trước đây vài trang cắt cứng `text.slice(0, 150)` nên mô tả trên Google dừng
 * giữa chữ ("…phi công chuyên ngh"). Chữ Trung/Hindi không có dấu cách thì cắt
 * đúng số ký tự như cũ.
 */
export function truncateAtWord(text: string, max: number): string {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.\-–—|(]+$/u, "")}…`;
}
