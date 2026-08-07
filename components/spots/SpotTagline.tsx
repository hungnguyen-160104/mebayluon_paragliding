"use client";

// components/spots/SpotTagline.tsx
// Dải chữ nổi bật nói thế mạnh riêng của điểm bay ("Điểm bay Dù lượn & Dù lượn
// gắn động cơ"). Hiện ở 3 chỗ nên gom thành một component để ba nơi luôn giống
// nhau: thẻ trang chủ, thẻ trang /spots và hero trang chi tiết.
//
// Nội dung chữ lấy từ t.spots.locations.<key>.tagline (đã dịch 6 ngôn ngữ) —
// điểm bay nào không khai thì không có dải này.

import { Sparkles } from "lucide-react";

/** Khoá i18n của điểm bay trong t.spots.locations, theo slug trang chi tiết. */
export const SPOT_I18N_KEY_BY_SLUG: Record<string, string> = {
  "khau-pha": "khauPha",
  "doi-bu": "doiBu",
  "vien-nam": "doiBu",
  "muong-hoa-sapa": "muongHoaSapa",
  "son-tra": "sonTra",
  "ha-giang": "vienNam",
  "tram-tau": "tramTau",
};

export function SpotTagline({
  text,
  size = "sm",
  className = "",
}: {
  text?: string;
  /** "sm" cho thẻ danh sách, "lg" cho hero trang chi tiết. */
  size?: "sm" | "lg";
  className?: string;
}) {
  if (!text) return null;

  const sizeClass =
    size === "lg"
      ? "px-5 py-2 text-base md:text-lg ring-2"
      : "px-3 py-1 text-[11px] sm:text-xs ring-1";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300
        font-extrabold uppercase tracking-wide text-stone-900
        shadow-[0_8px_28px_-6px_rgba(251,191,36,0.75)] ring-white/60
        ${sizeClass} ${className}
      `}
      style={{ textShadow: "none" }}
    >
      <Sparkles size={size === "lg" ? 18 : 13} strokeWidth={2.5} />
      {text}
    </span>
  );
}
