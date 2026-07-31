import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
import { getUrlLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("pilots", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: ["phi công dù lượn", "paragliding pilot vietnam", "phi công mù cang chải", "mebayluon pilot", "dù lượn đôi"],
    image: "/pilots/hero.jpg",
    url: "/pilots",
    type: "website",
    locale,
  });
}

export { default } from "./PilotsClient";