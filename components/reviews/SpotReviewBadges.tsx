"use client";

// components/reviews/SpotReviewBadges.tsx
// Cụm bong bóng đánh giá nổi ở trang điểm bay: Google (điểm số + sao) và
// Tripadvisor đứng cạnh nhau.
//
// Đặt ở góc dưới BÊN TRÁI vì góc dưới bên phải đã có cột nút mạng xã hội +
// chatbot (components/floating-social.tsx) — trước đây bong bóng Google cũng
// nằm bên phải nên đè lên cột nút đó.

import { SpotGoogleReview, type SpotId } from "./SpotGoogleReview";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const TRIPADVISOR_LABEL: Record<Lang, string> = {
  vi: "Đánh giá",
  en: "Reviews",
  fr: "Avis",
  ru: "Отзывы",
  zh: "评价",
  hi: "समीक्षाएँ",
};

function safeLang(v: unknown): Lang {
  const l = String(v ?? "vi").slice(0, 2).toLowerCase() as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(l) ? l : "vi";
}

/** Mắt cú của Tripadvisor — vẽ bằng SVG để không phải nhúng ảnh logo. */
function TripadvisorMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 24"
      width={size * (40 / 24)}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="#00AF87" />
      <circle cx="28" cy="12" r="10" fill="#00AF87" />
      <circle cx="12" cy="12" r="5.5" fill="#ffffff" />
      <circle cx="28" cy="12" r="5.5" fill="#ffffff" />
      <circle cx="12" cy="12" r="2.6" fill="#00332B" />
      <circle cx="28" cy="12" r="2.6" fill="#00332B" />
    </svg>
  );
}

export function SpotReviewBadges({
  googleSpot,
  rating,
  tripadvisorUrl,
  tripadvisorRating,
  lang = "vi",
}: {
  /** null khi điểm bay chưa có hồ sơ Google riêng. */
  googleSpot?: SpotId | null;
  rating?: number;
  tripadvisorUrl?: string | null;
  /** Điểm Tripadvisor gõ tay; không có thì bong bóng chỉ hiện chữ. */
  tripadvisorRating?: number | null;
  lang?: string;
}) {
  const showGoogle = Boolean(googleSpot) && typeof rating === "number" && rating > 0;

  if (!showGoogle && !tripadvisorUrl) return null;

  const t = TRIPADVISOR_LABEL[safeLang(lang)];

  return (
    <div className="fixed bottom-6 left-4 z-[60] flex flex-col items-start gap-2 print:hidden sm:left-6 sm:flex-row sm:items-center">
      {showGoogle && (
        <SpotGoogleReview
          spot={googleSpot as SpotId}
          rating={rating as number}
          // Số lượt đánh giá do Google trả về đang không khớp thực tế nên
          // chỉ hiện điểm số; truyền null để component ẩn phần đếm.
          reviews={null}
          lang={lang}
          variant="card"
        />
      )}

      {tripadvisorUrl && (
        <a
          href={tripadvisorUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Tripadvisor — ${t}`}
          title={`Tripadvisor — ${t}`}
          className="
            group flex items-center gap-2 rounded-2xl border border-black/10
            bg-white/95 px-3.5 py-2.5 text-neutral-900 shadow-xl backdrop-blur
            transition-all hover:-translate-y-0.5 hover:shadow-2xl
          "
        >
          <TripadvisorMark size={20} />
          {typeof tripadvisorRating === "number" && tripadvisorRating > 0 ? (
            <span className="text-sm font-bold leading-none">
              {tripadvisorRating.toLocaleString(safeLang(lang) === "vi" ? "vi-VN" : "en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
          ) : (
            <span className="text-sm font-semibold leading-none">Tripadvisor</span>
          )}
          <span className="hidden text-xs text-neutral-600 sm:inline">
            {typeof tripadvisorRating === "number" && tripadvisorRating > 0 ? `Tripadvisor · ${t}` : t}
          </span>
        </a>
      )}
    </div>
  );
}
