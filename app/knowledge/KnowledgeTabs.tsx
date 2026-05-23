"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/language-context";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";
type TabKey = "all" | "can-ban" | "nang-cao" | "xc" | "thermal" | "khi-tuong";

const TABS: { key: TabKey }[] = [
  { key: "all" },
  { key: "can-ban" },
  { key: "nang-cao" },
  { key: "xc" },
  { key: "thermal" },
  { key: "khi-tuong" },
];

const TAB_LABELS: Record<Lang, Record<TabKey, string>> = {
  vi: {
    all: "Tất cả",
    "can-ban": "Dù lượn cơ bản",
    "nang-cao": "Dù lượn nâng cao",
    xc: "PPG/TRIKE",
    thermal: "Bay Thermal & XC",
    "khi-tuong": "Khí tượng bay",
  },
  en: {
    all: "All",
    "can-ban": "Basic course",
    "nang-cao": "Advanced course",
    xc: "Powered paragliding",
    thermal: "Thermal flying",
    "khi-tuong": "Aviation weather",
  },
  fr: {
    all: "Tous",
    "can-ban": "Cours de base",
    "nang-cao": "Cours avancé",
    xc: "Parapente motorisé",
    thermal: "Vol en thermique",
    "khi-tuong": "Météo de vol",
  },
  ru: {
    all: "Все",
    "can-ban": "Базовый курс",
    "nang-cao": "Продвинутый курс",
    xc: "Моторный параплан",
    thermal: "Полёт в термиках",
    "khi-tuong": "Погодные условия",
  },
  zh: {
    all: "全部",
    "can-ban": "基础课程",
    "nang-cao": "进阶课程",
    xc: "动力滑翔伞",
    thermal: "热气流飞行",
    "khi-tuong": "飞行气象",
  },
  hi: {
    all: "सभी",
    "can-ban": "बेसिक कोर्स",
    "nang-cao": "एडवांस्ड कोर्स",
    xc: "पावर्ड पैराग्लाइडिंग",
    thermal: "थर्मल फ्लाइंग",
    "khi-tuong": "उड़ान मौसम",
  },
};

function toLang(v: unknown): Lang {
  const s = String(v ?? "vi").toLowerCase();
  const code = s.slice(0, 2) as Lang;

  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
}

export function KnowledgeTabs({ current = "all" }: { current?: string }) {
  const { language } = useLanguage();
  const lang = toLang(language);

  const labels = useMemo(() => TAB_LABELS[lang] ?? TAB_LABELS.vi, [lang]);
  const cur = (current || "all").toLowerCase();

  return (
    <nav className="flex w-full justify-center">
      <ul className="grid grid-cols-2 gap-2 w-full max-w-sm mx-auto">
        {TABS.map((tab) => {
          const href =
            tab.key === "all"
              ? "/knowledge"
              : `/knowledge?sub=${encodeURIComponent(tab.key)}`;

          const isActive = tab.key === "all" ? cur === "all" : cur === tab.key;

          return (
            <li key={tab.key}>
              <Link
                href={href}
                scroll={false}
                className={`
                  flex w-full min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-base font-semibold text-center leading-snug transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40
                  ${
                    isActive
                      ? "bg-yellow-400 text-black border-yellow-200 shadow-[0_8px_20px_rgba(250,204,21,0.35)] scale-105 font-extrabold"
                      : "bg-white/95 text-black border-white/70 hover:bg-white hover:-translate-y-0.5 hover:shadow-md"
                  }
                `}
              >
                {labels[tab.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
