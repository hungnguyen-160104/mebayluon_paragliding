// app/baocao/admin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ROLE_LABEL, roleTabs, uniqueTabs } from "@/lib/baobay/roles";
import { spotName } from "@/lib/baobay/spots";

import { apiPost } from "../components/client-api";
import { PersonnelPanel } from "../components/PersonnelPanel";
import { useBaobaySession } from "../components/session";
import { ChangePasswordCard } from "../components/Shell";

/**
 * Trang QUẢN TRỊ trong khu báo bay — tài khoản vai trò "admin" đăng nhập cùng
 * cổng /baocao như mọi nhân sự khác rồi được đưa về đây.
 *
 * Không dùng Shell chung (khung đó bó ngang max-w-3xl cho form điện thoại):
 * bảng nhân sự nhiều cột, cần khổ rộng như khu quản trị website.
 */
export default function BaobayAdminPage() {
  const { user, loading } = useBaobaySession("admin");
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/baocao/logout");
    } finally {
      router.replace("/baocao");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-sky-700">
            {ROLE_LABEL[user.role]}
            {user.spots?.length ? ` · ${user.spots.map(spotName).join(" + ")}` : ""}
          </div>
          <div className="text-lg font-bold text-slate-900">{user.name}</div>
          <div className="text-xs text-slate-500">@{user.username}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đổi mật khẩu
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {loggingOut ? "Đang thoát…" : "Đăng xuất"}
          </button>
        </div>
      </header>

      {/* Quản trị KIÊM NHIỆM (vừa quản trị vừa điều phối/phi công…): lối vào các
          trang nghiệp vụ, vì trang này không dùng khung chung nên không có sẵn thanh thẻ */}
      {(user.extraRoles ?? []).length > 0 && (
        <nav className="mb-5 flex flex-wrap gap-2">
          {uniqueTabs([user.role, ...(user.extraRoles ?? [])].flatMap(roleTabs)).map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                t.href === "/baocao/admin"
                  ? "rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                  : "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Admin tự đổi mật khẩu — cùng endpoint với mọi nhân sự (/api/baocao/password);
          bản đọc được cũng cập nhật về cột "Mật khẩu" trong bảng bên dưới */}
      {showPassword && (
        <div className="mb-6 max-w-md">
          <ChangePasswordCard onDone={() => setShowPassword(false)} />
        </div>
      )}

      <PersonnelPanel />
    </div>
  );
}
