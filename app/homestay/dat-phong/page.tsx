// app/homestay/dat-phong/page.tsx
import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

import DatPhongClient from "./DatPhongClient";

/**
 * Vỏ server cho trang ĐẶT PHÒNG homestay — khai metadata riêng để không dùng
 * chung danh tính với /homestay (bài học từ chính trang homestay: thiếu vỏ
 * server là mất index).
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const byLocale: Record<string, { title: string; description: string }> = {
    vi: {
      title: "Đặt phòng homestay Mù Cang Chải — Clubhouse Mebayluon",
      description:
        "Xem lịch phòng trống và đặt phòng trực tuyến tại Clubhouse Mebayluon — homestay dưới chân điểm bay dù lượn Khau Phạ, Mù Cang Chải.",
    },
    en: {
      title: "Book a room — Clubhouse Mebayluon Homestay, Mu Cang Chai",
      description:
        "Check live room availability and book online at Clubhouse Mebayluon — the homestay at the foot of Khau Pha paragliding site, Mu Cang Chai.",
    },
  };
  const meta = byLocale[locale] ?? byLocale.vi;

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: ["đặt phòng homestay mù cang chải", "clubhouse mebayluon", "homestay khau phạ", "book homestay mu cang chai"],
    url: "/homestay/dat-phong",
    type: "website",
    locale,
  });
}

export default function DatPhongPage() {
  return <DatPhongClient />;
}
