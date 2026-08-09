import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Tin tức & kinh nghiệm dù lượn | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/blog.jpg",
    title: "Tin tức & kinh nghiệm dù lượn",
    subtitle: "Điểm bay, mùa đẹp, kỹ thuật bay và chuyện nghề",
  });
}
