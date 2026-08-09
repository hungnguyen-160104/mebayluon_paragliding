import { ogCard, OG_SIZE } from "@/lib/og-card";

/**
 * Thẻ xem trước khi chia sẻ link trang này. Xem chú thích ở lib/og-card.tsx.
 */
export const runtime = "nodejs";
export const alt = "Cửa hàng dù lượn Mebayluon | Mebayluon Paragliding";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    image: "og/store.jpg",
    title: "Cửa hàng dù lượn Mebayluon",
    subtitle: "Thiết bị bay, sách và khoá học — tư vấn bởi phi công",
  });
}
