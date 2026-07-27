// lib/locale.ts
/**
 * Đọc ngôn ngữ của request phía server.
 *
 * Có HAI khái niệm tách bạch, không được trộn lẫn:
 *
 * 1. getUrlLocale() — ngôn ngữ theo URL (header x-locale do middleware
 *    đặt khi URL có prefix /en, /ru...). CHỈ dùng cho SEO (canonical,
 *    hreflang, html lang): Googlebot không mang cookie nên canonical
 *    tuyệt đối không được phụ thuộc cookie, nếu không mỗi khách một
 *    canonical khác nhau trên cùng một URL.
 *
 * 2. getRequestLang() — ngôn ngữ để render nội dung: URL có prefix thì
 *    URL thắng, không có thì theo cookie người dùng (giữ trải nghiệm
 *    đổi ngôn ngữ bằng nút chuyển như cũ).
 */
import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/site-config";

export async function getUrlLocale(): Promise<Locale> {
  const headerStore = await headers();
  const value = headerStore.get("x-locale");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getRequestLang(): Promise<Locale> {
  const urlLocale = await getUrlLocale();
  if (urlLocale !== DEFAULT_LOCALE) return urlLocale;

  const cookieStore = await cookies();
  const raw =
    cookieStore.get("language")?.value ??
    cookieStore.get("Language")?.value ??
    cookieStore.get("lang")?.value ??
    "";

  const code = raw.trim().toLowerCase().slice(0, 2);
  return isLocale(code) ? code : DEFAULT_LOCALE;
}
