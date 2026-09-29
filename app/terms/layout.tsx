import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

/**
 * Trang /terms là client component nên metadata đặt tại layout này.
 */
/**
 * Nội dung điều khoản CHỈ có tiếng Việt — khai `availableLocales: ["vi"]` để
 * /en/terms, /fr/terms… canonical về bản Việt, noindex và KHÔNG đứng trong
 * hreflang như một bản dịch (quét SEO 29/09/2026: canonical và hreflang cãi nhau).
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Điều Khoản & Điều Kiện Bay Dù Lượn | Mebayluon",
    description:
      "Điều khoản và điều kiện dịch vụ bay dù lượn của Mebayluon: quy định an toàn, chính sách đổi/hủy lịch do thời tiết, bảo hiểm và thanh toán.",
    url: "/terms",
    author: "Mebayluon",
    type: "website",
    locale: await getUrlLocale(),
    availableLocales: ["vi"],
  });
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
