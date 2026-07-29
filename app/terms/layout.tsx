import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata-builder";

/**
 * Trang /terms là client component nên metadata đặt tại layout này.
 */
export const metadata: Metadata = buildMetadata({
  title: "Điều Khoản & Điều Kiện Bay Dù Lượn | Mebayluon",
  description:
    "Điều khoản và điều kiện dịch vụ bay dù lượn của Mebayluon: quy định an toàn, chính sách đổi/hủy lịch do thời tiết, bảo hiểm và thanh toán.",
  url: "/terms",
  author: "Mebayluon",
  type: "website",
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
