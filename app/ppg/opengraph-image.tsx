import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Bay dù lượn gắn động cơ (PPG) | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/ppg.jpg",
    title: "Bay dù lượn gắn động cơ (PPG)",
    subtitle: "Chủ động độ cao và thời lượng — chỉ có tại Khau Phạ",
  });
}
