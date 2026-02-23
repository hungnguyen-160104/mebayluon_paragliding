// app/knowledge/KnowledgeTabs.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/language-context";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

type TabKey = "all" | "can-ban" | "nang-cao" | "thermal" | "xc" | "khi-tuong";

const TABS: { key: TabKey }[] = [
  { key: "all" },
  { key: "can-ban" },
  { key: "nang-cao" },
  { key: "thermal" },
  { key: "xc" },
  { key: "khi-tuong" },
];

const TAB_LABELS: Record<Lang, Record<TabKey, string>> = {
  vi: {
    all: "Tất cả",
    "can-ban": "Dù lượn căn bản",
    "nang-cao": "Dù lượn nâng cao",
    thermal: "Bay thermal",
    xc: "Dù lượn gắn động cơ",
    "khi-tuong": "Khí tượng bay",
  },
  en: {
    all: "All",
    "can-ban": "Paragliding basics",
    "nang-cao": "Advanced paragliding",
    thermal: "Thermal flying",
    xc: "Powered paragliding",
    "khi-tuong": "Aviation weather",
  },
  fr: {
    all: "Tous",
    "can-ban": "Parapente débutant",
    "nang-cao": "Parapente avancé",
    thermal: "Vol en thermique",
    xc: "Parapente motorisé",
    "khi-tuong": "Météo de vol",
  },
  ru: {
    all: "Все",
    "can-ban": "Параплан: основы",
    "nang-cao": "Параплан: продвинутый уровень",
    thermal: "Полёт в термиках",
    xc: "Моторный параплан",
    "khi-tuong": "Погодные условия",
  },
  zh: {
    all: "全部",
    "can-ban": "滑翔伞入门",
    "nang-cao": "高级滑翔伞",
    thermal: "热气流飞行",
    xc: "动力滑翔伞",
    "khi-tuong": "飞行气象",
  },
  hi: {
    all: "सभी",
    "can-ban": "पैराग्लाइडिंग बेसिक्स",
    "nang-cao": "एडवांस्ड पैराग्लाइडिंग",
    thermal: "थर्मल फ्लाइंग",
    xc: "पावर्ड पैराग्लाइडिंग",
    "khi-tuong": "उड़ान मौसम (मौसम-विज्ञान)",
  },
};

function toLang(v: unknown): Lang {
  const s = String(v ?? "vi").toLowerCase();
  const code = s.slice(0, 2) as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code) ? code : "vi";
}

export function KnowledgeTabs({ current = "all" }: { current?: string }) {
  const { language } = useLanguage();
  const lang = toLang(language);

  const labels = useMemo(() => TAB_LABELS[lang] ?? TAB_LABELS.vi, [lang]);
  const cur = (current || "all").toLowerCase();

  return (
    <nav className="w-full flex justify-center">
      <ul
        className="
          inline-flex flex-wrap items-center justify-center gap-2
          rounded-full border border-white/20 bg-white/10 backdrop-blur-md
          px-2 py-2 shadow-lg
        "
      >
        {TABS.map((t) => {
          const href =
            t.key === "all" ? "/knowledge" : `/knowledge?sub=${encodeURIComponent(t.key)}`;
          const active = cur === t.key;

          return (
            <li key={t.key}>
              <Link
                href={href}
                className={[
                  "rounded-full text-sm transition-colors",
                  "px-3 py-1.5",
                  active
                    ? "bg-white/30 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/20",
                ].join(" ")}
              >
                {labels[t.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}