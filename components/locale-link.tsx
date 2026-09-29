"use client";
// components/locale-link.tsx
/**
 * LINK NỘI BỘ GIỮ NGÔN NGỮ CỦA URL (SEO, 29/09/2026).
 *
 * Trang /en/..., /fr/... là rewrite về trang gốc, nên mọi <Link href="/spots/x">
 * viết tay đều trỏ sang bản TIẾNG VIỆT — Google đi từ bản dịch lạc sang bản Việt
 * (quét 334 trang). Link này tự gắn tiền tố khi URL đang có tiền tố.
 *
 * Ngôn ngữ lấy theo URL, KHÔNG theo cookie: khách tiếng Anh đứng trên URL không
 * tiền tố vẫn giữ link không tiền tố, khớp canonical (xem lib/locale.ts).
 * Server render lấy từ header x-locale (layout truyền vào); sau khi điều hướng
 * phía client thì đọc lại từ window.location — root layout không render lại.
 */
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { createContext, forwardRef, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";

const TIEN_TO = /^\/(en|fr|ru|zh|hi)(?=\/|$|\?|#)/;
/** Không gắn tiền tố: trang nội bộ, API, file tĩnh. */
const BO_QUA = /^\/(api|admin|baocao|baobay|_next|images)(\/|\?|#|$)|\.[a-z0-9]{2,5}(\?|#|$)/i;

const UrlLocaleContext = createContext<string>("vi");

function tienToTuUrl(path: string): string {
  return path.match(TIEN_TO)?.[1] ?? "vi";
}

export function UrlLocaleProvider({ initial, children }: { initial: string; children: ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocale] = useState(initial);
  useEffect(() => {
    setLocale(tienToTuUrl(window.location.pathname));
  }, [pathname]);
  return <UrlLocaleContext.Provider value={locale}>{children}</UrlLocaleContext.Provider>;
}

export function useUrlLocale() {
  return useContext(UrlLocaleContext);
}

/** Gắn tiền tố ngôn ngữ cho một đường dẫn nội bộ; đường dẫn khác giữ nguyên. */
export function ganTienTo(href: string, locale: string): string {
  if (locale === "vi" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (TIEN_TO.test(href) || BO_QUA.test(href)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

type Props = ComponentProps<typeof NextLink>;

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, ...rest }, ref) {
  const locale = useUrlLocale();
  const dich = typeof href === "string" ? ganTienTo(href, locale) : href;
  return <NextLink ref={ref} href={dich} {...rest} />;
});

export default Link;
