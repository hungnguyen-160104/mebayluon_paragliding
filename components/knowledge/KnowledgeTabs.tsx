// components/knowledge/KnowledgeTabs.tsx
"use client";

import Link from "next/link";
import clsx from "clsx";
import { useLanguage } from "@/contexts/language-context";

export type KnowledgeSub =
  | "basic"
  | "advanced"
  | "thermal"
  | "xc"
  | "weather";

type TabLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const TAB_KEYS: KnowledgeSub[] = ["basic", "advanced", "thermal", "xc", "weather"];

/** Nhãn tab dịch đủ 6 ngôn ngữ (trước đây chỉ có tiếng Việt). */
const LABELS: Record<TabLang, Record<KnowledgeSub | "all", string>> = {
  vi: { all: "Tất cả", basic: "Dù lượn căn bản", advanced: "Dù lượn nâng cao", thermal: "Bay thermal", xc: "Bay XC", weather: "Khí tượng bay" },
  en: { all: "All", basic: "Basic paragliding", advanced: "Advanced paragliding", thermal: "Thermal flying", xc: "Cross-country", weather: "Aviation weather" },
  fr: { all: "Tous", basic: "Parapente débutant", advanced: "Parapente avancé", thermal: "Vol en thermique", xc: "Vol de distance", weather: "Météo de vol" },
  ru: { all: "Все", basic: "Начальный уровень", advanced: "Продвинутый уровень", thermal: "Полёт в термиках", xc: "Маршрутные полёты", weather: "Погода для полётов" },
  zh: { all: "全部", basic: "滑翔伞基础", advanced: "滑翔伞进阶", thermal: "热气流飞行", xc: "越野飞行", weather: "飞行气象" },
  hi: { all: "सभी", basic: "बेसिक पैराग्लाइडिंग", advanced: "एडवांस्ड पैराग्लाइडिंग", thermal: "थर्मल फ्लाइंग", xc: "क्रॉस-कंट्री", weather: "उड़ान मौसम" },
};

function toTabLang(v: unknown): TabLang {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase() as TabLang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code) ? code : "vi";
}

export default function KnowledgeTabs({ active }: { active?: KnowledgeSub | "all" }) {
  const { language } = useLanguage();
  const label = LABELS[toTabLang(language)];

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
      <Link
        href="/knowledge"
        className={clsx(
          "flex min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-base font-semibold text-center leading-snug transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
          active === "all"
            ? "bg-black text-white border-white/40 shadow-lg scale-105 font-extrabold"
            : "bg-white/15 text-white border-white/30 hover:bg-white/25 hover:-translate-y-0.5 hover:shadow-md"
        )}
      >
        {label.all}
      </Link>

      {TAB_KEYS.map((key) => (
        <Link
          key={key}
          href={`/knowledge/${key}`}
          className={clsx(
            "flex min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-base font-semibold text-center leading-snug transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
            active === key
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {label[key]}
        </Link>
      ))}
    </div>
  );
}
