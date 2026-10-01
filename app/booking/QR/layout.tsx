// app/booking/QR/layout.tsx
/**
 * Metadata cho /booking/QR — trang "cảm ơn / mã QR" sau khi đặt bay
 * (SEO 01/10/2026). Trước đây trang kế thừa tiêu đề mặc định của site và
 * "index, follow": một trang cảm ơn không có gì để tìm kiếm, lại trùng tiêu đề
 * trang chủ. Trang là client component nên metadata khai ở layout này.
 */
import type { Metadata } from "next";

import { getUrlLocale } from "@/lib/locale";
import type { Locale } from "@/lib/site-config";

const TITLE: Record<Locale, string> = {
  vi: "Cảm ơn bạn đã đặt bay | Mebayluon",
  en: "Thank you for your booking | Mebayluon",
  fr: "Merci pour votre réservation | Mebayluon",
  ru: "Спасибо за бронирование | Mebayluon",
  zh: "感谢您的预订 | Mebayluon",
  hi: "बुकिंग के लिए धन्यवाद | Mebayluon",
};

const OG_LOCALE: Record<Locale, string> = {
  vi: "vi_VN",
  en: "en_US",
  fr: "fr_FR",
  ru: "ru_RU",
  zh: "zh_CN",
  hi: "hi_IN",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  return {
    title: TITLE[locale] ?? TITLE.vi,
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: { locale: OG_LOCALE[locale] ?? "vi_VN" },
  };
}

export default function BookingQrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
