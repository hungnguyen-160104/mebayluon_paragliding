import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Đội Phi Công Dù Lượn Chuyên Nghiệp | Mebayluon",
    description:
      "Gặp gỡ 19 phi công dù lượn chuyên nghiệp của Mebayluon — có chứng chỉ IPPI quốc tế, nhiều năm kinh nghiệm bay tại Mù Cang Chải, Sapa và khắp Việt Nam.",
    keywords: ["phi công dù lượn", "paragliding pilot vietnam", "phi công mù cang chải", "mebayluon pilot", "dù lượn đôi"],
    image: "/pilots/hero.jpg",
    url: "/pilots",
    type: "website",
    locale: await getUrlLocale(),
  });
}

export { default } from "./PilotsClient";