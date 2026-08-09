import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Lưu ý trước khi bay dù lượn | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/pre-notice.jpg",
    title: "Lưu ý trước khi bay dù lượn",
    subtitle: "Mặc gì, mang gì, điều kiện sức khoẻ và quy trình bay",
  });
}
