import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Đăng ký Mùa Vàng 2026 | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/muavang.jpg",
    title: "Đăng ký Mùa Vàng 2026",
    subtitle: "Khau Phạ · Tú Lệ · Mù Cang Chải — dành cho phi công",
    eyebrow: "SỰ KIỆN",
  });
}
