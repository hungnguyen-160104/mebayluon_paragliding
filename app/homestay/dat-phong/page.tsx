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
    // fr/ru/zh/hi (SEO 01/10/2026): trước đây rơi về bản tiếng Việt → 5 URL
    // trùng một tiêu đề.
    fr: {
      title: "Réserver une chambre — Clubhouse Mebayluon, Mu Cang Chai",
      description:
        "Disponibilités en direct et réservation en ligne au Clubhouse Mebayluon — homestay au pied du site de parapente de Khau Pha, Mu Cang Chai.",
    },
    ru: {
      title: "Забронировать номер — Clubhouse Mebayluon, Мукангчай",
      description:
        "Свободные номера в реальном времени и онлайн-бронирование в Clubhouse Mebayluon — гостевом доме у подножия парапланерной площадки Кхау Фа, Мукангчай.",
    },
    zh: {
      title: "预订客房 — Clubhouse Mebayluon 民宿（木江界）",
      description:
        "在线查看实时空房并预订 Clubhouse Mebayluon——位于木江界考帕滑翔伞飞行点山脚下的民宿。",
    },
    hi: {
      title: "कमरा बुक करें — Clubhouse Mebayluon होमस्टे, मू कांग चाई",
      description:
        "Clubhouse Mebayluon में कमरों की लाइव उपलब्धता देखें और ऑनलाइन बुक करें — मू कांग चाई में खाउ फ़ा पैराग्लाइडिंग स्थल की तलहटी में होमस्टे।",
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
