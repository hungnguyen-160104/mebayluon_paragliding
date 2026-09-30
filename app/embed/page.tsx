/**
 * HƯỚNG DẪN NHÚNG CAMERA cho web đối tác — /embed (30/09/2026). noindex.
 * Xem trước iframe, mã nhúng copy được (bản thường + WordPress), tham số lang/theme,
 * script tuỳ chọn tự co giãn chiều cao theo postMessage "mbl-camera-height".
 */
import type { Metadata } from "next";

import EmbedGuide from "@/components/embed/EmbedGuide";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Nhúng camera bãi cất Viên Nam / Embed the launch camera — Mebayluon",
  description: "Hướng dẫn nhúng miễn phí camera bãi cất cánh dù lượn Viên Nam vào website của bạn.",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  alternates: { canonical: "/baobay" },
};

export default async function EmbedGuidePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ui = sp.ui === "en" ? "en" : "vi";
  return <EmbedGuide siteUrl={SITE_URL} ui={ui} />;
}
