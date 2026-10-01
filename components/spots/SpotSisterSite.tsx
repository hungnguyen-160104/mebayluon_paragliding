"use client";

// components/spots/SpotSisterSite.tsx
// Hà Giang có web riêng cho khách quốc tế (hagiangparamotor.com). Mebayluon
// tập trung khách Việt (chủ 01/10/2026), nên trang Hà Giang ở các bản tiếng
// nước ngoài chỉ dẫn khách sang web kia — KHÔNG đặt canonical, hai web chạy
// song song. Bản tiếng Việt không hiện khối này.

import { ExternalLink, Globe2 } from "lucide-react";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const SITE = "https://hagiangparamotor.com";

/** hagiangparamotor.com có en/fr/de/es/zh; ru và hi đọc bản tiếng Anh. */
const TARGET: Record<Exclude<Lang, "vi">, string> = {
  en: `${SITE}/en`,
  fr: `${SITE}/fr`,
  zh: `${SITE}/zh`,
  ru: `${SITE}/en`,
  hi: `${SITE}/en`,
};

const COPY: Record<Exclude<Lang, "vi">, { title: string; text: string; cta: string }> = {
  en: {
    title: "Flying in Ha Giang from abroad?",
    text: "Our Quản Bạ flying site has its own website in English, with prices, live flight status and online booking for international guests.",
    cta: "Visit hagiangparamotor.com",
  },
  fr: {
    title: "Vous venez de l'étranger ?",
    text: "Notre site de vol de Quản Bạ a son propre site en français, avec les prix, l'état des vols en direct et la réservation en ligne pour les voyageurs internationaux.",
    cta: "Voir hagiangparamotor.com",
  },
  zh: {
    title: "国际游客来河江飞行？",
    text: "我们的 Quản Bạ 飞行点有专门的中文网站，提供价格、实时飞行状态和面向国际游客的在线预订。",
    cta: "访问 hagiangparamotor.com",
  },
  ru: {
    title: "Летите в Хазянге из-за рубежа?",
    text: "У нашей площадки Quản Bạ есть отдельный сайт на английском языке: цены, статус полётов в реальном времени и онлайн-бронирование для иностранных гостей.",
    cta: "Открыть hagiangparamotor.com",
  },
  hi: {
    title: "विदेश से हा जियांग में उड़ान?",
    text: "हमारी Quản Bạ उड़ान साइट की अंग्रेज़ी में अलग वेबसाइट है, जिसमें क़ीमतें, उड़ानों की लाइव स्थिति और अंतरराष्ट्रीय मेहमानों के लिए ऑनलाइन बुकिंग है।",
    cta: "hagiangparamotor.com देखें",
  },
};

export default function SpotSisterSite({ slug, lang }: { slug?: string | null; lang: Lang }) {
  if (slug !== "ha-giang" || lang === "vi") return null;
  const c = COPY[lang];
  return (
    <section className="relative z-10 pt-8">
      <div className="container mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-2xl border border-white/20 bg-black/25 px-6 py-6 text-center shadow-lg backdrop-blur-xl md:flex-row md:text-left">
        <Globe2 size={36} className="shrink-0 text-accent" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{c.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{c.text}</p>
        </div>
        <a
          href={TARGET[lang]}
          target="_blank"
          rel="noopener"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          {c.cta} <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
