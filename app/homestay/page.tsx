import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

/**
 * Vỏ server cho trang homestay.
 *
 * Trang gốc là client component nên không khai báo được metadata —
 * hậu quả là /homestay dùng chung title + canonical với trang chủ và
 * không được Google index. Tách vỏ server để trang có danh tính riêng.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Homestay & Café Mù Cang Chải — Nghỉ Gần Điểm Bay Khau Phạ | Mebayluon",
    description:
      "Homestay Mebayluon tại Mù Cang Chải: phòng nghỉ truyền thống, café view ruộng bậc thang, ngay gần điểm bay dù lượn đèo Khau Phạ. Combo bay dù lượn + nghỉ dưỡng tiết kiệm.",
    keywords: [
      "homestay mù cang chải",
      "homestay khau phạ",
      "café mù cang chải",
      "combo dù lượn homestay",
      "nghỉ dưỡng mù cang chải",
    ],
    url: "/homestay",
    type: "website",
    locale: await getUrlLocale(),
  });
}

export { default } from "./HomestayClient";
