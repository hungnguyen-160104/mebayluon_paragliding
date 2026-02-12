"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import clsx from "clsx";

type SpotId = "sapa" | "khau-pha";

type ReviewInfo = {
  name: string;
  rating: number;      // 0..5
  reviews?: number;    // tổng số bài viết (nếu có)
  url: string;         // link Google Maps đánh giá
};

/** ====== Data cho 2 điểm ====== */
const SPOT_REVIEWS: Record<SpotId, ReviewInfo> = {
  "sapa": {
    name: "Sa Pa",
    rating: 4.9,
    reviews: 36, // theo ảnh bạn gửi; có thể sửa số này nếu muốn
    url: "https://www.google.com/maps/place/Sapa+Paragliding+-+%C4%90i%E1%BB%83m+C%E1%BA%A5t+c%C3%A1nh+D%C3%B9+L%C6%B0%E1%BB%A3n+Sapa/@22.3219262,103.8766636,918m/data=!3m1!1e3!4m8!3m7!1s0x36cd476f881a83e9:0x34a10d4a5bf8d07c!8m2!3d22.3219262!4d103.8766636!9m1!1b1!16s%2Fg%2F11x2s56ydh!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI1MTAyOS4yIKXMDSoASAFQAw%3D%3D",
  },
  "khau-pha": {
    name: "Khau Phạ",
    rating: 4.4,
    reviews: 1552, // theo ảnh bạn gửi (1.552); có thể để undefined nếu không muốn hiển thị
    url: "https://www.google.com/maps/place/%C4%90i%E1%BB%83m+Bay+D%C3%B9+L%C6%B0%E1%BB%A3n+Khau+Ph%E1%BA%A1/@21.7549587,104.2655369,922m/data=!3m1!1e3!4m8!3m7!1s0x3132d88af2212c0d:0x40d25338c1dac102!8m2!3d21.7549587!4d104.2655369!9m1!1b1!16s%2Fg%2F11fyzcp8gc!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI1MTAyOS4yIKXMDSoASAFQAw%3D%3D",
  },
};

/** ====== Tiện ích nhỏ ====== */
const formatNumber = (n: number, locale = "vi-VN") =>
  new Intl.NumberFormat(locale).format(n);

const formatRating = (r: number, locale = "vi-VN") =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(r);

/** Vẽ hàng sao với overlay fill theo phần trăm */
function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const width = `${Math.max(0, Math.min(5, rating)) * 20}%`;
  return (
    <div className="relative inline-block align-middle" aria-hidden>
      {/* hàng sao rỗng */}
      <div className="flex gap-[2px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={`e-${i}`} width={size} height={size} className="text-neutral-300" strokeWidth={1.5} />
        ))}
      </div>
      {/* lớp sao vàng bị cắt theo phần trăm điểm */}
      <div className="absolute left-0 top-0 overflow-hidden" style={{ width }}>
        <div className="flex gap-[2px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={`f-${i}`}
              width={size}
              height={size}
              className="text-yellow-400 fill-yellow-400"
              strokeWidth={1.5}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** ====== Component chính (1 badge) ======
 *  - spot: "sapa" | "khau-pha"
 *  - variant:
 *      "card"     -> thẻ thông thường (dùng trong layout)
 *      "floating" -> nổi cố định góc (bottom-right mặc định)
 *  - position: khi variant="floating", chọn góc hiển thị
 */
export function SpotGoogleReview({
  spot,
  variant = "card",
  position = "br",
  className,
}: {
  spot: SpotId;
  variant?: "card" | "floating";
  position?: "br" | "bl" | "tr" | "tl";
  className?: string;
}) {
  const data = SPOT_REVIEWS[spot];
  const posClass =
    variant !== "floating"
      ? ""
      : clsx(
          "fixed z-[9999] print:hidden",
          position === "br" && "bottom-6 right-6",
          position === "bl" && "bottom-6 left-6",
          position === "tr" && "top-6 right-6",
          position === "tl" && "top-6 left-6"
        );

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        posClass,
        "group flex items-center gap-3 px-4 py-2.5 rounded-2xl",
        "bg-white/95 text-neutral-900 border border-black/10 shadow-xl backdrop-blur",
        "hover:-translate-y-0.5 hover:shadow-2xl transition-all",
        className
      )}
      aria-label={`Xem đánh giá ${data.name} trên Google`}
      title={`Xem đánh giá ${data.name} trên Google`}
    >
      {/* Logo Google (ảnh) */}
      <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-sm overflow-hidden">
        <Image src="/logo_gg.png" alt="Google" width={24} height={24} />
      </span>

      {/* Điểm & sao */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">{formatRating(data.rating)}</span>
        <Stars rating={data.rating} />
      </div>

      {/* Số bài viết (nếu có) */}
      {typeof data.reviews === "number" && (
        <div className="flex items-center gap-1 text-sm text-neutral-700">
          <span className="mx-1 w-px h-4 bg-neutral-300" />
          <span className="font-medium">{formatNumber(data.reviews)}</span>
          <span className="font-semibold">bài viết</span>
        </div>
      )}

      <span className="ml-2 text-xs text-blue-600 underline decoration-from-font">
        Xem trên Google
      </span>
    </a>
  );
}

/** ====== Component tiện dùng để render CẢ HAI địa điểm ====== */
export function SpotGoogleReviewsRow({
  floatingFor,
  className,
}: {
  /** nếu muốn một cái nổi cố định, truyền spot vào đây */
  floatingFor?: SpotId;
  className?: string;
}) {
  return (
    <>
      {/* Row thẻ thường */}
      <div className={clsx("flex flex-wrap gap-3", className)}>
        <SpotGoogleReview spot="sapa" />
        <SpotGoogleReview spot="khau-pha" />
      </div>

      {/* Tuỳ chọn một badge nổi cố định */}
      {floatingFor && <SpotGoogleReview spot={floatingFor} variant="floating" />}
    </>
  );
}

/* ====== Cách dùng nhanh:
   1) Hiển thị 2 thẻ trong trang:
      <SpotGoogleReviewsRow />

   2) Hoặc gắn riêng từng điểm:
      <SpotGoogleReview spot="sapa" />
      <SpotGoogleReview spot="khau-pha" />

   3) Muốn badge nổi cố định (ví dụ cho Sapa):
      <SpotGoogleReview spot="sapa" variant="floating" position="br" />
*/
