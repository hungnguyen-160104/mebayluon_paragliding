import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
import { getUrlLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("contact", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: ["liên hệ mebayluon", "đặt bay dù lượn", "hotline dù lượn", "paragliding contact vietnam"],
    image: "/contact.jpg",
    url: "/contact",
    type: "website",
    locale,
  });
}

export { default } from "./ContactClient";