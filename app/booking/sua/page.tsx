import type { Metadata } from "next";
import { Suspense } from "react";

import SuaBookingClient from "./SuaBookingClient";

/**
 * /booking/sua — khách tự sửa booking bằng MÃ BOOKING + SỐ ĐIỆN THOẠI
 * (30/09/2026). Trang riêng tư của từng khách: không cho Google index.
 */
export const metadata: Metadata = {
  title: "Sửa booking | Mebayluon Paragliding",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SuaBookingClient />
    </Suspense>
  );
}
