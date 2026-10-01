"use client";

import Link from "@/components/locale-link";
import { useLanguage } from "@/contexts/language-context";
import { KNOWLEDGE_TOPICS } from "@/lib/knowledge";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const ALL_LABEL: Record<Lang, string> = {
  vi: "Tất cả", en: "All", fr: "Tous", ru: "Все", zh: "全部", hi: "सभी",
};

function toLang(v: unknown): Lang {
  const s = String(v ?? "vi").toLowerCase();
  const code = s.slice(0, 2) as Lang;

  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
}

/**
 * Tab mục con của /knowledge (dùng ?sub=<mã DB>). Danh sách + nhãn 6 ngôn ngữ
 * ở lib/knowledge.ts. `available`: mã đang có bài — tab trống bị ẩn (tab đang
 * mở luôn hiện); không truyền thì hiện đủ.
 */
export function KnowledgeTabs({
  current = "all",
  available,
}: {
  current?: string;
  available?: string[] | null;
}) {
  const { language } = useLanguage();
  const lang = toLang(language);
  const cur = (current || "all").toLowerCase();

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: ALL_LABEL[lang] },
    ...KNOWLEDGE_TOPICS.filter(
      (t) => !available || available.includes(t.db) || t.db === cur,
    ).map((t) => ({ key: t.db as string, label: t.label[lang] })),
  ];

  return (
    <nav className="w-full flex justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 max-w-full overflow-hidden shadow-lg">
        <ul className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map((tab) => {
            const href =
              tab.key === "all"
                ? "/knowledge"
                : `/knowledge?sub=${encodeURIComponent(tab.key)}`;

            const isActive = tab.key === "all" ? cur === "all" : cur === tab.key;

            return (
              <li key={tab.key} className="flex-shrink-0">
                <Link
                  href={href}
                  scroll={false}
                  className={`
                    flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40
                    ${
                      isActive
                        ? "bg-black text-white font-semibold border border-transparent shadow-sm"
                        : "border border-white/20 text-white/90 bg-transparent hover:bg-white/20 hover:text-white"
                    }
                  `}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
