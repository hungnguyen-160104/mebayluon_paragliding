// app/not-found.tsx
/**
 * Trang 404 chung (SEO 01/10/2026) — hiện khi trang gọi notFound(): bài viết,
 * điểm bay, phi công, mục kiến thức, sản phẩm… không tồn tại. HTTP 404 thật
 * (app/layout.tsx không còn bọc trang trong <Suspense>), không index.
 * Menu + footer đến từ layout; ở đây chỉ phần thân, đủ 6 ngôn ngữ.
 */
import type { Metadata } from "next";

import Link from "@/components/locale-link";
import { PageBackground } from "@/components/page-background";
import { getRequestLang } from "@/lib/locale";
import type { Locale } from "@/lib/site-config";

const TEXT: Record<Locale, { title: string; body: string; home: string; blog: string; spots: string }> = {
  vi: {
    title: "Không tìm thấy trang",
    body: "Trang bạn tìm không tồn tại hoặc đã được chuyển đi.",
    home: "Về trang chủ",
    blog: "Đọc blog",
    spots: "Các điểm bay",
  },
  en: {
    title: "Page not found",
    body: "The page you are looking for does not exist or has moved.",
    home: "Back to home",
    blog: "Read the blog",
    spots: "Flying sites",
  },
  fr: {
    title: "Page introuvable",
    body: "La page que vous cherchez n’existe pas ou a été déplacée.",
    home: "Retour à l’accueil",
    blog: "Lire le blog",
    spots: "Sites de vol",
  },
  ru: {
    title: "Страница не найдена",
    body: "Страница, которую вы ищете, не существует или была перемещена.",
    home: "На главную",
    blog: "Читать блог",
    spots: "Места полётов",
  },
  zh: {
    title: "页面未找到",
    body: "您访问的页面不存在或已被移动。",
    home: "返回首页",
    blog: "阅读博客",
    spots: "飞行点",
  },
  hi: {
    title: "पेज नहीं मिला",
    body: "आप जो पेज खोज रहे हैं वह मौजूद नहीं है या हटा दिया गया है।",
    home: "होम पेज पर जाएँ",
    blog: "ब्लॉग पढ़ें",
    spots: "उड़ान स्थल",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const t = TEXT[(await getRequestLang()) as Locale] ?? TEXT.vi;
  return {
    title: `${t.title} | Mebayluon`,
    robots: { index: false, follow: true },
  };
}

export default async function NotFound() {
  const t = TEXT[(await getRequestLang()) as Locale] ?? TEXT.vi;
  const btn =
    "rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20";

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center px-6 pt-28 pb-12 text-center text-white">
      <PageBackground src="/images/mebayluon.jpg" />
      <div className="fixed inset-0 -z-10 bg-black/50" />
      <div className="max-w-xl rounded-2xl border border-white/15 bg-black/30 p-8 backdrop-blur-lg">
        <p className="mb-2 text-5xl font-bold">404</p>
        <h1 className="mb-3 text-2xl font-bold">{t.title}</h1>
        <p className="mb-6 text-white/85">{t.body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={`${btn} bg-emerald-600/80 hover:bg-emerald-500`}>
            {t.home}
          </Link>
          <Link href="/spots" className={btn}>
            {t.spots}
          </Link>
          <Link href="/blog" className={btn}>
            {t.blog}
          </Link>
        </div>
      </div>
    </section>
  );
}
