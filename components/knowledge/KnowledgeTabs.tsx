// components/knowledge/KnowledgeTabs.tsx
"use client";

import Link from "next/link";
import clsx from "clsx";

export type KnowledgeSub =
  | "basic"
  | "advanced"
  | "thermal"
  | "xc"
  | "weather";

const TABS: { key: KnowledgeSub; label: string }[] = [
  { key: "basic", label: "Dù lượn căn bản" },
  { key: "advanced", label: "Dù lượn nâng cao" },
  { key: "thermal", label: "Bay thermal" },
  { key: "xc", label: "Bay XC" },
  { key: "weather", label: "Khí tượng bay" },
];

export default function KnowledgeTabs({ active }: { active?: KnowledgeSub | "all" }) {
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
        Tất cả
      </Link>

      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/knowledge/${t.key}`}
          className={clsx(
            "flex min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-base font-semibold text-center leading-snug transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
            active === t.key
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
