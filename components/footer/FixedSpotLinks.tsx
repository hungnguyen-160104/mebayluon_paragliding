// /components/footer/FixedSpotLinks.tsx
import Link from "next/link";
import type { FixedKey } from "./Footer";
import { FIXED_SPOTS } from "./Footer";

export function FixedSpotLinks({
  className = "flex flex-wrap gap-2",
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      {FIXED_SPOTS.map((s) => (
        <Link
          key={s.key as FixedKey}
          href={`/fixed/${s.key}`}
          className="px-3 py-1 rounded-full text-xs border border-white/20 bg-white/10 hover:bg-white/20 transition"
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}
