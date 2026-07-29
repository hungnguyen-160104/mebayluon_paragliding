import type { Metadata } from "next";

/**
 * Trang /booking và /booking/QR là trang chức năng (form đặt chỗ) —
 * không cần index để tránh loãng chất lượng site trên Google.
 */
export const metadata: Metadata = {
  title: "Đặt Lịch Bay Dù Lượn | Mebayluon",
  description:
    "Đặt lịch bay dù lượn cùng Mebayluon tại Sapa, Mù Cang Chải, Đà Nẵng và khắp Việt Nam.",
  robots: { index: false, follow: true },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
