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

const LOCALE_PREFIX = /^\/(en|fr|ru|zh|hi)(\/.*)?$/;

/**
 * Đường dẫn cha không có trang riêng (ví dụ /spots chỉ có /spots/[slug]).
 *
 * Bản không prefix đã được xử lý bằng redirects() trong next.config.mjs,
 * nhưng bản có prefix (/en/spots) thì không: middleware chạy TRƯỚC
 * redirects() và trả về rewrite, nên redirects() không còn cơ hội khớp.
 * Vì vậy phải tự redirect ở đây.
 */
const PARENT_PATH_REDIRECTS: Record<string, string> = {
  "/spots": "/#flying-spots",
  "/fixed": "/blog",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
