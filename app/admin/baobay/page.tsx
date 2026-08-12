// app/admin/baobay/page.tsx
"use client";

import { PersonnelPanel } from "@/app/baobay/components/PersonnelPanel";

/**
 * Lối vào dành cho CHỦ WEBSITE (token quản trị). Nhân sự vận hành dùng lối
 * chính /baobay/admin — cùng một giao diện, khác cách xác thực.
 */
export default function AdminBaobayAccountsPage() {
  return <PersonnelPanel />;
}
