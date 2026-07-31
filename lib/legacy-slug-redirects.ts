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
  /* ===== Slug đổi ngày 28-7-2026 — Google đã index bản cũ, báo 404 =====
   * Slug cũ đặt theo tiếng Anh, slug mới theo tiếng Việt. Đối chiếu bằng
   * tiêu đề tiếng Anh của bài trong DB để chắc chắn đúng bài.
   */
  // "13 Common Myths About Paragliding"
  "cac-hieu-lam-pho-bien-ve-du-luon": "nhung-hieu-lam-pho-bien-ve-du-luon",
  // "Choosing Your First Paragliding Gear"
  "how-to-choose-paragliding-gears": "chon-thiet-bi-du-luon-dau-tien",
  // "Turbulence - Part 1: Sources"
  "turbulence-part-1": "nhieu-loan-phan-1-nguon-goc",
  // "Paraglider Structure, Materials and Maintenance"
  "paraglider-structure-materials-and-maintenance":
    "cau-truc-vat-lieu-bao-tri-du-luon",
  // "How to Deal With a Paraglider Collapse"
  "how-to-dealing-with-big-collapse": "xu-ly-sap-vom-du",
  // "Paraglider Aerodynamics Part 2: Flight Modes and Gliding"
  "paragliding-aerodynamic-part2": "khi-dong-hoc-du-luon-phan-2",
  // "P1 – P2 Paragliding Course for Complete Beginners"
  "paragliding-course-for-beginners": "khoa-hoc-du-luon-p1-p2",

  /* ===== Link điểm bay từ footer tiếng Anh CŨ (trước khi thay footer) =====
   * Footer cũ trỏ /blog/VienNam, /blog/DoiBu... — các slug này chưa bao giờ
   * tồn tại trong DB nên rơi vào trang "Bài viết không tồn tại". Map về bài
   * (hoặc trang) đúng chủ đề. Value bắt đầu bằng "/" = đường dẫn tuyệt đối.
   */
  viennam: "du-luon-vien-nam",
  doibu: "bay-du-luon-doi-bu",
  phinhho: "di-chuyen-den-tram-tau",
  sapa: "bay-du-luon-sa-pa-muong-hoa",
  // Đồng Văn không có bài blog riêng — về trang điểm bay Hà Giang
  dongvan: "/spots/ha-giang",
};

/**
 * Trả về slug mới nếu slug được truyền vào là slug cũ đã khai ở trên.
 * Trả về null nếu không có ánh xạ.
 */
export function resolveLegacySlug(slug: string): string | null {
  const target = LEGACY_SLUG_REDIRECTS[slug.toLowerCase()];
  return target && target !== slug ? target : null;
}

/** Value bắt đầu bằng "/" là đường dẫn tuyệt đối, không phải slug bài viết. */
export function isAbsoluteRedirect(target: string): boolean {
  return target.startsWith("/");
}
