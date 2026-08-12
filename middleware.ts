// middleware.ts
/**
 * Hai nhiệm vụ, chạy trước khi render bất cứ trang nào:
 *
 * 1. URL ngôn ngữ: /en/..., /fr/..., /ru/..., /zh/..., /hi/... được
 *    rewrite về trang gốc (không prefix) kèm header x-locale để server
 *    render đúng ngôn ngữ. Đồng thời set cookie "language" để khi khách
 *    bấm sang các link nội bộ (không prefix) vẫn giữ nguyên ngôn ngữ.
 *    Tiếng Việt là mặc định, không có prefix.
 *
 * 2. Chuẩn hóa URL bài viết về chữ thường bằng redirect 301 thật.
 *    Slug luôn được tạo ở dạng chữ thường, nhưng link cũ (footer trước
 *    đây, bài share Facebook...) có dạng /blog/DeoKhauPha. Trang blog là
 *    force-dynamic + streaming nên permanentRedirect() trong component
 *    chỉ tạo soft-redirect (header đã gửi, Google không tính 301) —
 *    middleware là nơi duy nhất trả về HTTP 301 chuẩn.
 */
import { NextRequest, NextResponse } from "next/server";

import { BAOBAY_COOKIE } from "@/lib/baobay/cookie";
import { resolveLegacySlug } from "@/lib/legacy-slug-redirects";

const LOCALE_PREFIX = /^\/(en|fr|ru|zh|hi)(\/.*)?$/;

/**
 * Bài đã đổi slug: trả về đường dẫn mới, hoặc null nếu không phải slug cũ.
 *
 * Phải xử lý ở middleware chứ không phải trong page: trang blog là
 * force-dynamic + streaming nên permanentRedirect() trong component chỉ tạo
 * soft-redirect (header đã gửi) — người dùng vẫn tới đúng bài nhưng Google
 * thấy HTTP 200 ở URL cũ, không tính là 301 và không chuyển thứ hạng.
 */
function legacyBlogPath(rest: string): string | null {
  const match = rest.match(/^\/blog\/([^/?#]+)\/?$/);
  if (!match) return null;

  const newSlug = resolveLegacySlug(decodeURIComponent(match[1]));
  if (!newSlug) return null;
  // Value bắt đầu "/" = trỏ thẳng sang trang khác (vd /spots/ha-giang)
  return newSlug.startsWith("/") ? newSlug : `/blog/${newSlug}`;
}

/**
 * Đường dẫn cha không có trang riêng (ví dụ /spots chỉ có /spots/[slug]).
 *
 * Bản không prefix đã được xử lý bằng redirects() trong next.config.mjs,
 * nhưng bản có prefix (/en/spots) thì không: middleware chạy TRƯỚC
 * redirects() và trả về rewrite, nên redirects() không còn cơ hội khớp.
 * Vì vậy phải tự redirect ở đây.
 */
const PARENT_PATH_REDIRECTS: Record<string, string> = {
  // /spots đã có trang danh sách riêng — không redirect nữa
  "/fixed": "/blog",
  // Viên Nam đã gộp vào thẻ Hà Nội (Đồi Bù – Viên Nam)
  "/spots/vien-nam": "/spots/doi-bu",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * Khu quản trị: chặn index bằng header thay vì thẻ meta.
   *
   * app/admin/layout.tsx là client component nên không export được metadata,
   * và các trang admin đều render phía client. X-Robots-Tag đi kèm phản hồi
   * nên không phụ thuộc vào việc trang có kịp render thẻ head hay không.
   * robots.txt vẫn Disallow /admin/ — header này là lớp thứ hai, có tác dụng
   * với những URL admin đã lọt vào Google từ trước khi có dòng Disallow.
   */
  if (pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  /**
   * Khu báo cáo nội bộ (/baocao): dữ liệu tiền và nhân sự.
   *
   * Đường cũ /baobay đã XOÁ HẲN theo yêu cầu chủ hệ thống — không chuyển hướng,
   * để 404 tự nhiên như mọi trang không tồn tại, không hé lộ là từng có gì ở đó.
   *
   * LƯU Ý matcher ở cuối tệp LOẠI TRỪ /api — nhánh này chỉ chạy cho TRANG.
   * Header bảo mật cho /api/baocao/* nằm ở next.config.mjs (headers()), đừng
   * thêm điều kiện /api vào đây rồi tưởng là xong: nó không bao giờ chạy.
   *
   * Ở đây CHỈ kiểm cookie có tồn tại hay không, KHÔNG xác thực chữ ký: Edge
   * runtime không chạy được jsonwebtoken. Cửa thật nằm ở các route handler
   * (middlewares/requireBaobay.ts) — cookie giả vào được trang nhưng không đọc
   * hay ghi được một dòng dữ liệu nào.
   */
  if (pathname === "/baocao" || pathname.startsWith("/baocao/")) {
    const isLoginPage = pathname === "/baocao" || pathname === "/baocao/";
    const hasSession = Boolean(request.cookies.get(BAOBAY_COOKIE)?.value);

    if (!isLoginPage && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/baocao";
      return internalHeaders(NextResponse.redirect(url));
    }

    return internalHeaders(NextResponse.next());
  }

  const localeMatch = pathname.match(LOCALE_PREFIX);

  if (localeMatch) {
    const locale = localeMatch[1];
    const rest = localeMatch[2] || "/";

    // Slug viết hoa trong bản có prefix: 301 về URL chuẩn giữ prefix
    if (rest.startsWith("/blog/") && /[A-Z]/.test(rest)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${rest.toLowerCase()}`;
      return NextResponse.redirect(url, 301);
    }

    // Bài đổi slug, bản có prefix ngôn ngữ: 301 giữ nguyên prefix
    const localeLegacy = legacyBlogPath(rest);
    if (localeLegacy) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${localeLegacy}`;
      return NextResponse.redirect(url, 301);
    }

    // Đường dẫn cha 404 trong bản có prefix: 301 giữ nguyên ngôn ngữ
    const parentTarget = PARENT_PATH_REDIRECTS[rest.replace(/\/$/, "")];
    if (parentTarget) {
      const [targetPath, hash] = parentTarget.split("#");
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${targetPath === "/" ? "" : targetPath}`;
      url.hash = hash ? `#${hash}` : "";
      return NextResponse.redirect(url, 301);
    }

    const url = request.nextUrl.clone();
    url.pathname = rest;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);

    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });

    // Giữ ngôn ngữ khi khách điều hướng tiếp qua link nội bộ không prefix
    response.cookies.set("language", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return response;
  }

  if (pathname.startsWith("/blog/") && /[A-Z]/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 301);
  }

  // Bài đổi slug (URL không prefix ngôn ngữ)
  const legacy = legacyBlogPath(pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy;
    return NextResponse.redirect(url, 301);
  }

  // Chặn header x-locale giả mạo từ bên ngoài trên URL không prefix —
  // header này chỉ được phép do chính middleware đặt ở nhánh trên
  if (request.headers.has("x-locale")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("x-locale");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Chạy trên mọi trang (kể cả trang chủ) — cần thế để nhánh xóa header
   * x-locale giả mạo có hiệu lực toàn site. Loại trừ API, file tĩnh và
   * asset của Next để không tốn công vô ích.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};

/**
 * Bộ header cho khu nội bộ /baocao.
 *
 * Tách hàm vì phải gắn cho CẢ hai lối ra (chuyển hướng và đi tiếp) — quên một
 * lối là rò đúng cái trang mình đang muốn giấu.
 */
function internalHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  return response;
}
