// mbl-paragliding/app/admin/layout.tsx
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  // Guard tất cả route admin trừ /admin/login
  useEffect(() => {
    if (pathname?.startsWith("/admin") && pathname !== "/admin/login") {
      const token = getToken();
      if (!token) {
        router.replace("/admin/login");
        return;
      }
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return <div className="p-6">Đang kiểm tra phiên đăng nhập…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200">
        <nav className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link 
              href="/admin" 
              className="font-bold text-xl text-emerald-600 hover:text-emerald-700 transition"
            >
              MBL Admin
            </Link>
            <div className="hidden md:flex gap-6">
              <NavLink href="/admin" currentPath={pathname}>Quản Lý</NavLink>
              <NavLink href="/admin/dashboard" currentPath={pathname}>Bài Viết</NavLink>
              <NavLink href="/admin/statistics" currentPath={pathname}>Thống kê</NavLink>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children, currentPath }: { href: string; children: React.ReactNode; currentPath: string | null }) {
  const isActive = currentPath === href || (href !== "/admin" && currentPath?.startsWith(href));
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-700 hover:text-emerald-600"}`}
    >
      {children}
    </Link>
  );
}
