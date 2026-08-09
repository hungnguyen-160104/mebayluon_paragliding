import type { Metadata } from "next";

import { buildMetadata, generateLodgingSchema } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
import { getUrlLocale } from "@/lib/locale";

/**
 * Vỏ server cho trang homestay.
 *
 * Trang gốc là client component nên không khai báo được metadata —
 * hậu quả là /homestay dùng chung title + canonical với trang chủ và
 * không được Google index. Tách vỏ server để trang có danh tính riêng.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("homestay", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: [
      "homestay mù cang chải",
      "homestay khau phạ",
      "café mù cang chải",
      "combo dù lượn homestay",
      "nghỉ dưỡng mù cang chải",
    ],
    url: "/homestay",
    type: "website",
    locale,
  });
}

import HomestayClient from "./HomestayClient";

/**
 * Trang này trước đó không có JSON-LD nào. Thêm LodgingBusiness để Google
 * hiểu Clubhouse là một cơ sở lưu trú riêng, không lẫn với công ty dù lượn
 * (LocalBusiness khai ở app/layout.tsx).
 */
export default function HomestayPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateLodgingSchema()).replace(/</g, "\\u003c"),
        }}
      />
      <HomestayClient />
    </>
  );
}
