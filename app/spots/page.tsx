// app/spots/page.tsx
// Trang danh sách toàn bộ điểm bay dù lượn.

import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";
import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
import { getUrlLocale } from "@/lib/locale";
import { absoluteUrl } from "@/lib/site-config";
import { SPOTS_LIST } from "@/lib/spots-registry";
import SpotsListClient from "./SpotsListClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("spots", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: [
      "điểm bay dù lượn",
      "điểm bay dù lượn Việt Nam",
      "bay dù lượn ở đâu",
      "địa điểm bay dù lượn đẹp",
      "Mebayluon",
    ],
    image: "/spots/khau-pha/hero.jpg",
    url: "/spots",
    author: "Mebayluon",
    type: "website",
    locale,
  });
}

/** Chuyển JSON-LD thành chuỗi an toàn để nhúng vào HTML. */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function SpotsPage() {
  // ItemList giúp Google hiểu đây là trang danh mục điểm bay
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Các điểm bay dù lượn của Mebayluon",
    itemListElement: SPOTS_LIST.map((spot, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: spot.name,
      url: absoluteUrl(`/spots/${spot.slug}`),
    })),
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListSchema) }}
      />
      <Navigation />
      <SpotsListClient />
    </div>
  );
}
