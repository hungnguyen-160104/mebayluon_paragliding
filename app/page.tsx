import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
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
  const meta = pageMeta("home", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
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
    image: "/hinh-nen.jpg",
    url: "/",
    locale,
  });
}

export { default } from "./HomeClient";
