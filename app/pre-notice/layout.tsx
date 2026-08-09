import type { Metadata } from "next";

import { getUrlLocale } from "@/lib/locale";
import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";

/**
 * Trang "Lưu ý trước khi bay" — trước đây gắn noindex vì bị xem là trang
 * chức năng. Thực tế đây là nội dung khách tìm trước chuyến bay đầu tiên
 * ("bay dù lượn mặc gì", "cần mang gì"), nên phải cho index.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("preNotice", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: [
      "lưu ý trước khi bay dù lượn",
      "bay dù lượn mặc gì",
      "chuẩn bị bay dù lượn",
      "điều kiện bay dù lượn",
      "cân nặng bay dù lượn",
    ],
    image: "/Chuan-bi-bay.jpg",
    url: "/pre-notice",
    author: "Mebayluon",
    type: "website",
    locale,
  });
}

export default function PreNoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
