import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Liên hệ Mebayluon | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/contact.jpg",
    title: "Liên hệ Mebayluon",
    subtitle: "Hotline 0964 073 555 — tư vấn bay mọi điểm bay",
  });
}
