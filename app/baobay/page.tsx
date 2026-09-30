// app/baobay/page.tsx
import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";
import { getUrlLocale } from "@/lib/locale";
import { SITE_URL } from "@/lib/site-config";

import BaoBayClient from "./BaoBayClient";

/**
 * BÁO BAY cho phi công bay đơn tại Viên Nam, Khau Phạ, Quản Bạ.
 *
 * Đặt noindex như /muavang: trang nghiệp vụ, link gửi tay cho phi công qua
 * Zalo. Để Google index thì khách du lịch tìm thấy và điền nhầm báo bay.
 * Chặn bằng metadata của chính trang chứ không sửa middleware.
 */
const META: Record<string, { title: string; description: string }> = {
  vi: {
    title: "Báo bay cho phi công — Viên Nam · Khau Phạ · Quản Bạ | Mebayluon",
    description: "Báo bay và đóng phí điểm bay cho phi công bay đơn tại Viên Nam, Khau Phạ và Quản Bạ.",
  },
  en: {
    title: "Pilot flight notice — Vien Nam · Khau Pha · Quan Ba | Mebayluon",
    description: "Flight notice and site fee for solo pilots at Vien Nam, Khau Pha and Quan Ba.",
  },
  fr: {
    title: "Déclaration de vol — Vien Nam · Khau Pha · Quan Ba | Mebayluon",
    description: "Déclaration de vol et taxe de site pour les pilotes solo à Vien Nam, Khau Pha et Quan Ba.",
  },
  ru: {
    title: "Заявка на полёт — Вьен Нам · Кхау Фа · Куан Ба | Mebayluon",
    description: "Заявка на полёт и сбор за площадку для самостоятельных пилотов: Вьен Нам, Кхау Фа, Куан Ба.",
  },
  zh: {
    title: "飞行报备 — Vien Nam · 考帕 · 管坝 | Mebayluon",
    description: "独立飞行员在 Vien Nam、考帕、管坝的飞行报备与场地费。",
  },
  hi: {
    title: "उड़ान सूचना — विएन नाम · खाउ फ़ा · क्वान बा | Mebayluon",
    description: "विएन नाम, खाउ फ़ा और क्वान बा में सोलो पायलटों के लिए उड़ान सूचना और साइट शुल्क।",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = String(await getUrlLocale());
  const meta = META[locale] ?? META.vi;

  /**
   * Chưa có thẻ chia sẻ riêng — mượn thẻ của trang phi công /muavang (cùng
   * đối tượng người xem) thay vì để rơi về thẻ trang chủ bán tour.
   */
  const card = `${SITE_URL}/og/cards/muavang.jpg`;

  return {
    title: meta.title,
    description: meta.description,
    robots: { index: false, follow: false },
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [{ url: card, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [card],
    },
  };
}

export default function BaoBayPage() {
  return (
    <div className="min-h-screen bg-[#0B0A08]">
      <Navigation />
      <BaoBayClient />
    </div>
  );
}
