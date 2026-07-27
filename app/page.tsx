import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

/**
 * Vỏ server cho trang chủ (phần thân là client component HomeClient).
 *
 * Metadata trang chủ khai báo TẠI ĐÂY thay vì trong layout — vì
 * alternates.canonical đặt ở layout sẽ bị mọi trang con không tự khai
 * canonical "thừa hưởng" (chính là lỗi /booking, /homestay từng canonical
 * về trang chủ và bị Google bỏ qua).
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();

  return buildMetadata({
    title: "Mebayluon | Đặt Tour Bay Dù Lượn Tại Việt Nam",
    description:
      "Đặt bay dù lượn cùng Mebayluon tại Hà Nội, Sapa, Mù Cang Chải và nhiều điểm bay tại Việt Nam. Phi công chuyên nghiệp, bảo hiểm và GoPro miễn phí.",
    keywords: [
      "bay dù lượn",
      "đặt tour bay dù lượn",
      "tour bay dù lượn",
      "bay dù lượn Việt Nam",
      "bay dù lượn Hà Nội",
      "bay dù lượn Sapa",
      "bay dù lượn Mù Cang Chải",
      "dù lượn Khau Phạ",
      "paragliding Vietnam",
      "Mebayluon",
    ],
    author: "Mebayluon",
    type: "website",
    url: "/",
    locale,
  });
}

export { default } from "./HomeClient";
