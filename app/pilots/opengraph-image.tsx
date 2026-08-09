import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Đội phi công Mebayluon | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/pilots.jpg",
    title: "Đội phi công Mebayluon",
    subtitle: "Phi công được cấp phép, nhiều năm kinh nghiệm bay đôi",
  });
}
