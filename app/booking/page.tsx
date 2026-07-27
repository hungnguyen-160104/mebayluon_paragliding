import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

/**
 * Vỏ server cho trang đặt bay.
 *
 * Trang gốc là client component nên không khai báo được metadata —
 * hậu quả là /booking dùng chung title + canonical với trang chủ và
 * tự loại mình khỏi Google. Tách vỏ server để trang sinh tiền này
 * có danh tính SEO riêng.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Đặt Tour Bay Dù Lượn — Giữ Chỗ Online | Mebayluon",
    description:
      "Đặt tour bay dù lượn online tại Mù Cang Chải, Sapa, Hà Nội, Đà Lạt và khắp Việt Nam. Chọn điểm bay, chọn gói, xác nhận trong 2 phút. Phi công chuyên nghiệp, bảo hiểm đầy đủ.",
    keywords: [
      "đặt tour bay dù lượn",
      "đặt bay dù lượn online",
      "giá bay dù lượn",
      "booking paragliding vietnam",
      "đặt chỗ dù lượn",
    ],
    url: "/booking",
    type: "website",
    locale: await getUrlLocale(),
  });
}

export { default } from "./BookingClient";
