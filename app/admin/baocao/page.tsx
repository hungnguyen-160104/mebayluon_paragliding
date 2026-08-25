// app/admin/baocao/page.tsx
"use client";

import { useEffect, useState } from "react";

import { PersonnelPanel } from "@/app/baocao/components/PersonnelPanel";
import { getToken } from "@/lib/auth";

/**
 * Lối vào dành cho CHỦ WEBSITE (token quản trị mức "owner"). Nhân sự vận hành
 * dùng lối chính /baocao/admin — cùng một giao diện, khác cách xác thực.
 *
 * Tài khoản BIÊN TẬP (vào đăng bài) bị chặn ở đây, và mọi API bên dưới cũng
 * từ chối token của họ (xem middlewares/requireBaobay.ts) — nên gõ thẳng địa
 * chỉ này cũng không moi được thông tin nhân sự.
 */
export default function AdminBaobayAccountsPage() {
  /** Chưa đăng nhập thì khỏi hỏi máy chủ — chốt mức thấp ngay lúc dựng. */
  const [level, setLevel] = useState<"owner" | "editor" | "loading">(() =>
    typeof window === "undefined" || getToken() ? "loading" : "editor",
  );

  useEffect(() => {
    let alive = true;
    const token = getToken();
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (alive) setLevel(body?.user?.level === "owner" ? "owner" : "editor");
      })
      .catch(() => {
        if (alive) setLevel("editor");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (level === "loading") return <p className="text-sm text-slate-500">Đang kiểm tra quyền…</p>;

  if (level !== "owner") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-base font-bold text-amber-900">Khu này dành riêng cho tài khoản chủ</h1>
        <p className="mt-1 text-sm leading-relaxed text-amber-800">
          Tài khoản của bạn dùng để đăng bài và xem thống kê trên web. Thông tin nhân sự báo bay nằm ngoài phạm
          vi đó — cần xem thì nhờ chủ tài khoản mở giúp.
        </p>
      </div>
    );
  }

  return <PersonnelPanel />;
}
