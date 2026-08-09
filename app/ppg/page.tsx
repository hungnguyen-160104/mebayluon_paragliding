// app/ppg/page.tsx
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import PpgClient from "./PpgClient";
import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";
import { getPpgCopy } from "@/lib/i18n/ppg";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const copy = getPpgCopy(locale);

  return buildMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: [
      "dù lượn gắn động cơ",
      "paramotor Việt Nam",
      "PPG Khau Phạ",
      "bay săn mây Mù Cang Chải",
      "powered paragliding Vietnam",
    ],
    url: "/ppg",
    type: "website",
    locale,
  });
}

export default function PpgPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <PpgClient />
    </div>
  );
}
