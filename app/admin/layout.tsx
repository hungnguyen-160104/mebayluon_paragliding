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
  /**
   * MỨC QUYỀN của phiên đang mở — "owner" thấy đủ thẻ, "editor" (tài khoản
   * đăng bài) không thấy thẻ "Nhân sự báo bay".
   *
   * Hỏi thẳng máy chủ (/api/auth/me) thay vì bóc token ở trình duyệt: bóc token
   * thì ai sửa localStorage cũng tự phong mình làm chủ. Ẩn thẻ ở đây chỉ là cho
   * gọn mắt — chặn thật nằm ở requireBaobay phía máy chủ.
   */
  const [level, setLevel] = useState<"owner" | "editor" | null>(null);

  // Guard tất cả route admin trừ /admin/login
  useEffect(() => {
    let alive = true;
    const checkAuth = async () => {
      if (pathname?.startsWith("/admin") && pathname !== "/admin/login") {
        const token = getToken();
        if (!token) {
          router.replace("/admin/login");
          return;
        }
        try {
          const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) {
            router.replace("/admin/login");
            return;
          }
          const body = await res.json();
          if (alive) setLevel(body?.user?.level === "owner" ? "owner" : "editor");
        } catch {
          // Mạng chập chờn thì đừng đá người ta ra ngoài — cứ coi là mức thấp
          if (alive) setLevel("editor");
        }
      }
      if (alive) setReady(true);
    };
    checkAuth();
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  if (!ready)
    return <div className="p-6 pt-28">Đang kiểm tra phiên đăng nhập…</div>;

  return (
    /* pt-20: menu chính của website (components/navigation.tsx) là thanh
       `fixed top-0` cao h-20 và được render ở app/layout.tsx cho MỌI route,
       kể cả /admin. Trang công khai tự chừa khoảng trên, còn khu quản trị thì
       chưa nên thanh menu đè lên chữ. */
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pt-20">
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
              {/* Khu nhân sự báo bay chỉ dành cho tài khoản CHỦ — tài khoản đăng
                  bài không thấy thẻ này, và máy chủ cũng không cho vào. */}
              {level === "owner" && (
                <NavLink href="/admin/baocao" currentPath={pathname}>Nhân sự báo bay</NavLink>
              )}
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
