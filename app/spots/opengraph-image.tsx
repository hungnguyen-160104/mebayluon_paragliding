import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Điểm bay dù lượn khắp Việt Nam | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/spots.jpg",
    title: "Điểm bay dù lượn khắp Việt Nam",
    subtitle: "Khau Phạ · Sapa · Hà Nội · Đà Nẵng · Hà Giang · Đà Lạt",
  });
}
