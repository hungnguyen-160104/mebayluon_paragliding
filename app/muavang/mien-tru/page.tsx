import type { Metadata } from "next";

import WaiverClient from "./WaiverClient";

/**
 * Trang ký BIÊN BẢN MIỄN TRỪ TRÁCH NHIỆM tại check-in: phi công nhập mã đăng
 * ký + số điện thoại, đọc biên bản, ký tay trên màn hình rồi nhận PDF qua
 * email. Trang nghiệp vụ nội bộ sự kiện — không cho máy tìm kiếm index.
 */
export const metadata: Metadata = {
  title: "Biên bản miễn trừ trách nhiệm — Sự kiện dù lượn | Mebayluon",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <WaiverClient />;
}
