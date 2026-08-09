// app/muavang/page.tsx
import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";

import PilotEventClient from "./PilotEventClient";

/**
 * Trang đăng ký bay dành riêng cho PHI CÔNG trong dịp Mùa Vàng 2026.
 *
 * Đặt noindex: đây là trang nghiệp vụ nội bộ cho phi công đã được mời, không
 * phải trang bán tour. Để Google index thì khách du lịch sẽ tìm thấy và điền
 * nhầm vào form đăng ký của phi công.
 */
export const metadata: Metadata = {
  title: "Đăng ký bay cho phi công — Mùa Vàng 2026 | Mebayluon",
  description:
    "Trang đăng ký bay dành cho phi công tại Khau Phạ – Tú Lệ – Mù Cang Chải, mùa vàng 2026.",
  robots: { index: false, follow: false },
};

export default function PilotRegistrationPage() {
  return (
    <div className="min-h-screen bg-[#0B0A08]">
      <Navigation />
      <PilotEventClient />
    </div>
  );
}
