// app/thanh-toan/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";

import { QrClient } from "./QrClient";

/**
 * Trang mã QR chuyển khoản gửi khách. Không đăng nhập, không lưu gì — chỉ vẽ mã
 * theo tham số trên liên kết (xem QrClient).
 *
 * KHÔNG đặt ở /qr: đường dẫn đó dành cho trang chào khách quét mã QR đi đặt bay,
 * in trên tờ rơi và biển ở bãi. Đặt đè lên là mất trang đó.
 *
 * KHÔNG cho Google đánh chỉ mục: đây là trang dùng một lần cho một khoản tiền
 * cụ thể, lọt vào kết quả tìm kiếm chỉ gây hiểu nhầm.
 */
export const metadata: Metadata = {
  title: "Thanh toán MEBAYLUON",
  robots: { index: false, follow: false },
};

export default function QrPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-slate-500">Đang mở mã…</div>}>
      <QrClient />
    </Suspense>
  );
}
