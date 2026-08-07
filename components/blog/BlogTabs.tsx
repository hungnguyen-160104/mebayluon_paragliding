"use client";

// components/blog/BlogTabs.tsx
// Thanh lọc chuyên mục ở trang /blog. Cố ý dùng lại đúng kiểu dáng thanh tab
// của trang /knowledge để hai trang danh sách bài nhìn cùng một hệ.

import Link from "next/link";
import { useMemo } from "react";

import { useLanguage } from "@/contexts/language-context";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  type BlogCategory,
} from "@/lib/blog-categories";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

function toLang(v: unknown): Lang {
  const code = String(v ?? "vi").toLowerCase().slice(0, 2) as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
}

export default function BlogTabs({
  current = "all",
  counts,
}: {
  current?: string;
  /** Số bài mỗi chuyên mục, hiện cạnh nhãn. */
  counts?: Partial<Record<BlogCategory | "all", number>>;
}) {
  const { language } = useLanguage();
  const labels = useMemo(
    () => BLOG_CATEGORY_LABELS[toLang(language)] ?? BLOG_CATEGORY_LABELS.vi,
    [language],
  );

  const cur = (current || "all").toLowerCase();
  const tabs: (BlogCategory | "all")[] = ["all", ...BLOG_CATEGORIES];

  return (
    <nav className="flex w-full justify-center px-4">
      <div className="max-w-full overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-lg backdrop-blur-md">
        <ul className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((key) => {
            const href = key === "all" ? "/blog" : `/blog?cat=${key}`;
            const isActive = cur === key;
            const count = counts?.[key];

            return (
              <li key={key} className="flex-shrink-0">
                <Link
                  href={href}
                  scroll={false}
                  className={`
                    flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40
                    ${
                      isActive
                        ? "border border-transparent bg-black font-semibold text-white shadow-sm"
                        : "border border-white/20 bg-transparent text-white/90 hover:bg-white/20 hover:text-white"
                    }
                  `}
                >
                  {labels[key]}
                  {typeof count === "number" ? (
                    <span className="opacity-60">{count}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
