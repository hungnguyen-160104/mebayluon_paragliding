// lib/site-config.ts
/**
 * Nguồn duy nhất khai báo tên miền chính của website.
 *
 * Trước đây mỗi file tự khai báo lại "https://mebayluon.com", trong khi
 * server thực tế redirect 307 từ apex sang www. Hậu quả: canonical, sitemap
 * và robots.txt đều trỏ vào URL bị redirect, khiến Google nhận tín hiệu mâu
 * thuẫn và không lập index. Mọi nơi cần URL tuyệt đối phải import từ đây.
 *
 * Không dùng NEXT_PUBLIC_API_BASE_URL làm fallback vì URL API có thể khác
 * URL website.
 */

/**
 * Tên miền chuẩn (canonical host), không có dấu "/" ở cuối.
 *
 * Phải khớp với tên miền mà server trả về HTTP 200, không phải tên miền
 * bị redirect. Kiểm tra bằng: curl -I https://mebayluon.com/
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.mebayluon.com"
).replace(/\/$/, "");

export const SITE_NAME = "Mebayluon Paragliding";

/**
 * Mã xác minh quyền sở hữu của Google Search Console (thẻ meta).
 *
 * Lấy tại Search Console > Cài đặt > Xác minh quyền sở hữu > Thẻ HTML,
 * chỉ copy phần giá trị trong content="...".
 *
 * Website còn được xác minh song song bằng file
 * public/googlea7228a1dc33df7a0.html, nên biến này để trống vẫn an toàn.
 */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

/**
 * Ghép một đường dẫn tương đối thành URL tuyệt đối trên tên miền chuẩn.
 *
 * Ví dụ: absoluteUrl("/blog") -> "https://www.mebayluon.com/blog"
 */
export function absoluteUrl(path = "/"): string {
  try {
    return new URL(path, `${SITE_URL}/`).toString().replace(/\/$/, "") || SITE_URL;
  } catch {
    return SITE_URL;
  }
}

/* ============================================================
 * Đa ngôn ngữ theo URL
 *
 * Website dịch 6 thứ tiếng nhưng trước đây đổi ngôn ngữ hoàn toàn
 * bằng cookie trên MỘT URL duy nhất — Google chỉ index được bản
 * tiếng Việt, 5 bản dịch còn lại vô hình với tìm kiếm nước ngoài.
 *
 * Giải pháp: mỗi ngôn ngữ có prefix URL riêng (/en, /fr, /ru, /zh,
 * /hi; tiếng Việt là mặc định không prefix). middleware.ts rewrite
 * các URL prefix về trang gốc kèm header x-locale để server render
 * đúng ngôn ngữ, còn canonical/hreflang khai báo qua các helper này.
 * ============================================================ */

export const LOCALES = ["vi", "en", "fr", "ru", "zh", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * URL tuyệt đối của một trang theo từng ngôn ngữ.
 *
 * localizedUrl("/spots", "ru") -> "https://www.mebayluon.com/ru/spots"
 * localizedUrl("/spots", "vi") -> "https://www.mebayluon.com/spots"
 */
export function localizedUrl(path: string, locale: Locale): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return locale === DEFAULT_LOCALE
    ? absoluteUrl(clean || "/")
    : absoluteUrl(`/${locale}${clean}`);
}

/**
 * Bản đồ hreflang cho một trang — dùng cho metadata.alternates.languages
 * và sitemap. x-default trỏ về bản tiếng Việt (bản gốc, không prefix).
 *
 * `available` giới hạn danh sách ngôn ngữ được khai báo. CHỈ khai ngôn ngữ
 * thật sự có nội dung riêng: khai một ngôn ngữ mà trang lại trả về nội dung
 * của ngôn ngữ khác là gửi tín hiệu sai cho Google (Search Console báo lỗi
 * hreflang, đồng thời các URL đó bị coi là nội dung trùng lặp).
 *
 * Giao diện web đã dịch đủ 6 thứ tiếng nên các trang tĩnh cứ để mặc định.
 * Riêng trang bài viết / sản phẩm thì nội dung chỉ có tiếng Việt + tiếng Anh,
 * nên phải truyền `available` để giới hạn lại.
 */
export function languageAlternates(
  path: string,
  available: readonly Locale[] = LOCALES,
): Record<string, string> {
  const langs = available.length > 0 ? available : LOCALES;

  // x-default trỏ về bản tiếng Việt nếu có, không thì lấy bản đầu danh sách
  const fallback = langs.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : langs[0];

  const map: Record<string, string> = {
    "x-default": localizedUrl(path, fallback),
  };
  for (const locale of langs) {
    map[locale] = localizedUrl(path, locale);
  }
  return map;
}

/**
 * URL chuẩn (canonical) cho trang đang xem.
 *
 * Khi người dùng mở một ngôn ngữ CHƯA có bản dịch (ví dụ /fr/blog/abc mà bài
 * mới chỉ có tiếng Việt + Anh), trang vẫn hiện nội dung tiếng Anh. Lúc đó
 * canonical phải trỏ về bản tiếng Anh thay vì tự trỏ về chính nó — như vậy
 * Google dồn toàn bộ tín hiệu xếp hạng về một URL duy nhất thay vì chia nhỏ
 * cho 5 URL nội dung giống hệt nhau.
 */
export function canonicalUrlFor(
  path: string,
  locale: Locale,
  available: readonly Locale[] = LOCALES,
): string {
  if (available.length === 0 || available.includes(locale)) {
    return localizedUrl(path, locale);
  }

  // Ngôn ngữ này chưa có bản dịch → gộp về bản nội dung đang thực sự hiển thị
  const target = available.includes("en")
    ? "en"
    : available.includes(DEFAULT_LOCALE)
      ? DEFAULT_LOCALE
      : available[0];

  return localizedUrl(path, target);
}
