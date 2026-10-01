"use client";

// components/footer/SiteFooter.tsx
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { isInternalPath } from "@/lib/internal-paths";

/**
 * FOOTER CHUNG CHO MỌI TRANG CÔNG KHAI — render MỘT lần ở app/layout.tsx
 * (SEO 01/10/2026).
 *
 * Trước đây từng trang tự gắn <Footer />, và 326 URL quên gắn: toàn bộ
 * /blog/<bài>, /booking/*, /knowledge/<mục con>, /store/<danh mục>/…, /terms.
 * Footer mang khối thông tin pháp nhân (thông báo website TMĐT với Bộ Công
 * Thương) nên phải có ở MỌI trang công khai — gắn ở layout là hết sót.
 *
 * Khu KHÔNG có footer (giao diện nội bộ / nhúng / màn thanh toán):
 *  - /baocao, /cafe, /embed — lib/internal-paths.ts (menu + nút nổi cũng ẩn)
 *  - /admin, /baobay, /thanh-toan
 *
 * Trang mới KHÔNG tự gắn <Footer /> nữa — sẽ ra hai footer.
 */
const NO_FOOTER_PREFIXES = ["/admin", "/baobay", "/thanh-toan"] as const;

const LOCALE_PREFIX = /^\/(en|fr|ru|zh|hi)(?=\/|$)/;

export function shouldShowSiteFooter(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  // usePathname có thể trả URL có tiền tố ngôn ngữ (/en/...) — bỏ trước khi so
  const path = pathname.replace(LOCALE_PREFIX, "") || "/";
  if (isInternalPath(path)) return false;
  return !NO_FOOTER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Trang có ảnh nền CỐ ĐỊNH phủ màn hình (components/page-background: div
 * `fixed inset-0 -z-10` chứa <img>) thì footer kính mờ nằm thẳng trên ảnh đó,
 * y như khi từng trang tự gắn footer. Trang không có nền ảnh cố định (đặt bay,
 * điều khoản, danh mục cửa hàng…) thì phần dưới cùng là nền kem của <body> —
 * footer kính mờ trên nền kem bị bạc màu, nên dải footer tự lót nền tối.
 */
function hasFixedPhotoBackdrop(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0")).some(
    (el) => !!el.querySelector("img") && getComputedStyle(el).zIndex === "-10",
  );
}

/**
 * Cổng ẩn/hiện footer: chỉ quyết định CÓ hay KHÔNG theo đường dẫn. Footer do
 * app/layout.tsx truyền vào làm children.
 */
export function SiteFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Mặc định lót nền tối (an toàn khi chưa biết); có nền ảnh thì bỏ lót.
  const [photoBackdrop, setPhotoBackdrop] = useState(false);

  useEffect(() => {
    // Chờ trang mới vẽ xong nền rồi mới dò (đổi trang phía client)
    const id = window.requestAnimationFrame(() => setPhotoBackdrop(hasFixedPhotoBackdrop()));
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  if (!shouldShowSiteFooter(pathname)) return null;

  return (
    <div className={`relative z-10 pb-6 pt-8 ${photoBackdrop ? "" : "bg-slate-900"}`}>
      <div className="container mx-auto">{children}</div>
    </div>
  );
}
