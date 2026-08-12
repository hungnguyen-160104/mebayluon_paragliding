// app/baobay/layout.tsx
import type { Metadata } from "next";

/**
 * Khu nhập liệu nội bộ của điểm bay — chỉ tiếng Việt, không dịch sang 6 ngôn
 * ngữ như phần web dành cho khách: người dùng là phi công và quầy vé ở Khau Phạ.
 *
 * noindex ở ba lớp: metadata dưới đây, header X-Robots-Tag trong middleware.ts,
 * và dòng Disallow trong public/robots.txt.
 */
export const metadata: Metadata = {
  title: "Báo bay nội bộ | Mê Bay Lượn",
  robots: { index: false, follow: false, nocache: true },
};

export default function BaobayLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-slate-100 text-slate-900">{children}</div>;
}
