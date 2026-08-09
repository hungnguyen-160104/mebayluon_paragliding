import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Đặt tour bay dù lượn | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/booking.jpg",
    title: "Đặt tour bay dù lượn",
    subtitle: "Chọn điểm bay và ngày bay, xác nhận trong 2 phút",
  });
}
