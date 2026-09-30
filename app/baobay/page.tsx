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
    title: "Báo bay cho phi công bay đơn — Núi Viên Nam · Khau Phạ · Quản Bạ | Mebayluon",
    description:
      "Báo bay và đóng phí điểm bay trực tuyến: 100k/ngày, 800k/tháng, 2,5tr/năm. Hội viên HNAA bay miễn phí ở Viên Nam khi báo trước 9h00.",
  },
  en: {
    title: "Flight register for solo pilots — Vien Nam Mountain · Khau Pha · Quan Ba | Mebayluon",
    description:
      "Register your flight and pay the site fee online: 100k/day, 800k/month, 2.5M/year. HNAA members fly Vien Nam free if they register before 09:00.",
  },
  fr: {
    title: "Enregistrement de vol pour pilotes solo — Mont Vien Nam · Khau Pha · Quan Ba | Mebayluon",
    description:
      "Enregistrez votre vol et réglez la taxe de site en ligne : 100k/jour, 800k/mois, 2,5M/an. Membres HNAA gratuits à Vien Nam s'ils s'enregistrent avant 9h00.",
  },
  ru: {
    title: "Регистрация полёта для самостоятельных пилотов — Вьен Нам · Кхау Фа · Куан Ба | Mebayluon",
    description:
      "Зарегистрируйте полёт и оплатите сбор за площадку онлайн: 100k/день, 800k/месяц, 2,5 млн/год. Члены HNAA летают во Вьен Нам бесплатно при регистрации до 09:00.",
  },
  zh: {
    title: "独立飞行员飞行登记 — Vien Nam 山 · 考帕 · 管坝 | Mebayluon",
    description: "在线飞行登记并缴纳场地费：10万/天、80万/月、250万/年越南盾。HNAA 会员在 09:00 前登记可免费飞 Vien Nam。",
  },
  hi: {
    title: "सोलो पायलटों के लिए उड़ान पंजीकरण — विएन नाम पर्वत · खाउ फ़ा · क्वान बा | Mebayluon",
    description:
      "ऑनलाइन उड़ान पंजीकरण करें और साइट शुल्क चुकाएँ: 100k/दिन, 800k/माह, 2.5M/वर्ष। HNAA सदस्य 09:00 से पहले पंजीकरण करके विएन नाम में निःशुल्क उड़ते हैं।",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = String(await getUrlLocale());
  const meta = META[locale] ?? META.vi;

  /**
   * Thẻ chia sẻ RIÊNG (chủ 30/09): trước đây mượn thẻ /muavang nên gửi link qua
   * Zalo lại hiện "Đăng ký Mùa Vàng 2026". Dựng bằng scripts/og-cards (thẻ
   * "baobay"): ảnh cánh dù đơn không lộ mặt + "Báo bay cho phi công bay đơn".
   */
  const card = `${SITE_URL}/og/cards/baobay.jpg`;

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
