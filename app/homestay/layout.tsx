import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata-builder";

/**
 * Trang /homestay là client component nên metadata đặt tại layout này.
 */
export const metadata: Metadata = buildMetadata({
  title: "Homestay & Café Bãi Hạ Cánh Dù Lượn Mù Cang Chải | Mebayluon",
  description:
    "Nghỉ tại homestay Mebayluon ngay bãi hạ cánh dù lượn Khau Phạ, Mù Cang Chải. Phòng riêng, dorm, café view ruộng bậc thang — tiện xem và đặt bay dù lượn.",
  keywords: [
    "homestay Mù Cang Chải",
    "homestay Khau Phạ",
    "homestay bãi hạ cánh dù lượn",
    "Mebayluon homestay",
  ],
  url: "/homestay",
  author: "Mebayluon",
  type: "website",
});

export default function HomestayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
