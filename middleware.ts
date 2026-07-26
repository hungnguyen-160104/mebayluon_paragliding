// middleware.ts
/**
 * Chuẩn hóa URL bài viết về chữ thường bằng redirect 301 thật.
 *
 * Slug bài viết luôn được hệ thống tạo ở dạng chữ thường, nhưng các link
 * cũ (footer trước đây, bài share Facebook...) có dạng /blog/DeoKhauPha.
 * Trang blog là force-dynamic + streaming nên permanentRedirect() trong
 * component chỉ tạo soft-redirect (header đã gửi, Google không tính 301).
 * Middleware chạy trước khi render nên trả về HTTP 301 chuẩn.
 */
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (/[A-Z]/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Chỉ áp dụng cho bài viết — các route khác không bị ảnh hưởng
  matcher: ["/blog/:slug*"],
};
