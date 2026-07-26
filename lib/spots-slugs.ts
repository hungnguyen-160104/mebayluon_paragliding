// lib/spots-slugs.ts
/**
 * Danh sách slug chuẩn của các điểm bay.
 *
 * Dùng chung cho sitemap và canonical của trang /spots/[slug].
 * Dữ liệu chi tiết vẫn nằm trong app/spots/[slug]/page.tsx (SPOTS);
 * khi thêm điểm bay mới ở đó, nhớ bổ sung slug vào đây để sitemap
 * biết đường dẫn mới.
 */

/** Slug chuẩn — mỗi URL này là một trang duy nhất, được đưa vào sitemap. */
export const SPOT_SLUGS = [
  "muong-hoa-sapa",
  "son-tra",
  "khau-pha",
  "tram-tau",
  "ha-giang",
  "vien-nam",
  "doi-bu",
  "dalat",
] as const;

/**
 * Slug phụ (alias) → slug chuẩn.
 *
 * Ví dụ /spots/sapa hiển thị y hệt /spots/muong-hoa-sapa. Nếu không khai
 * canonical, Google coi đây là nội dung trùng lặp và có thể bỏ index cả hai.
 * Alias KHÔNG được đưa vào sitemap.
 */
export const SPOT_ALIAS_TO_CANONICAL: Record<string, string> = {
  sapa: "muong-hoa-sapa",
};

/** Trả về slug chuẩn cho một slug bất kỳ (alias sẽ được quy về slug gốc). */
export function canonicalSpotSlug(slug: string): string {
  return SPOT_ALIAS_TO_CANONICAL[slug] ?? slug;
}
