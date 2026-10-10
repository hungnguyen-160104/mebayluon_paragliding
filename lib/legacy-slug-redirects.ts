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

  /* ===== Search Console 10-8-2026: "Đã thu thập dữ liệu — chưa lập chỉ mục"
   * Google bò vào URL này ngày 28-6-2026 và nhận trang "Bài viết không tồn
   * tại". Slug chưa bao giờ có trong DB (đã dò cả slugHistory). Bài đúng chủ
   * đề, gần như trùng tiêu đề, là "Bay dù lượn Đồi Bù – điểm bay gần Hà Nội".
   */
  "bay-du-luon-doi-bu-trai-nghiem-bay-gan-ha-noi": "bay-du-luon-doi-bu",

  /* ===== Gộp bài trùng chủ đề 01-10-2026 =====
   * Bài yếu hơn đã được gộp nội dung vào bài giữ lại rồi gỡ đăng. 301 giữ
   * nguyên tiền tố ngôn ngữ (/en/blog/cũ -> /en/blog/mới). Sao lưu + lệnh hoàn
   * tác: ~/backups/gop-bai/.
   */
  "khoa-hoc-du-luon-1-kem-1": "paragliding-course-vietnam",
  "diem-bay-du-luon-doi-bu": "bay-du-luon-doi-bu",
  "bay-du-luon-hanoi": "du-luon-vien-nam",
  "bay-du-luon-bien-may-sa-pa": "bay-du-luon-sa-pa-muong-hoa",
  "dia-diem-bay-du-luon-dep-nhat-viet-nam": "cac-diem-bay-du-luon-mebayluon",
  "thang-6-thung-lung-lim-mong": "bay-du-luon-mua-nuoc-do-mu-cang-chai",
  "le-hoi-du-luon-ta-dung-2022": "bay-du-luon-ho-ta-dung-2022",
  "ket-qua-giai-du-luon-ta-dung-2022": "bay-du-luon-ho-ta-dung-2022",
  "10-su-that-thu-vi-ve-bay-du-luon": "nhung-hieu-lam-pho-bien-ve-du-luon",

  /* Slug WordPress cũ của bài Khau Phạ: trước đây chỉ chuyển trong trang
   * (previousSlugs) — HTTP 200, Google không tính là 301. */
  deokhaupha: "du-luon-deo-khau-pha",

  /* Gộp bài Tú Lệ 10-10-2026 (chủ: "viết chung 1 bài"): bài suối khoáng gộp vào bài Le Champ,
   * bài cũ gỡ đăng (giữ trong DB, sao lưu ~/backups/gop-bai/). */
  "suoi-khoang-nong-tu-le": "le-champ-tu-le-resort-suoi-khoang-nong",

  /* Gộp cẩm nang Mù Cang Chải cũ 10-10-2026: ảnh, thông tin chuyển sang bài trụ bản đồ check-in và các bài nhánh;
   * bài cũ gỡ đăng (giữ trong DB, sao lưu ~/backups/gop-bai/). */
  "cam-nang-du-lich-mu-cang-chai-lao-cai": "ban-do-du-lich-tu-le-khau-pha-mu-cang-chai",

  /* Gộp hai bài Mâm Xôi 10-10-2026 (chủ: "đưa vào cùng 1 bài viết"): Mâm Xôi bé thành mục #doi-mam-xoi-be của bài Mâm Xôi lớn;
   * bài cũ gỡ đăng (giữ trong DB, sao lưu ~/backups/gop-bai/). */
  "doi-mam-xoi-be-mu-cang-chai": "doi-mam-xoi-la-pan-tan-mu-cang-chai",
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
