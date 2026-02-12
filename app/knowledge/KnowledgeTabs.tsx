// app/knowledge/KnowledgeTabs.tsx
import Link from "next/link";

export const KNOWLEDGE_TABS = [
  { key: "all",       label: "Tất cả" },
  { key: "can-ban",   label: "Dù lượn căn bản" },
  { key: "nang-cao",  label: "Dù lượn nâng cao" },
  { key: "thermal",   label: "Bay thermal" },
  { key: "xc",        label: "Dù lượn gắn động cơ" },
  { key: "khi-tuong", label: "Khí tượng bay" },
];

export function KnowledgeTabs({ current = "all" }: { current?: string }) {
  const cur = (current || "all").toLowerCase();

  return (
    <nav className="w-full flex justify-center">
      {/* Hộp tabs chỉ rộng theo nội dung -> inline-flex */}
      <ul className="
        inline-flex flex-wrap items-center justify-center gap-2
        rounded-full border border-white/20 bg-white/10 backdrop-blur-md
        px-2 py-2 shadow-lg
      ">
        {KNOWLEDGE_TABS.map(t => {
          const href = t.key === "all" ? "/knowledge" : `/knowledge?sub=${encodeURIComponent(t.key)}`;
          const active = cur === t.key;

          return (
            <li key={t.key}>
              <Link
                href={href}
                className={[
                  "rounded-full text-sm transition-colors",
                  "px-3 py-1.5", // padding nhỏ -> tổng chiều dài ngắn lại
                  active
                    ? "bg-white/30 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/20",
                ].join(" ")}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
