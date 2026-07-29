import type { Metadata } from "next";

/**
 * Trang thông báo trước chuyến bay — trang chức năng, không cần index.
 */
export const metadata: Metadata = {
  title: "Lưu Ý Trước Chuyến Bay | Mebayluon",
  description: "Những lưu ý quan trọng trước chuyến bay dù lượn cùng Mebayluon.",
  robots: { index: false, follow: true },
};

export default function PreNoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
