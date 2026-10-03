// app/webcam/page.tsx — danh sách webcam bãi cất (03/10/2026), 6 ngôn ngữ qua tiền tố URL.
import type { Metadata } from "next";

import WebcamPage from "@/components/webcam/WebcamPage";
import { getWebcamCopy } from "@/lib/i18n/webcam";
import { getUrlLocale } from "@/lib/locale";
import { buildMetadata } from "@/lib/metadata-builder";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const t = getWebcamCopy(locale);
  return buildMetadata({
    title: t.listMetaTitle,
    description: t.listMetaDescription,
    keywords: ["webcam dù lượn", "webcam Khau Phạ", "webcam Viên Nam", "paragliding webcam Vietnam"],
    url: "/webcam",
    type: "website",
    locale,
  });
}

export default async function WebcamListPage() {
  const locale = await getUrlLocale();
  return <WebcamPage t={getWebcamCopy(locale)} lang={locale} />;
}
