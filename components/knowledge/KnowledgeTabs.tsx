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
          "rounded-full px-4 py-2 text-sm transition",
          active === "all"
            ? "bg-white text-black"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        Tất cả
      </Link>

      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/knowledge/${t.key}`}
          className={clsx(
            "rounded-full px-4 py-2 text-sm transition",
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
