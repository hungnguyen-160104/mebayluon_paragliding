/**
 * TRANG NHÚNG CAMERA (iframe) cho web đối tác — /embed/camera/vien-nam (30/09/2026).
 *
 * Không menu/nút nổi (lib/internal-paths.ts có /embed), không GA/Vercel Analytics
 * (middleware gắn x-mbl-embed → app/layout.tsx bỏ qua), không footer (layout gốc
 * không có footer; mỗi trang tự gắn). Header cho phép nhúng + noindex: next.config.mjs.
 *
 * Query: ?lang=vi|en (mặc định vi) &theme=dark|light (mặc định dark).
 * Hướng dẫn nhúng cho đối tác: /embed.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CameraEmbed, { type EmbedLang, type EmbedTheme } from "@/components/embed/CameraEmbed";
import { CAMERAS, isCamId } from "@/lib/imou/cameras";

type Props = {
  params: Promise<{ cam: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick<T extends string>(v: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const s = Array.isArray(v) ? v[0] : v;
  return (allowed as readonly string[]).includes(s ?? "") ? (s as T) : fallback;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cam } = await params;
  if (!isCamId(cam)) return { robots: { index: false, follow: true } };
  return {
    title: `${CAMERAS[cam].name.vi} — Mebayluon`,
    description: "Ảnh camera trực tiếp bãi cất cánh dù lượn Viên Nam, cập nhật mỗi phút.",
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    alternates: { canonical: "/baobay" },
  };
}

export default async function CameraEmbedPage({ params, searchParams }: Props) {
  const { cam } = await params;
  if (!isCamId(cam)) notFound();
  const sp = await searchParams;
  const lang = pick<EmbedLang>(sp.lang, ["vi", "en"], "vi");
  const theme = pick<EmbedTheme>(sp.theme, ["dark", "light"], "dark");

  return (
    <div lang={lang}>
      {/* Nền trong suốt: góc bo của khung lộ nền web đối tác, không lộ nền trắng của site */}
      <style>{"html,body{background:transparent!important}"}</style>
      <CameraEmbed cam={cam} lang={lang} theme={theme} />
    </div>
  );
}
