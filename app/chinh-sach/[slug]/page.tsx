// app/chinh-sach/[slug]/page.tsx
/**
 * Trang chính sách — mỗi chính sách một URL /chinh-sach/<slug> (danh sách ở
 * lib/policies/shared.ts). Bắt buộc để thông báo website TMĐT với Bộ Công
 * Thương; nội dung và nguồn đối chiếu: xem lib/policies/index.ts.
 *
 * Chỉ có bản tiếng Việt + tiếng Anh: `availableLocales: ["vi", "en"]` để
 * /fr, /ru, /zh, /hi hiện bản Anh, canonical về /en và không index.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { buildMetadata } from "@/lib/metadata-builder";
import {
  getPolicy,
  isPolicySlug,
  POLICY_SLUGS,
  POLICY_UPDATED_AT,
  policyLangOf,
} from "@/lib/policies";

import { PolicyShell } from "../PolicyShell";

export const dynamicParams = false;

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return {};
  const locale = await getUrlLocale();
  const doc = getPolicy(slug, policyLangOf(locale));

  return buildMetadata({
    title: `${doc.title} | Mebayluon`,
    description: doc.description,
    url: `/chinh-sach/${slug}`,
    author: "Mebayluon",
    type: "website",
    locale,
    availableLocales: ["vi", "en"],
  });
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();

  const lang = policyLangOf(await getRequestLang());
  const doc = getPolicy(slug, lang);
  const updated =
    lang === "vi"
      ? `Cập nhật lần cuối: ${POLICY_UPDATED_AT}`
      : `Last updated: ${POLICY_UPDATED_AT}`;

  return <PolicyShell title={doc.title} updatedLabel={updated} html={doc.html} />;
}
