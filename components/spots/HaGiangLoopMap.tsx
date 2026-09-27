// components/spots/HaGiangLoopMap.tsx
// Bản đồ Hà Giang Loop (SVG tĩnh + 9 điểm dừng là link) — xem lib/ha-giang-loop-map-html.ts.
import { HA_GIANG_SITE_URL } from "@/lib/ha-giang-site";
import { HA_GIANG_LOOP_MAP_HTML } from "@/lib/ha-giang-loop-map-html";

const HTML = HA_GIANG_LOOP_MAP_HTML.replaceAll("__HG__", HA_GIANG_SITE_URL);

export function HaGiangLoopMap({ className = "" }: { className?: string }) {
  return (
    <div
      className={`hg-loop overflow-hidden rounded-xl bg-[#0c1812]/85 px-7 pb-10 pt-6 sm:px-12 ${className}`}
      dangerouslySetInnerHTML={{ __html: HTML }}
    />
  );
}
