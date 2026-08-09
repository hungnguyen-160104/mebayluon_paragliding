import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Homestay & Clubhouse Khau Phạ | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/homestay.jpg",
    title: "Homestay & Clubhouse Khau Phạ",
    subtitle: "Ngủ ngay bãi hạ cánh, cà phê ngắm ruộng bậc thang",
  });
}
