// app/muavang/page.tsx
import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";
import { getUrlLocale } from "@/lib/locale";
import { SITE_URL } from "@/lib/site-config";

import PilotEventClient from "./PilotEventClient";

/**
 * Trang đăng ký bay dành riêng cho PHI CÔNG trong dịp Mùa Vàng 2026.
 *
 * Đặt noindex: đây là trang nghiệp vụ nội bộ cho phi công đã được mời, không
 * phải trang bán tour. Để Google index thì khách du lịch sẽ tìm thấy và điền
 * nhầm vào form đăng ký của phi công.
 */
const META: Record<string, { title: string; description: string }> = {
  vi: {
    title: "Đăng ký bay cho phi công — Mùa Vàng 2026 | Mebayluon",
    description:
      "Trang đăng ký bay dành cho phi công tại Khau Phạ – Tú Lệ – Mù Cang Chải, mùa vàng 2026.",
  },
  en: {
    title: "Pilot flight registration — Golden Season 2026 | Mebayluon",
    description:
      "Flight registration for pilots at Khau Pha – Tu Le – Mu Cang Chai, golden season 2026.",
  },
  fr: {
    title: "Inscription des pilotes — Saison Dorée 2026 | Mebayluon",
    description:
      "Inscription des pilotes à Khau Pha – Tu Le – Mu Cang Chai, saison dorée 2026.",
  },
  ru: {
    title: "Регистрация пилотов — Золотой сезон 2026 | Mebayluon",
    description:
      "Регистрация пилотов на полёты в Кхау Фа – Ту Ле – Му Кang Чай, золотой сезон 2026.",
  },
  zh: {
    title: "飞行员报名 — 金色季节 2026 | Mebayluon",
    description: "考帕 – 秀丽 – 木江界飞行员报名，2026 金色季节。",
  },
  hi: {
    title: "पायलट उड़ान पंजीकरण — सुनहरा मौसम 2026 | Mebayluon",
    description:
      "खाउ फ़ा – तू ले – मु कांग चाई में पायलटों के लिए उड़ान पंजीकरण, सुनहरा मौसम 2026।",
  },
};

/**
 * Trang nghiệp vụ nội bộ cho phi công đã được mời — đặt noindex. Để Google
 * index thì khách du lịch sẽ tìm thấy và điền nhầm vào form của phi công.
 * Tiêu đề vẫn dịch theo ngôn ngữ vì đó là chữ hiện trên tab trình duyệt.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = String(await getUrlLocale());
  const meta = META[locale] ?? META.vi;

  const card = `${SITE_URL}/og/cards/muavang.jpg`;

  return {
    title: meta.title,
    description: meta.description,
    robots: { index: false, follow: false },

    /**
     * Trang này không đi qua buildMetadata (nó tự khai tiêu đề để đặt noindex)
     * nên phải chỉ thẳng thẻ chia sẻ, không thì rơi về thẻ trang chủ. Trang
     * noindex vẫn cần thẻ đẹp vì link được gửi tay cho phi công qua Zalo.
     */
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

export default function PilotRegistrationPage() {
  return (
    <div className="min-h-screen bg-[#0B0A08]">
      <Navigation />
      <PilotEventClient />
    </div>
  );
}
