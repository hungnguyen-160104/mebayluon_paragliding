// app/webcam/[cam]/page.tsx — webcam từng bãi cất: /webcam/khau-pha, /webcam/vien-nam (bãi cất + bãi hạ cánh) (03/10/2026).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import WebcamPage from "@/components/webcam/WebcamPage";
import { isWebcamSite } from "@/lib/imou/cameras";
import { getWebcamCopy } from "@/lib/i18n/webcam";
import { getUrlLocale } from "@/lib/locale";
import { buildMetadata } from "@/lib/metadata-builder";

type Props = { params: Promise<{ cam: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cam } = await params;
  if (!isWebcamSite(cam)) return { robots: { index: false, follow: true } };
  const locale = await getUrlLocale();
  const c = getWebcamCopy(locale).cams[cam];
  return buildMetadata({
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: c.keywords,
    url: `/webcam/${cam}`,
    type: "website",
    locale,
  });
}

export default async function WebcamCamPage({ params }: Props) {
  const { cam } = await params;
  if (!isWebcamSite(cam)) notFound();
  const locale = await getUrlLocale();
  return <WebcamPage t={getWebcamCopy(locale)} cam={cam} lang={locale} />;
}
