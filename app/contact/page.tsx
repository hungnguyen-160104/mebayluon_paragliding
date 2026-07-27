import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Liên Hệ Đặt Bay Dù Lượn | Mebayluon",
    description:
      "Liên hệ Mebayluon để đặt lịch bay dù lượn. Hotline: 0964073555. Bay tại Mù Cang Chải, Sapa, Đà Lạt và khắp Việt Nam.",
    keywords: ["liên hệ mebayluon", "đặt bay dù lượn", "hotline dù lượn", "paragliding contact vietnam"],
    url: "/contact",
    type: "website",
    locale: await getUrlLocale(),
  });
}

export { default } from "./ContactClient";