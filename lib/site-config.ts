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
