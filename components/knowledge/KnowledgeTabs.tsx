// components/knowledge/KnowledgeTabs.tsx
"use client";

import Link from "@/components/locale-link";
import clsx from "clsx";
import { useLanguage } from "@/contexts/language-context";
import { KNOWLEDGE_TOPICS, type KnowledgeUrlKey } from "@/lib/knowledge";

/** Mã mục con trên URL /knowledge/<mã> — danh sách ở lib/knowledge.ts. */
export type KnowledgeSub = KnowledgeUrlKey;

type TabLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const ALL_LABEL: Record<TabLang, string> = {
  vi: "Tất cả", en: "All", fr: "Tous", ru: "Все", zh: "全部", hi: "सभी",
};

function toTabLang(v: unknown): TabLang {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase() as TabLang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code) ? code : "vi";
}

/**
 * `available`: mã DB (subCategory) đang có bài — tab không có bài bị ẩn.
 * Không truyền (hoặc null) thì hiện đủ tab. Tab đang mở luôn hiện.
 */
export default function KnowledgeTabs({
  active,
  available,
}: {
  active?: KnowledgeSub | "all";
  available?: string[] | null;
}) {
  const { language } = useLanguage();
  const lang = toTabLang(language);
  const topics = KNOWLEDGE_TOPICS.filter(
    (t) => !available || available.includes(t.db) || t.url === active,
  );

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
        {ALL_LABEL[lang]}
      </Link>

      {topics.map(({ url: key, label }) => (
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
          {label[lang]}
        </Link>
      ))}
    </div>
  );
}
