import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Kiến thức dù lượn & học bay | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/knowledge.jpg",
    title: "Kiến thức dù lượn & học bay",
    subtitle: "Từ căn bản tới bay thermal, bay XC và khí tượng",
  });
}
