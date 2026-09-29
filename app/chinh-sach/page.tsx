// app/chinh-sach/page.tsx
/**
 * Mục lục các trang chính sách — /chinh-sach. Ai gõ tay đường dẫn cha (hoặc
 * cán bộ thẩm định hồ sơ Bộ Công Thương) thấy ngay đủ sáu chính sách.
 */
import type { Metadata } from "next";

import Link from "@/components/locale-link";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { buildMetadata } from "@/lib/metadata-builder";
import { getPolicy, POLICY_SLUGS, policyLangOf } from "@/lib/policies";

import { PolicyShell } from "./PolicyShell";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const vi = policyLangOf(locale) === "vi";
  return buildMetadata({
    title: vi ? "Chính sách & Điều khoản | Mebayluon" : "Policies & Terms | Mebayluon",
    description: vi
      ? "Điều khoản sử dụng, chính sách thanh toán, hủy – đổi lịch – hoàn tiền, cung cấp dịch vụ, bảo mật thông tin và giải quyết khiếu nại của Mebayluon Paragliding."
      : "Mebayluon Paragliding terms of use, payment, cancellation & refund, service delivery, privacy and complaints policies.",
    url: "/chinh-sach",
    author: "Mebayluon",
    type: "website",
    locale,
    availableLocales: ["vi", "en"],
  });
}

export default async function PoliciesIndexPage() {
  const lang = policyLangOf(await getRequestLang());

  return (
    <PolicyShell title={lang === "vi" ? "Chính sách & Điều khoản" : "Policies & Terms"}>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {POLICY_SLUGS.map((slug) => {
          const doc = getPolicy(slug, lang);
          return (
            <li key={slug}>
              <Link
                href={`/chinh-sach/${slug}`}
                className="block h-full rounded-2xl border border-white/15 bg-white/5 p-4 transition-colors hover:bg-white/10"
              >
                <span className="block font-semibold text-white">{doc.title}</span>
                <span className="mt-1 block text-sm text-slate-300">{doc.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PolicyShell>
  );
}
