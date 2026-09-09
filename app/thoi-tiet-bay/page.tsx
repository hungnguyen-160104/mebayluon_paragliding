// app/thoi-tiet-bay/page.tsx
// Trang thời tiết mọi điểm bay — dự báo 5 ngày cho từng bãi cất cánh.

import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";
import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";
import { getThoiTietCopy } from "@/lib/i18n/thoi-tiet";

import WeatherPageClient from "./WeatherPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const t = getThoiTietCopy(locale);

  return buildMetadata({
    title: t.pageTitle,
    description: t.pageSubtitle,
    keywords: [
      "thời tiết bay dù lượn",
      "thời tiết Khau Phạ",
      "thời tiết Sa Pa bay dù lượn",
      "gió bay dù lượn",
      "paragliding weather Vietnam",
    ],
    url: "/thoi-tiet-bay",
    author: "Mebayluon",
    type: "website",
    locale,
  });
}

export default function WeatherPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <WeatherPageClient />
    </div>
  );
}
